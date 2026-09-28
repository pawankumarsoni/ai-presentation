'use client';

import { useEffect, useState } from 'react';
import { ChartType, DeckElement } from '@/types/deck';

type Props = {
  e?: DeckElement;
  onPatch: (p: Partial<DeckElement>) => void;
};

export function Inspector({ e, onPatch }: Props) {
  const [draft, setDraft] = useState<DeckElement | undefined>();
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(e ? structuredClone(e) : undefined);
    setError('');
  }, [e?.id]);

  if (!e || !draft) {
    return <div className="inspector empty">Select an element to inspect it.</div>;
  }

  const commit = () => {
    if (draft.type === 'chart' && !draft.payload.chart) return;
    if (draft.type === 'table' && !draft.payload.table) return;
    onPatch({
      x: draft.x,
      y: draft.y,
      width: draft.width,
      height: draft.height,
      rotation: draft.rotation,
      payload: draft.payload,
    });
    setError('');
  };

  const cancel = () => {
    setDraft(structuredClone(e));
    setError('');
  };

  const patchDraft = (patch: Partial<DeckElement>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));

  const patchPayload = (payload: DeckElement['payload']) =>
    setDraft((current) => (current ? { ...current, payload } : current));

  const chart = draft.payload.chart;

  return (
    <div className="inspector">
      <div className="panel-title">Inspector</div>

      <label>Position</label>
      <div className="grid2">
        <input value={Math.round(draft.x)} onChange={(v) => patchDraft({ x: +v.target.value || 0 })} />
        <input value={Math.round(draft.y)} onChange={(v) => patchDraft({ y: +v.target.value || 0 })} />
        <input value={Math.round(draft.width)} onChange={(v) => patchDraft({ width: +v.target.value || 1 })} />
        <input value={Math.round(draft.height)} onChange={(v) => patchDraft({ height: +v.target.value || 1 })} />
      </div>

      {draft.type === 'text' && (
        <>
          <label>Text</label>
          <textarea
            value={draft.payload.richText?.text || ''}
            onChange={(v) =>
              patchPayload({
                ...draft.payload,
                richText: { ...(draft.payload.richText || {}), text: v.target.value },
              })
            }
          />
        </>
      )}

      {draft.type === 'chart' && chart && (
        <>
          <label>Chart type</label>
          <select
            value={chart.type}
            onChange={(v) =>
              patchPayload({
                ...draft.payload,
                chart: { ...chart, type: v.target.value as ChartType },
              })
            }
          >
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
          </select>

          <label>Title</label>
          <input
            value={chart.title}
            onChange={(v) =>
              patchPayload({
                ...draft.payload,
                chart: { ...chart, title: v.target.value },
              })
            }
          />

          <label>Categories (comma separated)</label>
          <input
            value={chart.categories.join(', ')}
            onChange={(v) =>
              patchPayload({
                ...draft.payload,
                chart: {
                  ...chart,
                  categories: v.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                },
              })
            }
          />

          <label>Series JSON</label>
          <textarea
            className="data-editor"
            value={JSON.stringify(chart.series, null, 2)}
            onChange={(v) => {
              try {
                const series = JSON.parse(v.target.value);
                if (!Array.isArray(series)) throw new Error('Series must be an array');
                patchPayload({ ...draft.payload, chart: { ...chart, series } });
                setError('');
              } catch {
                setError('Invalid chart data. Fix the JSON before saving.');
              }
            }}
          />
        </>
      )}

      {draft.type === 'table' && draft.payload.table && (
        <>
          <label>Table JSON</label>
          <textarea
            className="data-editor"
            value={JSON.stringify(draft.payload.table, null, 2)}
            onChange={(v) => {
              try {
                const table = JSON.parse(v.target.value);
                if (!table || !Array.isArray(table.headers) || !Array.isArray(table.rows)) {
                  throw new Error('Invalid table');
                }
                patchPayload({ ...draft.payload, table });
                setError('');
              } catch {
                setError('Invalid table JSON. Fix it before saving.');
              }
            }}
          />
        </>
      )}

      {error && <div className="inspector-error">{error}</div>}

      <div className="inspector-actions">
        <button onClick={cancel}>Cancel</button>
        <button onClick={commit} disabled={!!error}>Save</button>
      </div>
    </div>
  );
}
