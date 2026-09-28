import { create } from 'zustand';
import {
  Deck,
  DeckElement,
  HistoryState,
  W,
  H,
  blankSlide,
  emptyDeck,
  uid,
} from '@/types/deck';
import { clampBox, findFreePosition } from '@/lib/geometry';

type ApplyOpts = {
  recordHistory?: boolean;
};

type Store = {
  deck: Deck;
  currentSlideId: string;
  selectedElementIds: string[];
  history: HistoryState[];
  future: HistoryState[];
  chat: { role: 'user' | 'assistant'; text: string }[];
  gestureActive: boolean;
  setCurrentSlide: (id: string) => void;
  select: (ids: string[], add?: boolean) => void;
  apply: (fn: (d: Deck) => void, opts?: ApplyOpts) => void;
  beginGesture: () => void;
  endGesture: () => void;
  cancelGesture: () => void;
  addSlide: (index?: number) => void;
  deleteSlide: (id: string) => void;
  duplicateSlide: (id: string) => void;
  reorderSlides: (from: number, to: number) => void;
  renameSlide: (id: string, title: string) => void;
  updateElement: (slideId: string, elementId: string, patch: Partial<DeckElement>, opts?: ApplyOpts) => void;
  updateElements: (
    slideId: string,
    patches: Array<{ id: string; patch: Partial<DeckElement> }>,
    opts?: ApplyOpts,
  ) => void;
  deleteElement: (slideId: string, id: string) => void;
  deleteElements: (slideId: string, ids: string[]) => void;
  addElement: (slideId: string, e: DeckElement) => void;
  duplicateElement: (slideId: string, id: string) => void;
  duplicateElements: (slideId: string, ids: string[]) => void;
  moveElement: (
    fromSlide: string,
    toSlide: string,
    id: string,
    x?: number,
    y?: number,
    opts?: ApplyOpts & { copy?: boolean },
  ) => void;
  bringForward: (slideId: string, id: string) => void;
  sendBackward: (slideId: string, id: string) => void;
  undo: () => void;
  redo: () => void;
  addChat: (m: { role: 'user' | 'assistant'; text: string }) => void;
  loadDeck: (d: Deck, opts?: { recordHistory?: boolean }) => void;
};

const snapshot = (s: Pick<Store, 'deck' | 'currentSlideId' | 'selectedElementIds'>): HistoryState => ({
  deck: structuredClone(s.deck),
  currentSlideId: s.currentSlideId,
  selectedElementIds: [...s.selectedElementIds],
});

function pruneSelection(deck: Deck, ids: string[]) {
  const live = new Set(deck.slides.flatMap((slide) => slide.elementIds));
  return ids.filter((id) => live.has(id));
}

function syncZ(slide: { elementIds: string[]; elements: Record<string, DeckElement> }) {
  slide.elementIds.forEach((id, i) => {
    if (slide.elements[id]) slide.elements[id].zIndex = i + 1;
  });
}

function placeOnSlide(
  destination: { elementIds: string[]; elements: Record<string, DeckElement> },
  element: DeckElement,
  x: number,
  y: number,
  ignoreIds: string[] = [],
) {
  const boxed = clampBox(x, y, element.width, element.height);
  const p = findFreePosition(destination, { ...element, width: boxed.width, height: boxed.height }, boxed.x, boxed.y, ignoreIds);
  element.x = p.x;
  element.y = p.y;
  element.width = boxed.width;
  element.height = boxed.height;
}

