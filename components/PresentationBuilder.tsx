'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDeckStore } from '@/lib/store';
import { Canvas } from './Canvas';
import { Filmstrip } from './Filmstrip';
import { Chat } from './Chat';
import { Inspector } from './Inspector';
import { SlidePreview } from './SlidePreview';
import {
  DeckElement,
  makeChart,
  makeImage,
  makeShape,
  makeTable,
  makeText,
} from '@/types/deck';
import { Undo2, Redo2, Download, Type, ImageIcon, BarChart3, Table2, Square } from 'lucide-react';

function isGeneratePrompt(prompt: string, userTurns: number) {
  if (userTurns === 0) return true;
  return (
    /\b(create|generate|make|build)\b[\s\S]{0,50}\b(deck|presentation)\b/i.test(prompt) ||
    /\b(new|fresh)\s+(deck|presentation)\b/i.test(prompt)
  );
}

async function readSse(
  res: Response,
  onEvent: (data: any) => void,
) {
  if (!res.body) {
    const json = await res.json();
    onEvent({ type: json.error ? 'error' : 'done', ...json });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  const consume = (part: string) => {
    const line = part.split('\n').find((l) => l.startsWith('data: '));
    if (!line) return;
    try {
      onEvent(JSON.parse(line.slice(6)));
    } catch {
      // Ignore malformed SSE frames.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop() || '';

    for (const part of parts) consume(part);
  }

  buf += decoder.decode();
  if (buf.trim()) consume(buf);
}

export function PresentationBuilder() {
  const s = useDeckStore();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const slide =
    s.deck.slides.find((x) => x.id === s.currentSlideId) || s.deck.slides[0];

  useEffect(() => {
    if (!s.currentSlideId && slide) s.setCurrentSlide(slide.id);
  }, [s.currentSlideId, slide, s.setCurrentSlide]);

  const selected = useMemo(
    () =>
      slide?.elementIds
        .map((id) => slide.elements[id])
        .filter((e) => e && s.selectedElementIds.includes(e.id)) || [],
    [slide, s.selectedElementIds],
  );

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        if (ev.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'd' && slide) {
        ev.preventDefault();
        s.duplicateElements(slide.id, s.selectedElementIds);
        return;
      }
      if (typing) return;
      if ((ev.key === 'Delete' || ev.key === 'Backspace') && slide && s.selectedElementIds.length) {
        ev.preventDefault();
        s.deleteElements(slide.id, s.selectedElementIds);
      }
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        const i = s.deck.slides.findIndex((x) => x.id === slide?.id);
        const next = ev.key === 'ArrowRight' ? i + 1 : i - 1;
        if (s.deck.slides[next]) s.setCurrentSlide(s.deck.slides[next].id);
      }
      if (ev.key === ']' && slide && s.selectedElementIds[0]) s.bringForward(slide.id, s.selectedElementIds[0]);
      if (ev.key === '[' && slide && s.selectedElementIds[0]) s.sendBackward(slide.id, s.selectedElementIds[0]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s, slide]);

  const ai = async (prompt: string) => {
    setBusy(true);
  
    s.addChat({
      role: 'user',
      text: prompt,
    });
  
    try {
      const currentDeck = useDeckStore.getState().deck;
  
      const hasContent = currentDeck.slides.some(
        (slide) => slide.elementIds.length > 0,
      );
  
      const mode = hasContent ? 'edit' : 'generate';
  
      const r = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deck: currentDeck,
          prompt,
          mode,
        }),
      });
  
      if (!r.ok) {
        let message = `AI request failed (${r.status})`;
  
        try {
          const errorData = await r.json();
          message = errorData.error || message;
        } catch {
          // Ignore JSON parse failure
        }
  
        throw new Error(message);
      }
  
      let latestDeck = currentDeck;
      let finalMessage = 'Updated the deck.';
  
      await readSse(r, (payload) => {
        // Every tool event contains the latest canonical deck.
        if (payload.deck) {
          latestDeck = payload.deck;
        }
  
        // Final event contains the final canonical deck.
        if (payload.type === 'done') {
          if (payload.deck) {
            latestDeck = payload.deck;
          }
  
          if (payload.message) {
            finalMessage = payload.message;
          }
        }
  
        if (payload.type === 'error') {
          throw new Error(payload.error || 'AI request failed');
        }
      });
  
      // IMPORTANT:
      // Replace the frontend deck with the canonical backend deck.
      if (latestDeck) {
        s.loadDeck(latestDeck, {
          recordHistory: true,
        });
      }
  
      s.addChat({
        role: 'assistant',
        text: finalMessage,
      });
    } catch (e: any) {
      s.addChat({
        role: 'assistant',
        text: `AI error: ${e?.message || 'Unknown error'}`,
      });
    } finally {
      setBusy(false);
    }
  };

  const patch = (e: DeckElement, p: Partial<DeckElement>) =>
    s.updateElement(slide.id, e.id, p);

  const addText = () =>
    s.addElement(slide.id, makeText('Double-click to edit', 180, 180, 520, 120, slide.elementIds.length + 1));

  const addChart = () =>
    s.addElement(
      slide.id,
      makeChart(
        {
          type: 'bar',
          title: 'New chart',
          categories: ['Q1', 'Q2', 'Q3', 'Q4'],
          series: [{ name: 'Value', data: [12, 18, 24, 30] }],
        },
        850,
        220,
        620,
        430,
        slide.elementIds.length + 1,
      ),
    );

  const addTable = () =>
    s.addElement(
      slide.id,
      makeTable(
        {
          headers: ['Item', 'Owner', 'Status'],
          rows: [
            ['New item', 'Team', 'Draft'],
            ['Another', 'Team', 'Planned'],
          ],
        },
        160,
        280,
        900,
        280,
        slide.elementIds.length + 1,
      ),
    );

  const addShape = () => s.addElement(slide.id, makeShape('#eceaff', 240, 500, 360, 180, slide.elementIds.length + 1));

  const addImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      s.addElement(
        slide.id,
        makeImage(String(reader.result), 200, 160, 720, 400, slide.elementIds.length + 1),
      );
    };
    reader.readAsDataURL(file);
  };

  if (!slide) {
    return (
      <div className="empty-deck">
        <h2>No slides yet</h2>
        <button onClick={() => s.addSlide()}>Add a blank slide</button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">D</div>
          <div>
            <b>Decksmith</b>
            <span>AI presentation builder</span>
          </div>
        </div>

        <div className="deck-title">{s.deck.title}</div>

        <div className="top-actions">
          <button onClick={s.undo} disabled={!s.history.length} title="Undo">
            <Undo2 size={16} />
          </button>
          <button onClick={s.redo} disabled={!s.future.length} title="Redo">
            <Redo2 size={16} />
          </button>
          <button onClick={addText} title="Text">
            <Type size={16} />
          </button>
          <button onClick={() => fileRef.current?.click()} title="Image">
            <ImageIcon size={16} />
          </button>
          <button onClick={addChart} title="Chart">
            <BarChart3 size={16} />
          </button>
          <button onClick={addTable} title="Table">
            <Table2 size={16} />
          </button>
          <button onClick={addShape} title="Shape">
            <Square size={16} />
          </button>
          <button onClick={() => window.print()} title="Print / PDF">
            <Download size={16} /> Export
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addImageFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      <div className="body">
        <Filmstrip
          slides={s.deck.slides}
          current={slide?.id || ''}
          onSelect={s.setCurrentSlide}
          onReorder={s.reorderSlides}
          onAdd={() => s.addSlide()}
          onDuplicate={s.duplicateSlide}
          onDelete={s.deleteSlide}
        />

        <Canvas
          slide={slide}
          selected={s.selectedElementIds}
          onSelectIds={s.select}
          onMoveGroup={(patches, silent) =>
            s.updateElements(
              slide.id,
              patches.map((p) => ({ id: p.id, patch: { x: p.x, y: p.y } })),
              { recordHistory: !silent },
            )
          }
          onResize={(id, w, h, silent) => s.updateElement(slide.id, id, { width: w, height: h }, { recordHistory: !silent })}
          onDelete={(ids) => s.deleteElements(slide.id, ids)}
          onDuplicate={(ids) => s.duplicateElements(slide.id, ids)}
          onBringForward={(id) => s.bringForward(slide.id, id)}
          onSendBackward={(id) => s.sendBackward(slide.id, id)}
          onEditText={(id, t) =>
            s.updateElement(slide.id, id, {
              payload: {
                ...slide.elements[id].payload,
                richText: { ...slide.elements[id].payload.richText, text: t },
              },
            })
          }
          onEditTableCell={(id, row, col, value) => {
            const table = slide.elements[id]?.payload.table;
            if (!table) return;
            const rows = table.rows.map((r, i) => (i === row ? r.map((c, j) => (j === col ? value : c)) : r));
            s.updateElement(slide.id, id, { payload: { ...slide.elements[id].payload, table: { ...table, rows } } });
          }}
          onCrossSlide={(id, sid, x, y, copy) => s.moveElement(slide.id, sid, id, x, y, { copy })}
          onAddText={addText}
          beginGesture={s.beginGesture}
          endGesture={s.endGesture}
          cancelGesture={s.cancelGesture}
        />

        <Inspector e={selected[0]} onPatch={(p) => selected[0] && patch(selected[0], p)} />

        <Chat messages={s.chat} onSend={ai} busy={busy} />
      </div>

      <div className="print-deck">
        {s.deck.slides.map((sl) => (
          <SlidePreview key={sl.id} slide={sl} />
        ))}
      </div>
    </div>
  );
}
