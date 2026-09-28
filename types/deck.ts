export type ElementType = 'text' | 'image' | 'chart' | 'table' | 'shape';

export type ChartType = 'bar' | 'line' | 'pie';

export type SlideLayout =
  | 'title'
  | 'content'
  | 'two-column'
  | 'comparison'
  | 'section-break'
  | 'chart-forward'
  | 'blank';

export type RichText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
};

export type ChartSpec = {
  type: ChartType;
  title: string;
  categories: string[];
  series: {
    name: string;
    data: number[];
  }[];
  colors?: string[];
};

export type TableSpec = {
  headers: string[];
  rows: string[][];
};

export type ElementPayload = {
  richText?: RichText;
  src?: string;
  alt?: string;
  chart?: ChartSpec;
  table?: TableSpec;
  fill?: string;
  radius?: number;
};

export type DeckElement = {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  locked?: boolean;
  payload: ElementPayload;
};

export type Slide = {
  id: string;
  title: string;
  layout: SlideLayout;
  background: string;
  speakerNotes: string;
  elementIds: string[];
  elements: Record<string, DeckElement>;
};

export type Deck = {
  id: string;
  title: string;
  theme: {
    name: string;
    accent: string;
  };
  aspectRatio: '16:9';
  slides: Slide[];
};

export type HistoryState = {
  deck: Deck;
  selectedElementIds: string[];
  currentSlideId: string;
};

export const W = 1600;
export const H = 900;

export const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;

export function emptyDeck(): Deck {
  const slide = blankSlide('Untitled slide');
  return {
    id: uid('deck'),
    title: 'Untitled Presentation',
    theme: {
      name: 'Aurora',
      accent: '#635BFF',
    },
    aspectRatio: '16:9',
    slides: [slide],
  };
}

export function makeImage(
  src: string,
  x = 200,
  y = 180,
  width = 640,
  height = 360,
  zIndex = 1,
): DeckElement {
  return {
    id: uid('el'),
    type: 'image',
    x,
    y,
    width,
    height,
    zIndex,
    payload: { src, alt: '' },
  };
}

export function makeShape(
  fill = '#eceaff',
  x = 240,
  y = 500,
  width = 360,
  height = 180,
  zIndex = 1,
): DeckElement {
  return {
    id: uid('el'),
    type: 'shape',
    x,
    y,
    width,
    height,
    zIndex,
    payload: { fill, radius: 24 },
  };
}

export function makeText(
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex = 1,
): DeckElement {
  return {
    id: uid('el'),
    type: 'text',
    x,
    y,
    width,
    height,
    zIndex,
    payload: {
      richText: {
        text,
      },
    },
  };
}

export function makeChart(
  spec: ChartSpec,
  x = 920,
  y = 240,
  width = 560,
  height = 430,
  zIndex = 1,
): DeckElement {
  return {
    id: uid('chart'),
    type: 'chart',
    x,
    y,
    width,
    height,
    zIndex,
    payload: {
      chart: spec,
    },
  };
}

export function makeTable(
  spec: TableSpec,
  x = 180,
  y = 250,
  width = 1240,
  height = 360,
  zIndex = 1,
): DeckElement {
  return {
    id: uid('table'),
    type: 'table',
    x,
    y,
    width,
    height,
    zIndex,
    payload: {
      table: spec,
    },
  };
}

export function blankSlide(title = 'Untitled slide'): Slide {
  const id = uid('slide');

  return {
    id,
    title,
    layout: 'blank',
    background: '#ffffff',
    speakerNotes: '',
    elementIds: [],
    elements: {},
  };
}

export function demoDeck(): Deck {
  const slide1 = blankSlide('Introduction');
  const slide2 = blankSlide('Market Overview');
  const slide3 = blankSlide('Strategy');

  slide1.id = 'demo-slide-1';
  slide2.id = 'demo-slide-2';
  slide3.id = 'demo-slide-3';

  const title = makeText(
    'AI Presentation Builder',
    140,
    170,
    1000,
    130,
    1,
  );

  const subtitle = makeText(
    'Generate, edit and refine presentations with AI',
    145,
    330,
    900,
    90,
    2,
  );

  title.id = 'demo-slide-1-element-1';
  subtitle.id = 'demo-slide-1-element-2';

  slide1.elements = {
    [title.id]: title,
    [subtitle.id]: subtitle,
  };

  slide1.elementIds = [title.id, subtitle.id];

  const chart = makeChart(
    {
      type: 'bar',
      title: 'Quarterly Growth',
      categories: ['Q1', 'Q2', 'Q3', 'Q4'],
      series: [
        {
          name: 'Revenue',
          data: [25, 42, 58, 76],
        },
      ],
    },
    180,
    220,
    900,
    500,
    1,
  );

  chart.id = 'demo-slide-2-element-1';

  slide2.elements = {
    [chart.id]: chart,
  };

  slide2.elementIds = [chart.id];

  const strategyTitle = makeText(
    'Strategy',
    140,
    130,
    700,
    100,
    1,
  );

  const table = makeTable(
    {
      headers: ['Initiative', 'Owner', 'Status'],
      rows: [
        ['AI generation', 'Product', 'In progress'],
        ['Canvas editing', 'Engineering', 'In progress'],
        ['Export', 'Engineering', 'Planned'],
      ],
    },
    140,
    280,
    1200,
    360,
    2,
  );

  strategyTitle.id = 'demo-slide-3-element-1';
  table.id = 'demo-slide-3-element-2';

  slide3.elements = {
    [strategyTitle.id]: strategyTitle,
    [table.id]: table,
  };

  slide3.elementIds = [strategyTitle.id, table.id];

  return {
    id: 'demo-deck',
    title: 'Untitled Presentation',
    theme: {
      name: 'Aurora',
      accent: '#635BFF',
    },
    aspectRatio: '16:9',
    slides: [slide1, slide2, slide3],
  };
}