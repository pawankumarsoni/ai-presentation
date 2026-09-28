'use client';

import { useRef } from 'react';
import { DeckElement, Slide, W, H } from '@/types/deck';
import { ChartView } from './ChartView';
import { Trash2 } from 'lucide-react';

type Props = {
  e: DeckElement;
  slide: Slide;
  selected: boolean;
  editing: boolean;

  onSelect: (e: DeckElement, add: boolean) => void;

  onDragStart: (
    item: DeckElement,
    ev: React.PointerEvent<HTMLDivElement>
  ) => void;

  onResizeStart: (
    item: DeckElement,
    ev: React.PointerEvent<HTMLDivElement>
  ) => void;

  onDelete: (id: string) => void;

  onDuplicate: (id: string) => void;

  onBringForward: (id: string) => void;

  onSendBackward: (id: string) => void;

  onEditText: (id: string, text: string) => void;

  onEditTableCell: (
    id: string,
    row: number,
    column: number,
    text: string
  ) => void;

  onStartEdit: (id: string) => void;

  onEndEdit: () => void;
};

export function Element({
  e,
  slide,
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
  const ref = useRef<HTMLDivElement>(null);

  const handlePointerDown = (
    ev: React.PointerEvent<HTMLDivElement>
  ) => {
    if (e.locked) return;

    ev.stopPropagation();

    onSelect(e, ev.shiftKey);

    onDragStart(e, ev);
  };

  const handleDoubleClick = () => {
    if (e.locked) return;

    if (e.type === 'text') {
      onStartEdit(e.id);
    }
  };

  const handleTextBlur = (
    ev: React.FocusEvent<HTMLDivElement>
  ) => {
    const text = ev.currentTarget.innerText;

    onEditText(e.id, text);
    onEndEdit();
  };

  const handleTableCellDoubleClick = (
    row: number,
    column: number
  ) => {
    if (e.locked) return;

    const currentValue =
      e.payload.table?.rows?.[row]?.[column] ?? '';

    const value = window.prompt(
      'Edit table cell',
      currentValue
    );

    if (value !== null) {
      onEditTableCell(
        e.id,
        row,
        column,
        value
      );
    }
  };

  const style: React.CSSProperties = {
    left: `${(e.x / W) * 100}%`,
    top: `${(e.y / H) * 100}%`,
    width: `${(e.width / W) * 100}%`,
    height: `${(e.height / H) * 100}%`,
    zIndex: e.zIndex,
    transform: `rotate(${e.rotation || 0}deg)`,
  };

  return (
    <div
      ref={ref}
      className={[
        'element',
        selected ? 'selected' : '',
        editing ? 'editing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* TEXT */}
      {e.type === 'text' && (
        <div
          className="text-el"
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={
            editing
              ? handleTextBlur
              : undefined
          }
          onPointerDown={(ev) => {
            if (editing) {
              ev.stopPropagation();
            }
          }}
        >
          {e.payload.richText?.text}
        </div>
      )}

      {/* IMAGE */}
      {e.type === 'image' && (
        <img
          src={
            e.payload.src ||
            'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=80'
          }
          alt={e.payload.alt || ''}
          draggable={false}
        />
      )}

      {/* CHART */}
      {e.type === 'chart' && (
        <>
          {e.payload.chart?.title && (
            <div className="chart-title">
              {e.payload.chart.title}
            </div>
          )}

          {e.payload.chart && (
            <ChartView
              spec={e.payload.chart}
            />
          )}
        </>
      )}

      {/* TABLE */}
      {e.type === 'table' && (
        <table>
          <thead>
            <tr>
              {e.payload.table?.headers.map(
                (header, index) => (
                  <th
                    key={`${header}-${index}`}
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {e.payload.table?.rows.map(
              (row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map(
                    (cell, columnIndex) => (
                      <td
                        key={`${rowIndex}-${columnIndex}`}
                        onDoubleClick={(ev) => {
                          ev.stopPropagation();

                          handleTableCellDoubleClick(
                            rowIndex,
                            columnIndex
                          );
                        }}
                      >
                        {cell}
                      </td>
                    )
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      )}

      {/* SHAPE */}
      {e.type === 'shape' && (
        <div
          className="shape"
          style={{
            background:
              e.payload.fill || '#e9e7ff',
            borderRadius:
              e.payload.radius || 18,
          }}
        />
      )}

      {/* SELECTION CONTROLS */}
      {selected && (
        <>
          {/* DELETE */}
          <button
            type="button"
            className="delete-handle"
            onPointerDown={(ev) => {
              ev.stopPropagation();
            }}
            onClick={(ev) => {
              ev.stopPropagation();
              onDelete(e.id);
            }}
          >
            <Trash2 size={13} />
          </button>

          {/* DUPLICATE */}
          <button
            type="button"
            className="duplicate-handle"
            onPointerDown={(ev) => {
              ev.stopPropagation();
            }}
            onClick={(ev) => {
              ev.stopPropagation();
              onDuplicate(e.id);
            }}
          >
            +
          </button>

          {/* BRING FORWARD */}
          <button
            type="button"
            className="bring-forward-handle"
            onPointerDown={(ev) => {
              ev.stopPropagation();
            }}
            onClick={(ev) => {
              ev.stopPropagation();
              onBringForward(e.id);
            }}
          >
            ↑
          </button>

          {/* SEND BACKWARD */}
          <button
            type="button"
            className="send-backward-handle"
            onPointerDown={(ev) => {
              ev.stopPropagation();
            }}
            onClick={(ev) => {
              ev.stopPropagation();
              onSendBackward(e.id);
            }}
          >
            ↓
          </button>

          {/* RESIZE */}
          <div
            className="resize-handle"
            onPointerDown={(ev) => {
              if (e.locked) return;

              ev.stopPropagation();

              onResizeStart(e, ev);
            }}
          />
        </>
      )}
    </div>
  );
}
