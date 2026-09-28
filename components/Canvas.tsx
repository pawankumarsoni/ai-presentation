'use client';

import { useEffect, useRef, useState } from 'react';
import { Slide, DeckElement, W, H } from '@/types/deck';
import { Element } from './Element';
import { Guide, snapAndGuides } from '@/lib/geometry';
import { clampBox } from '@/lib/geometry';

type Marquee = { x: number; y: number; w: number; h: number };

export function Canvas({
  slide,
  selected,
  onSelectIds,
  onMoveGroup,
  onResize,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onEditText,
  onEditTableCell,
  onCrossSlide,
  onAddText,
  beginGesture,
  endGesture,
  cancelGesture,
}: {
  slide: Slide;
  selected: string[];
  onSelectIds: (ids: string[], add?: boolean) => void;
  onMoveGroup: (patches: Array<{ id: string; x: number; y: number }>, silent: boolean) => void;
  onResize: (id: string, w: number, h: number, silent: boolean) => void;
  onDelete: (ids: string[]) => void;
  onDuplicate: (ids: string[]) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onEditText: (id: string, t: string) => void;
  onEditTableCell: (id: string, row: number, col: number, value: string) => void;
  onCrossSlide: (id: string, sid: string, x: number, y: number, copy: boolean) => void;
  onAddText: () => void;
  beginGesture: () => void;
  endGesture: () => void;
  cancelGesture: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<any>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [hoverSlide, setHoverSlide] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const marqueeRef = useRef<Marquee | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dropCopy, setDropCopy] = useState(false);

  const artboardPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, scale: 1 };
    const r = canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * W,
      y: ((clientY - r.top) / r.height) * H,
      scale: r.width / W,
    };
  };

  useEffect(() => {
    const move = (ev: PointerEvent) => {
      if (drag.current?.type === 'move') {
        const { scale } = artboardPoint(ev.clientX, ev.clientY);
        const rawDx = (ev.clientX - drag.current.sx) / scale;
        const rawDy = (ev.clientY - drag.current.sy) / scale;
        if (!drag.current.started) {
          if (Math.hypot(rawDx, rawDy) < 3) return;
          drag.current.started = true;
          beginGesture();
        }
        const moving = drag.current.ids.map((id: string) => {
          const origin = drag.current.origins[id];
          const el = slide.elements[id];
          return { id, x: origin.x + rawDx, y: origin.y + rawDy, width: el.width, height: el.height };
        });
        const others = slide.elementIds
          .filter((id) => !drag.current.ids.includes(id))
          .map((id) => slide.elements[id])
          .filter(Boolean);
        const snapped = snapAndGuides(moving, others);
        setGuides(snapped.guides);
        setDropCopy(ev.altKey);
        onMoveGroup(
          moving.map((m) => {
            const box = clampBox(m.x + snapped.dx, m.y + snapped.dy, m.width, m.height);
            return { id: m.id, x: box.x, y: box.y };
          }),
          true,
        );

        const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-slide-drop]') as HTMLElement | null;
        const hid = target?.dataset.slideDrop || null;
        setHoverSlide(hid && hid !== slide.id ? hid : null);
        document.querySelectorAll('[data-slide-drop]').forEach((n) => n.classList.toggle('drop-target', n === target && hid !== slide.id));
      }

      if (drag.current?.type === 'resize') {
        const { scale } = artboardPoint(ev.clientX, ev.clientY);
        if (!drag.current.started) {
          drag.current.started = true;
          beginGesture();
        }
        const w = drag.current.w + (ev.clientX - drag.current.sx) / scale;
        const h = drag.current.h + (ev.clientY - drag.current.sy) / scale;
        const box = clampBox(drag.current.x, drag.current.y, w, h);
        onResize(drag.current.id, box.width, box.height, true);
      }

      if (drag.current?.type === 'marquee') {
        const p = artboardPoint(ev.clientX, ev.clientY);
        const box = {
          x: Math.min(drag.current.ax, p.x),
          y: Math.min(drag.current.ay, p.y),
          w: Math.abs(p.x - drag.current.ax),
          h: Math.abs(p.y - drag.current.ay),
        };
        marqueeRef.current = box;
        setMarquee(box);
      }
    };

    const up = (ev: PointerEvent) => {
      if (drag.current?.type === 'move') {
        const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-slide-drop]') as HTMLElement | null;
        const dest = target?.dataset.slideDrop;
        if (drag.current.started && dest && dest !== slide.id) {
          const ids = [...drag.current.ids];
          if (ev.altKey) {
            cancelGesture();
            beginGesture();
            for (const id of ids) onCrossSlide(id, dest, 120, 120, true);
            endGesture();
          } else {
            for (const id of ids) onCrossSlide(id, dest, 120, 120, false);
            endGesture();
          }
        } else if (drag.current.started) {
          endGesture();
        }
        setGuides([]);
        setHoverSlide(null);
        setDropCopy(false);
        document.querySelectorAll('[data-slide-drop]').forEach((n) => n.classList.remove('drop-target'));
      }
      if (drag.current?.type === 'resize' && drag.current.started) endGesture();
      const box = marqueeRef.current;
      if (drag.current?.type === 'marquee' && box) {
        const hits = slide.elementIds.filter((id) => {
          const el = slide.elements[id];
          return (
            el &&
            el.x < box.x + box.w &&
            el.x + el.width > box.x &&
            el.y < box.y + box.h &&
            el.y + el.height > box.y
          );
        });
        onSelectIds(hits);
        marqueeRef.current = null;
        setMarquee(null);
      }
      drag.current = null;
    };

    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && drag.current) {
        if (drag.current.started) cancelGesture();
        drag.current = null;
        setGuides([]);
        setMarquee(null);
        setHoverSlide(null);
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', key);
    };
  }, [slide, marquee, beginGesture, endGesture, cancelGesture, onMoveGroup, onResize, onCrossSlide, onSelectIds]);

  return (
    <main className="stage">
      <div className="canvas-toolbar">
        <span>{slide.title}</span>
        <button onClick={onAddText}>+ Text</button>
      </div>

      <div className="canvas-shell">
        <div
          ref={canvasRef}
          data-canvas
          className="canvas"
          style={{ background: slide.background }}
          onPointerDown={(ev) => {
            if (ev.target !== canvasRef.current) return;
            setEditingId(null);
            onSelectIds([]);
            const p = artboardPoint(ev.clientX, ev.clientY);
            drag.current = { type: 'marquee', ax: p.x, ay: p.y };
          }}
        >
          {slide.elementIds.map((id) => {
            const el = slide.elements[id];
            if (!el) return null;
            return (
              <Element
                key={id}
                e={el}
                slide={slide}
                selected={selected.includes(id)}
                editing={editingId === id}
                onSelect={(item, add) => {
                  if (add) onSelectIds([item.id], true);
                  else if (!selected.includes(item.id)) onSelectIds([item.id]);
                }}
                onDragStart={(item, ev) => {
                  const ids = ev.shiftKey
                    ? [...new Set([...selected, item.id])]
                    : selected.includes(item.id)
                      ? selected
                      : [item.id];
                  const origins: Record<string, { x: number; y: number }> = {};
                  ids.forEach((id) => {
                    const n = slide.elements[id];
                    if (n) origins[id] = { x: n.x, y: n.y };
                  });
                  drag.current = {
                    type: 'move',
                    ids,
                    origins,
                    sx: ev.clientX,
                    sy: ev.clientY,
                    started: false,
                  };
                }}
                onResizeStart={(item, ev) => {
                  drag.current = {
                    type: 'resize',
                    id: item.id,
                    sx: ev.clientX,
                    sy: ev.clientY,
                    w: item.width,
                    h: item.height,
                    x: item.x,
                    y: item.y,
                    started: false,
                  };
                }}
                onDelete={(id) => onDelete([id])}
                onDuplicate={(id) => onDuplicate([id])}
                onBringForward={onBringForward}
                onSendBackward={onSendBackward}
                onEditText={onEditText}
                onEditTableCell={onEditTableCell}
                onStartEdit={setEditingId}
                onEndEdit={() => setEditingId(null)}
              />
            );
          })}

          {guides.map((g, i) => (
            <div
              key={`${g.axis}-${i}`}
              className={`guide ${g.axis}`}
              style={g.axis === 'x' ? { left: `${(g.pos / W) * 100}%` } : { top: `${(g.pos / H) * 100}%` }}
            />
          ))}

          {marquee && (
            <div
              className="marquee"
              style={{
                left: `${(marquee.x / W) * 100}%`,
                top: `${(marquee.y / H) * 100}%`,
                width: `${(marquee.w / W) * 100}%`,
                height: `${(marquee.h / H) * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      <div className="canvas-status">
        1600 × 900 · 16:9 · {slide.elementIds.length} elements
        {hoverSlide ? (dropCopy ? ' · copying to another slide' : ' · moving to another slide') : ' · drag onto a thumbnail to move · hold Alt to copy · Esc cancels'}
      </div>
    </main>
  );
}
