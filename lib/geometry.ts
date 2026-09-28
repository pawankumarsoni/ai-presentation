import { DeckElement, H, W } from '@/types/deck';

export const GRID = 20;
export const SNAP = 8;

export function clampBox(x: number, y: number, width: number, height: number) {
  const w = Math.max(40, Math.min(W, width));
  const h = Math.max(30, Math.min(H, height));
  return {
    x: Math.max(0, Math.min(W - w, x)),
    y: Math.max(0, Math.min(H - h, y)),
    width: w,
    height: h,
  };
}

export function snapValue(n: number) {
  return Math.round(n / GRID) * GRID;
}

export type Guide = { axis: 'x' | 'y'; pos: number };

export function snapAndGuides(
  moving: Array<{ id: string; x: number; y: number; width: number; height: number }>,
  others: DeckElement[],
) {
  if (!moving.length) return { dx: 0, dy: 0, guides: [] as Guide[] };

  const minX = Math.min(...moving.map((e) => e.x));
  const minY = Math.min(...moving.map((e) => e.y));
  const maxX = Math.max(...moving.map((e) => e.x + e.width));
  const maxY = Math.max(...moving.map((e) => e.y + e.height));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const xs = [minX, cx, maxX];
  const ys = [minY, cy, maxY];

  const targetsX = [0, W / 2, W, ...others.flatMap((e) => [e.x, e.x + e.width / 2, e.x + e.width])];
  const targetsY = [0, H / 2, H, ...others.flatMap((e) => [e.y, e.y + e.height / 2, e.y + e.height])];

  let dx = 0;
  let dy = 0;
  let bestX = SNAP + 1;
  let bestY = SNAP + 1;
  const guides: Guide[] = [];

  for (const x of xs) {
    for (const t of targetsX) {
      const d = Math.abs(x - t);
      if (d < bestX) {
        bestX = d;
        dx = t - x;
      }
    }
  }
  for (const y of ys) {
    for (const t of targetsY) {
      const d = Math.abs(y - t);
      if (d < bestY) {
        bestY = d;
        dy = t - y;
      }
    }
  }

  if (bestX > SNAP) dx = snapValue(minX + dx) - minX;
  else guides.push({ axis: 'x', pos: minX + dx });

  if (bestY > SNAP) dy = snapValue(minY + dy) - minY;
  else guides.push({ axis: 'y', pos: minY + dy });

  if (bestX <= SNAP) guides.push({ axis: 'x', pos: minX + dx + (maxX - minX) / 2 });
  if (bestY <= SNAP) guides.push({ axis: 'y', pos: minY + dy + (maxY - minY) / 2 });

  return { dx, dy, guides };
}

export function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function findFreePosition(
  slide: { elementIds: string[]; elements: Record<string, DeckElement> },
  element: DeckElement,
  requestedX: number,
  requestedY: number,
  ignoreIds: string[] = [],
) {
  const ignore = new Set(ignoreIds);
  const start = clampBox(requestedX, requestedY, element.width, element.height);
  const candidates: Array<{ x: number; y: number }> = [{ x: start.x, y: start.y }];
  const step = Math.max(40, Math.min(element.width, element.height) * 0.35);

  for (let radius = 1; radius <= 12; radius++) {
    const d = radius * step;
    candidates.push(
      { x: start.x + d, y: start.y },
      { x: start.x - d, y: start.y },
      { x: start.x, y: start.y + d },
      { x: start.x, y: start.y - d },
      { x: start.x + d, y: start.y + d },
      { x: start.x - d, y: start.y + d },
      { x: start.x + d, y: start.y - d },
      { x: start.x - d, y: start.y - d },
    );
  }

  for (const candidate of candidates) {
    const p = clampBox(candidate.x, candidate.y, element.width, element.height);
    const probe = { ...element, x: p.x, y: p.y };
    const collision = slide.elementIds.some((id) => {
      if (ignore.has(id)) return false;
      const other = slide.elements[id];
      return other ? overlaps(probe, other) : false;
    });
    if (!collision) return { x: p.x, y: p.y };
  }

  return { x: start.x, y: start.y };
}