export const useDeckStore = create<Store>((set, get) => ({
  deck: emptyDeck(),
  currentSlideId: '',
  selectedElementIds: [],
  history: [],
  future: [],
  chat: [],
  gestureActive: false,

  setCurrentSlide: (id) => set({ currentSlideId: id, selectedElementIds: [] }),

  select: (ids, add = false) =>
    set((s) => ({
      selectedElementIds: add ? [...new Set([...s.selectedElementIds, ...ids])] : ids,
    })),

  apply: (fn, opts) =>
    set((s) => {
      const record = opts?.recordHistory !== false && !s.gestureActive;
      const deck = structuredClone(s.deck);
      fn(deck);
      return {
        deck,
        history: record ? [...s.history, snapshot(s)].slice(-50) : s.history,
        future: record ? [] : s.future,
        selectedElementIds: pruneSelection(deck, s.selectedElementIds),
      };
    }),

  beginGesture: () =>
    set((s) => {
      if (s.gestureActive) return s;
      return {
        gestureActive: true,
        history: [...s.history, snapshot(s)].slice(-50),
        future: [],
      };
    }),

  endGesture: () => set({ gestureActive: false }),

  cancelGesture: () => {
    const s = get();
    if (!s.gestureActive) return;
    const prev = s.history.at(-1);
    if (!prev) {
      set({ gestureActive: false });
      return;
    }
    set({
      deck: prev.deck,
      currentSlideId: prev.currentSlideId,
      selectedElementIds: prev.selectedElementIds,
      history: s.history.slice(0, -1),
      gestureActive: false,
    });
  },

  addSlide: (index) =>
    get().apply((d) => {
      const slide = blankSlide('New slide');
      const i = Math.max(0, Math.min(d.slides.length, index ?? d.slides.length));
      d.slides.splice(i, 0, slide);
    }),

  deleteSlide: (id) =>
    get().apply((d) => {
      if (d.slides.length <= 1) return;
      const i = d.slides.findIndex((s) => s.id === id);
      if (i < 0) return;
      d.slides = d.slides.filter((s) => s.id !== id);
      const nextId = d.slides[Math.max(0, i - 1)]?.id || d.slides[0].id;
      set({ currentSlideId: nextId });
    }),

  duplicateSlide: (id) =>
    get().apply((d) => {
      const i = d.slides.findIndex((s) => s.id === id);
      if (i < 0) return;
      const src = d.slides[i];
      const clone = structuredClone(src);
      clone.id = uid('slide');
      clone.title = `${src.title} copy`;
      const map = new Map<string, string>();
      const elements: Record<string, DeckElement> = {};
      clone.elementIds.forEach((oldId) => {
        const element = clone.elements[oldId];
        if (!element) return;
        const newId = uid('el');
        map.set(oldId, newId);
        element.id = newId;
        elements[newId] = element;
      });
      clone.elements = elements;
      clone.elementIds = clone.elementIds.map((oldId) => map.get(oldId)!).filter(Boolean);
      d.slides.splice(i + 1, 0, clone);
    }),

  reorderSlides: (from, to) =>
    get().apply((d) => {
      if (from < 0 || from >= d.slides.length || to < 0 || to >= d.slides.length || from === to) return;
      const [slide] = d.slides.splice(from, 1);
      d.slides.splice(to, 0, slide);
    }),

  renameSlide: (id, title) =>
    get().apply((d) => {
      const slide = d.slides.find((s) => s.id === id);
      if (slide) slide.title = title;
    }),

  updateElement: (slideId, id, patch, opts) =>
    get().apply((d) => {
      const e = d.slides.find((s) => s.id === slideId)?.elements[id];
      if (!e) return;
      const prevPayload = e.payload;
      Object.assign(e, patch);
      if (patch.payload) e.payload = { ...prevPayload, ...patch.payload };
    }, opts),

  updateElements: (slideId, patches, opts) =>
    get().apply((d) => {
      const slide = d.slides.find((s) => s.id === slideId);
      if (!slide) return;
      for (const { id, patch } of patches) {
        const e = slide.elements[id];
        if (!e) continue;
        Object.assign(e, patch);
      }
    }, opts),

  deleteElement: (slideId, id) => get().deleteElements(slideId, [id]),

  deleteElements: (slideId, ids) =>
    get().apply((d) => {
      const s = d.slides.find((x) => x.id === slideId);
      if (!s) return;
      for (const id of ids) {
        delete s.elements[id];
      }
      s.elementIds = s.elementIds.filter((x) => !ids.includes(x));
    }),

  addElement: (slideId, e) =>
    get().apply((d) => {
      const s = d.slides.find((x) => x.id === slideId);
      if (!s) return;
      const boxed = clampBox(e.x, e.y, e.width, e.height);
      s.elements[e.id] = { ...structuredClone(e), ...boxed };
      s.elementIds.push(e.id);
      syncZ(s);
    }),

  duplicateElement: (slideId, id) => get().duplicateElements(slideId, [id]),

  duplicateElements: (slideId, ids) =>
    get().apply((d) => {
      const s = d.slides.find((x) => x.id === slideId);
      if (!s) return;
      const created: string[] = [];
      for (const id of ids) {
        const source = s.elements[id];
        if (!source) continue;
        const copy = structuredClone(source);
        copy.id = uid('el');
        const boxed = clampBox(copy.x + 24, copy.y + 24, copy.width, copy.height);
        Object.assign(copy, boxed);
        s.elements[copy.id] = copy;
        s.elementIds.push(copy.id);
        created.push(copy.id);
      }
      syncZ(s);
      if (created.length) set({ selectedElementIds: created });
    }),

    moveElement: (from, to, id, x = 100, y = 100, opts) => {
      let createdId: string | null = null;

      get().apply((d) => {
        const source = d.slides.find((slide) => slide.id === from);
        const destination = d.slides.find((slide) => slide.id === to);
        if (!source || !destination) return;

        const sourceElement = source.elements[id];
        if (!sourceElement) return;

        if (opts?.copy) {
          const copy = structuredClone(sourceElement);
          copy.id = uid('el');
          createdId = copy.id;
          placeOnSlide(destination, copy, x, y);
          destination.elements[copy.id] = copy;
          destination.elementIds.push(copy.id);
          syncZ(destination);
          return;
        }

        if (source.id === destination.id) {
          const position = findFreePosition(
            {
              elementIds: destination.elementIds.filter((elementId) => elementId !== id),
              elements: destination.elements,
            },
            sourceElement,
            x,
            y,
          );
          sourceElement.x = position.x;
          sourceElement.y = position.y;
          return;
        }

        delete source.elements[id];
        source.elementIds = source.elementIds.filter((elementId) => elementId !== id);
        placeOnSlide(destination, sourceElement, x, y);
        destination.elements[id] = sourceElement;
        if (!destination.elementIds.includes(id)) destination.elementIds.push(id);
        syncZ(source);
        syncZ(destination);
      }, opts);

      if (createdId) set({ selectedElementIds: [createdId] });
    },

  bringForward: (slideId, id) =>
    get().apply((d) => {
      const s = d.slides.find((x) => x.id === slideId);
      if (!s) return;
      const i = s.elementIds.indexOf(id);
      if (i < 0 || i >= s.elementIds.length - 1) return;
      [s.elementIds[i], s.elementIds[i + 1]] = [s.elementIds[i + 1], s.elementIds[i]];
      syncZ(s);
    }),

  sendBackward: (slideId, id) =>
    get().apply((d) => {
      const s = d.slides.find((x) => x.id === slideId);
      if (!s) return;
      const i = s.elementIds.indexOf(id);
      if (i <= 0) return;
      [s.elementIds[i], s.elementIds[i - 1]] = [s.elementIds[i - 1], s.elementIds[i]];
      syncZ(s);
    }),

  undo: () =>
    set((s) => {
      const prev = s.history.at(-1);
      if (!prev) return s;
      return {
        deck: prev.deck,
        currentSlideId: prev.currentSlideId,
        selectedElementIds: prev.selectedElementIds,
        history: s.history.slice(0, -1),
        future: [snapshot(s), ...s.future].slice(0, 50),
        gestureActive: false,
      };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return s;
      return {
        deck: next.deck,
        currentSlideId: next.currentSlideId,
        selectedElementIds: next.selectedElementIds,
        history: [...s.history, snapshot(s)].slice(-50),
        future: s.future.slice(1),
        gestureActive: false,
      };
    }),

  addChat: (m) => set((s) => ({ chat: [...s.chat, m] })),

  loadDeck: (d, opts) =>
    set((s) => {
      const record = opts?.recordHistory !== false;
      const nextId =
        d.slides.some((slide) => slide.id === s.currentSlideId)
          ? s.currentSlideId
          : d.slides[0]?.id ?? '';
      return {
        deck: d,
        currentSlideId: nextId,
        selectedElementIds: pruneSelection(d, s.selectedElementIds),
        history: record ? [...s.history, snapshot(s)].slice(-50) : s.history,
        future: record ? [] : s.future,
      };
    }),
}));
