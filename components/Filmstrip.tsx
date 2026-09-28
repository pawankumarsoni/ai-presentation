'use client';

import { useState } from 'react';
import { Slide } from '@/types/deck';
import { Plus, Copy, Trash2 } from 'lucide-react';

type Props = {
  slides: Slide[];
  current: string;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

export function Filmstrip({
  slides,
  current,
  onSelect,
  onReorder,
  onAdd,
  onDuplicate,
  onDelete,
}: Props) {
  const [draggedSlide, setDraggedSlide] = useState<number | null>(
    null
  );

  const [elementDropTarget, setElementDropTarget] = useState<
    string | null
  >(null);

  return (
    <aside className="filmstrip">
      <div className="film-head">
        <span>Slides</span>

        <button onClick={onAdd}>
          <Plus size={16} />
        </button>
      </div>

      <div className="slides-list">
        {slides.map((s, i) => {
          const isElementDropTarget =
            elementDropTarget === s.id;

          return (
            <div
              key={s.id}
              data-slide-drop={s.id}
              draggable
              onDragStart={() => setDraggedSlide(i)}
              onDragOver={(event) => {
                event.preventDefault();
                setElementDropTarget(s.id);
              }}
              onDragLeave={() => {
                setElementDropTarget(null);
              }}
              onDrop={(event) => {
                event.preventDefault();

                /*
                 * Element cross-slide drop is handled by
                 * Element.tsx pointer events.
                 *
                 * This native drop handler is retained so
                 * the thumbnail remains a valid drop target.
                 */
                setElementDropTarget(null);

                if (
                  draggedSlide !== null &&
                  draggedSlide !== i
                ) {
                  onReorder(draggedSlide, i);
                }

                setDraggedSlide(null);
              }}
              className={`thumb-wrap ${
                current === s.id ? 'active' : ''
              } ${
                isElementDropTarget
                  ? 'element-drop-target'
                  : ''
              }`}
              onClick={() => onSelect(s.id)}
            >
              <div className="thumb">
                <div className="thumb-title">
                  {s.title}
                </div>

                {s.elementIds.slice(0, 4).map((id) => (
                  <div
                    key={id}
                    className={`thumb-el ${
                      s.elements[id]?.type
                    }`}
                  >
                    {s.elements[id]?.type === 'text'
                      ? s.elements[
                          id
                        ].payload.richText?.text?.slice(
                          0,
                          45
                        )
                      : s.elements[id]?.type}
                  </div>
                ))}
              </div>

              <div className="thumb-actions">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onDuplicate(s.id);
                  }}
                >
                  <Copy size={12} />
                </button>

                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(s.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="drop-hint">
        Drag a chart, table, text or other element onto
        another slide thumbnail to move it.
      </div>
    </aside>
  );
}
