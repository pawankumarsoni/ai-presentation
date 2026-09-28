'use client';

import { Slide, W, H } from '@/types/deck';
import { ChartView } from './ChartView';

export function SlidePreview({ slide }: { slide: Slide }) {
  return (
    <div className="print-slide" style={{ background: slide.background }}>
      {slide.elementIds.map((id) => {
        const e = slide.elements[id];
        if (!e) return null;
        const style = {
          left: `${(e.x / W) * 100}%`,
          top: `${(e.y / H) * 100}%`,
          width: `${(e.width / W) * 100}%`,
          height: `${(e.height / H) * 100}%`,
          zIndex: e.zIndex,
          transform: `rotate(${e.rotation || 0}deg)`,
        };
        return (
          <div key={id} className="element print-el" style={style}>
            {e.type === 'text' && <div className="text-el">{e.payload.richText?.text}</div>}
            {e.type === 'image' && <img src={e.payload.src || ''} alt={e.payload.alt || ''} />}
            {e.type === 'chart' && e.payload.chart && (
              <>
                <div className="chart-title">{e.payload.chart.title}</div>
                <ChartView spec={e.payload.chart} />
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
                        <td key={`${i}-${j}`}>{c}</td>
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
          </div>
        );
      })}
    </div>
  );
}
