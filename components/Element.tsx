'use client';

import { DeckElement, Slide, W, H } from '@/types/deck';
import { ChartView } from './ChartView';
import { BringToFront, SendToBack, Trash2, Copy } from 'lucide-react';

type Props = {
  e: DeckElement;
  slide: Slide;
  selected: boolean;
  editing: boolean;
  onSelect: (e: DeckElement, add: boolean) => void;
  onDragStart: (e: DeckElement, ev: React.PointerEvent) => void;
  onResizeStart: (e: DeckElement, ev: React.PointerEvent) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onEditText: (id: string, t: string) => void;
  onEditTableCell: (id: string, row: number, col: number, value: string) => void;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
};

export function Element({
  e,
  selected,
  editing,
  onSelect,
  onDragStart,
  onResizeStart,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onEditText,
  onEditTableCell,
  onStartEdit,
  onEndEdit,
}: Props) {
  const style = {
    left: `${(e.x / W) * 100}%`,
    top: `${(e.y / H) * 100}%`,
    width: `${(e.width / W) * 100}%`,
    height: `${(e.height / H) * 100}%`,
    zIndex: e.zIndex,
    transform: `rotate(${e.rotation || 0}deg)`,
  };

  return (
    <div
      className={`element ${selected ? 'selected' : ''} ${e.locked ? 'locked' : ''}`}
      style={style}
      onPointerDown={(ev) => {
        if (editing) return;
        ev.stopPropagation();
        onSelect(e, ev.shiftKey);
        onDragStart(e, ev);
      }}
      onDoubleClick={(ev) => {
        ev.stopPropagation();
        if (e.type === 'text') onStartEdit(e.id);
      }}
    >
      {e.type === 'text' && (
        <div
          className="text-el"
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(ev) => {
            onEditText(e.id, ev.currentTarget.innerText);
            onEndEdit();
          }}
          onKeyDown={(ev) => {
            if (ev.key === 'Escape') {
              ev.preventDefault();
              ev.currentTarget.blur();
            }
          }}
        >
          {e.payload.richText?.text}
        </div>
      )}

      {e.type === 'image' && (
        <img
          src={
            e.payload.src ||
            'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=80'
          }
          alt={e.payload.alt || ''}
        />
      )}

      {e.type === 'chart' && (
        <>
          <div className="chart-title">{e.payload.chart?.title}</div>
          {e.payload.chart && <ChartView spec={e.payload.chart} />}
        </>
      )}

      {e.type === 'table' && (
        <table>
          <thead>
            <tr>
              {e.payload.table?.headers.map((h, i) => (
                <th key={`${h}-${i}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {e.payload.table?.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={`${i}-${j}`}>
                    <input
                      value={c}
                      onPointerDown={(ev) => ev.stopPropagation()}
                      onChange={(ev) => onEditTableCell(e.id, i, j, ev.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {e.type === 'shape' && (
        <div
          className="shape"
          style={{ background: e.payload.fill || '#e9e7ff', borderRadius: e.payload.radius || 18 }}
        />
      )}

      {selected && !editing && (
        <>
          <div className="el-tools">
            <button onPointerDown={(ev) => ev.stopPropagation()} onClick={() => onDuplicate(e.id)} title="Duplicate">
              <Copy size={12} />
            </button>
            <button onPointerDown={(ev) => ev.stopPropagation()} onClick={() => onBringForward(e.id)} title="Bring forward">
              <BringToFront size={12} />
            </button>
            <button onPointerDown={(ev) => ev.stopPropagation()} onClick={() => onSendBackward(e.id)} title="Send backward">
              <SendToBack size={12} />
            </button>
            <button onPointerDown={(ev) => ev.stopPropagation()} onClick={() => onDelete(e.id)} title="Delete">
              <Trash2 size={12} />
            </button>
          </div>
          <div
            className="resize-handle"
            onPointerDown={(ev) => {
              ev.stopPropagation();
              onResizeStart(e, ev);
            }}
          />
        </>
      )}
    </div>
  );
}
