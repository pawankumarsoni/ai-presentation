'use client';

import { useState } from 'react';
import { Slide } from '@/types/deck';
import { Plus, Copy, Trash2 } from 'lucide-react';

export function Filmstrip({
  slides,
  current,
  onSelect,
  onReorder,
  onAdd,
  onAddAfter,
  onDuplicate,
  onDelete,
  onRename,
}: {
  slides: Slide[];
  current: string;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onAdd: () => void;
  onAddAfter: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<{ index: number; before: boolean } | null>(null);

  return (
    <aside className="filmstrip">
      <div className="film-head">
        <span>Slides</span>
        <div>
          <button onClick={onAddAfter} title="Add after current">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="slides-list">
        {slides.map((s, i) => (
          <div
            key={s.id}
            data-slide-drop={s.id}
            draggable
            onDragStart={(e) => {
              setDrag(i);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setOver({ index: i, before: e.clientY < rect.top + rect.height / 2 });
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (drag !== null && drag !== i) {
                const before = over?.index === i ? over.before : true;
                let to = before ? i : i + 1;
                if (drag < to) to -= 1;
                onReorder(drag, to);
              }
              setDrag(null);
              setOver(null);
            }}
            onDragEnd={() => {
              setDrag(null);
              setOver(null);
            }}
            className={`thumb-wrap ${current === s.id ? 'active' : ''} ${drag === i ? 'dragging' : ''}`}
            onClick={() => onSelect(s.id)}
          >
            {over?.index === i && over.before && <div className="insert-line" />}
            <div className="thumb">
              <input
                className="thumb-title-input"
                value={s.title}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onRename(s.id, e.target.value)}
              />
              {s.elementIds.slice(0, 4).map((id) => (
                <div key={id} className={`thumb-el ${s.elements[id]?.type}`}>
                  {s.elements[id]?.type === 'text'
                    ? s.elements[id].payload.richText?.text?.slice(0, 45)
                    : s.elements[id]?.type}
                </div>
              ))}
            </div>
            {over?.index === i && !over.before && <div className="insert-line" />}

            <div className="thumb-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(s.id);
                }}
              >
                <Copy size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="add-end" onClick={onAdd}>
        Add slide at end
      </button>
      <div className="drop-hint">
        Drag thumbnails to reorder. Drop a canvas element here to move it (hold Alt to copy).
      </div>
    </aside>
  );
}
