import {
  Deck,
  W,
  H,
  uid,
  makeChart,
  makeTable,
  makeText,
} from "@/types/deck";

/**
 * OpenAI-compatible / OpenRouter tool definitions.
 *
 * IMPORTANT:
 * These use the Chat Completions tool format:
 *
 * {
 *   type: "function",
 *   function: {
 *     name,
 *     description,
 *     parameters
 *   }
 * }
 */

export const tools = [
  {
    type: "function",
    function: {
      name: "plan_deck",
      description:
        "Create the outline for a new presentation before slides are populated.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Presentation title.",
          },
          slides: {
            type: "array",
            description: "Ordered slide plan.",
            items: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                },
                layout: {
                  type: "string",
                  enum: [
                    "title",
                    "content",
                    "two-column",
                    "comparison",
                    "section-break",
                    "chart-forward",
                    "blank",
                  ],
                },
                purpose: {
                  type: "string",
                },
              },
              required: ["title", "layout", "purpose"],
            },
          },
        },
        required: ["title", "slides"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "add_slide",
      description:
        "Add a slide at a specific position in the presentation.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
          },
          layout: {
            type: "string",
            enum: [
              "title",
              "content",
              "two-column",
              "comparison",
              "section-break",
              "chart-forward",
              "blank",
            ],
          },
          index: {
            type: "integer",
            description:
              "Zero-based insertion index. Omit to add at the end.",
          },
        },
        required: ["title", "layout"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "update_slide",
      description:
        "Update only specified metadata fields of an existing slide.",
      parameters: {
        type: "object",
        properties: {
          slide_id: {
            type: "string",
          },
          title: {
            type: "string",
          },
          layout: {
            type: "string",
          },
          background: {
            type: "string",
          },
          speaker_notes: {
            type: "string",
          },
        },
        required: ["slide_id"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "delete_slide",
      description: "Delete an existing slide.",
      parameters: {
        type: "object",
        properties: {
          slide_id: {
            type: "string",
          },
        },
        required: ["slide_id"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "duplicate_slide",
      description:
        "Duplicate an existing slide and all of its elements.",
      parameters: {
        type: "object",
        properties: {
          slide_id: {
            type: "string",
          },
          index: {
            type: "integer",
          },
        },
        required: ["slide_id"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "reorder_slides",
      description:
        "Move an existing slide from one position to another.",
      parameters: {
        type: "object",
        properties: {
          from_index: {
            type: "integer",
          },
          to_index: {
            type: "integer",
          },
        },
        required: ["from_index", "to_index"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "add_element",
      description:
        "Add a positioned element to a slide. Elements can be text, image, table, or shape. For a table, provide headers and rows. Charts should use add_chart.",
      parameters: {
        type: "object",
        properties: {
          slide_id: {
            type: "string",
          },
          type: {
            type: "string",
            enum: ["text", "image", "table", "shape"],
          },
          x: {
            type: "number",
          },
          y: {
            type: "number",
          },
          width: {
            type: "number",
          },
          height: {
            type: "number",
          },
          text: {
            type: "string",
          },
          src: {
            type: "string",
          },
          fill: {
            type: "string",
          },
          headers: {
            type: "array",
            description: "Column names for a table element.",
            items: {
              type: "string",
            },
          },
          rows: {
            type: "array",
            description: "Rows for a table element. Each row is an array of cell strings.",
            items: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
        },
        required: [
          "slide_id",
          "type",
          "x",
          "y",
          "width",
          "height",
        ],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "update_element",
      description:
        "Patch only the specified fields of an existing element. Preserve all unspecified fields.",
      parameters: {
        type: "object",
        properties: {
          slide_id: {
            type: "string",
          },
          element_id: {
            type: "string",
          },
          x: {
            type: "number",
          },
          y: {
            type: "number",
          },
          width: {
            type: "number",
          },
          height: {
            type: "number",
          },
          text: {
            type: "string",
          },
          fill: {
            type: "string",
          },
          rotation: {
            type: "number",
          },
        },
        required: ["slide_id", "element_id"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "delete_element",
      description: "Delete a single element from a slide.",
      parameters: {
        type: "object",
        properties: {
          slide_id: {
            type: "string",
          },
          element_id: {
            type: "string",
          },
        },
        required: ["slide_id", "element_id"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "move_element",
      description:
        "Move an element within a slide or transfer it to another slide. Preserve the element ID.",
      parameters: {
        type: "object",
        properties: {
          from_slide_id: {
            type: "string",
          },
          to_slide_id: {
            type: "string",
          },
          element_id: {
            type: "string",
          },
          x: {
            type: "number",
          },
          y: {
            type: "number",
          },
        },
        required: [
          "from_slide_id",
          "to_slide_id",
          "element_id",
        ],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "resize_element",
      description:
        "Resize an existing element while preserving its content and identity.",
      parameters: {
        type: "object",
        properties: {
          slide_id: {
            type: "string",
          },
          element_id: {
            type: "string",
          },
          width: {
            type: "number",
          },
          height: {
            type: "number",
          },
        },
        required: [
          "slide_id",
          "element_id",
          "width",
          "height",
        ],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "reorder_elements",
      description:
        "Change the z-order of elements on a slide.",
      parameters: {
        type: "object",
        properties: {
          slide_id: {
            type: "string",
          },
          element_id: {
            type: "string",
          },
          z_index: {
            type: "integer",
          },
        },
        required: [
          "slide_id",
          "element_id",
          "z_index",
        ],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "add_chart",
      description:
        "Create a real editable chart element. Use bar, line, or pie.",
      parameters: {
        type: "object",
        properties: {
          slide_id: {
            type: "string",
          },
          x: {
            type: "number",
          },
          y: {
            type: "number",
          },
          width: {
            type: "number",
          },
          height: {
            type: "number",
          },
          chart_type: {
            type: "string",
            enum: ["bar", "line", "pie"],
          },
          title: {
            type: "string",
          },
          categories: {
            type: "array",
            items: {
              type: "string",
            },
          },
          series: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                },
                data: {
                  type: "array",
                  items: {
                    type: "number",
                  },
                },
              },
              required: ["name", "data"],
            },
          },
        },
        required: [
          "slide_id",
          "chart_type",
          "title",
          "categories",
          "series",
        ],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "update_table_data",
      description:
        "Replace the headers and rows of an existing editable table without changing its position or identity.",
      parameters: {
        type: "object",
        properties: {
          slide_id: {
            type: "string",
          },
          element_id: {
            type: "string",
          },
          headers: {
            type: "array",
            items: {
              type: "string",
            },
          },
          rows: {
            type: "array",
            items: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
        },
        required: ["slide_id", "element_id", "headers", "rows"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "update_chart_data",
      description:
        "Replace the data of an existing chart without changing its position or identity.",
      parameters: {
        type: "object",
        properties: {
          slide_id: {
            type: "string",
          },
          element_id: {
            type: "string",
          },
          categories: {
            type: "array",
            items: {
              type: "string",
            },
          },
          series: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                },
                data: {
                  type: "array",
                  items: {
                    type: "number",
                  },
                },
              },
              required: ["name", "data"],
            },
          },
        },
        required: [
          "slide_id",
          "element_id",
          "categories",
          "series",
        ],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "change_chart_type",
      description:
        "Change a chart between bar, line, and pie while preserving its data.",
      parameters: {
        type: "object",
        properties: {
          slide_id: {
            type: "string",
          },
          element_id: {
            type: "string",
          },
          chart_type: {
            type: "string",
            enum: ["bar", "line", "pie"],
          },
        },
        required: [
          "slide_id",
          "element_id",
          "chart_type",
        ],
      },
    },
  },
];

/**
 * Compact canonical deck representation sent to the model.
 *
 * This is intentionally derived from the actual Deck object rather
 * than maintaining a second AI-specific copy.
 */
export function deckContext(deck: Deck) {
  return JSON.stringify(
    {
      deck_id: deck.id,
      title: deck.title,
      aspect_ratio: deck.aspectRatio,

      slides: deck.slides.map((slide, index) => ({
        index,
        id: slide.id,
        title: slide.title,
        layout: slide.layout,
        background: slide.background,
        speaker_notes: slide.speakerNotes,

        element_ids: slide.elementIds,

        elements: slide.elementIds.map((id) => {
          const element = slide.elements[id];

          if (!element) {
            return {
              id,
              error: "element reference is missing",
            };
          }

          return {
            id: element.id,
            type: element.type,

            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            rotation: element.rotation,
            zIndex: element.zIndex,

            text: element.payload?.richText?.text,

            image: element.payload?.src,

            chart: element.payload?.chart,

            table: element.payload?.table,
          };
        }),
      })),
    },
    null,
    2
  );
}

/**
 * Find slide by ID.
 */
function findSlide(deck: Deck, slideId?: string) {
  if (!slideId) {
    return undefined;
  }

  return deck.slides.find((slide) => slide.id === slideId);
}

/**
 * Find element by slide + element ID.
 */
function findElement(
  deck: Deck,
  slideId?: string,
  elementId?: string
) {
  const slide = findSlide(deck, slideId);

  if (!slide || !elementId) {
    return undefined;
  }

  return slide.elements[elementId];
}

/**
 * Clamp a position so an element cannot overflow the 1600x900
 * artboard.
 */
function clampPosition(
  x: number,
  y: number,
  width: number,
  height: number
) {
  return {
    x: Math.max(0, Math.min(W - width, x)),
    y: Math.max(0, Math.min(H - height, y)),
  };
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function findFreePosition(
  slide: { elementIds: string[]; elements: Record<string, any> },
  element: { width: number; height: number },
  requestedX: number,
  requestedY: number
) {
  const clamp = (x: number, y: number) =>
    clampPosition(x, y, element.width, element.height);

  const start = clamp(requestedX, requestedY);
  const candidates: Array<{ x: number; y: number }> = [{ ...start }];
  const step = Math.max(40, Math.min(element.width, element.height) * 0.35);

  for (let radius = 1; radius <= 14; radius++) {
    const d = radius * step;
    candidates.push(
      { x: start.x + d, y: start.y },
      { x: start.x - d, y: start.y },
      { x: start.x, y: start.y + d },
      { x: start.x, y: start.y - d },
      { x: start.x + d, y: start.y + d },
      { x: start.x - d, y: start.y + d },
      { x: start.x + d, y: start.y - d },
      { x: start.x - d, y: start.y - d }
    );
  }

  for (const candidate of candidates) {
    const p = clamp(candidate.x, candidate.y);
    const probe = { ...element, x: p.x, y: p.y };
    const collision = slide.elementIds.some((id) => {
      const other = slide.elements[id];
      return other ? overlaps(probe, other) : false;
    });
    if (!collision) return p;
  }

  return start;
}

/**
 * Apply one AI tool mutation to the canonical deck.
 */
export function applyTool(
  deck: Deck,
  name: string,
  args: any
) {
  switch (name) {
    case "plan_deck": {
      deck.title = args.title || deck.title;
    
      const plannedSlides = Array.isArray(args.slides)
        ? args.slides
        : [];
    
      deck.slides = plannedSlides.map(
        (
          planned: {
            title?: string;
            layout?: string;
            purpose?: string;
          },
          index: number,
        ) => ({
          id: uid("slide"),
          title: planned.title || `Slide ${index + 1}`,
          layout: planned.layout || "content",
          background: "#ffffff",
          speakerNotes: planned.purpose || "",
          elementIds: [],
          elements: {},
        }),
      );
    
      // Safety fallback
      if (deck.slides.length === 0) {
        deck.slides = [
          {
            id: uid("slide"),
            title: "Untitled slide",
            layout: "blank",
            background: "#ffffff",
            speakerNotes: "",
            elementIds: [],
            elements: {},
          },
        ];
      }
    
      return {
        planned: true,
        title: deck.title,
        slides: deck.slides.map((slide, index) => ({
          index,
          id: slide.id,
          title: slide.title,
          layout: slide.layout,
        })),
      };
    }

    case "add_slide": {
      const slide: any = {
        id: uid("slide"),
        title: args.title,
        layout: args.layout,
        background: "#ffffff",
        speakerNotes: "",
        elementIds: [],
        elements: {},
      };

      const index = Math.max(
        0,
        Math.min(
          deck.slides.length,
          args.index ?? deck.slides.length
        )
      );

      deck.slides.splice(index, 0, slide);

      return {
        success: true,
        slide_id: slide.id,
        index,
      };
    }

    case "update_slide": {
      const slide = findSlide(deck, args.slide_id);

      if (!slide) {
        return {
          success: false,
          error: "slide not found",
        };
      }

      if (args.title !== undefined) {
        slide.title = args.title;
      }

      if (args.layout !== undefined) {
        slide.layout = args.layout;
      }

      if (args.background !== undefined) {
        slide.background = args.background;
      }

      if (args.speaker_notes !== undefined) {
        slide.speakerNotes = args.speaker_notes;
      }

      return {
        success: true,
        slide_id: slide.id,
      };
    }

    case "delete_slide": {
      const index = deck.slides.findIndex(
        (slide) => slide.id === args.slide_id
      );

      if (index === -1) {
        return {
          success: false,
          error: "slide not found",
        };
      }

      deck.slides.splice(index, 1);

      return {
        success: true,
        deleted_slide_id: args.slide_id,
      };
    }

    case "duplicate_slide": {
      const sourceIndex = deck.slides.findIndex(
        (slide) => slide.id === args.slide_id
      );

      if (sourceIndex === -1) {
        return {
          success: false,
          error: "slide not found",
        };
      }

      const source = deck.slides[sourceIndex];

      const newSlide: any = {
        ...source,
        id: uid("slide"),
        title: `${source.title} copy`,
        elementIds: [],
        elements: {},
      };

      for (const elementId of source.elementIds) {
        const sourceElement = source.elements[elementId];

        if (!sourceElement) {
          continue;
        }

        const copiedElement = {
          ...sourceElement,
          id: uid("el"),
          payload: {
            ...sourceElement.payload,
          },
        };

        newSlide.elements[copiedElement.id] =
          copiedElement;

        newSlide.elementIds.push(
          copiedElement.id
        );
      }

      const targetIndex =
        args.index !== undefined
          ? Math.max(
              0,
              Math.min(deck.slides.length, args.index)
            )
          : sourceIndex + 1;

      deck.slides.splice(
        targetIndex,
        0,
        newSlide
      );

      return {
        success: true,
        slide_id: newSlide.id,
        index: targetIndex,
      };
    }

    case "reorder_slides": {
      if (
        args.from_index < 0 ||
        args.from_index >= deck.slides.length
      ) {
        return {
          success: false,
          error: "invalid from_index",
        };
      }

      const [slide] = deck.slides.splice(
        args.from_index,
        1
      );

      const targetIndex = Math.max(
        0,
        Math.min(
          deck.slides.length,
          args.to_index
        )
      );

      deck.slides.splice(
        targetIndex,
        0,
        slide
      );

      return {
        success: true,
        from_index: args.from_index,
        to_index: targetIndex,
      };
    }

    case "add_element": {
      const slide = findSlide(
        deck,
        args.slide_id
      );

      if (!slide) {
        return {
          success: false,
          error: "slide not found",
        };
      }

      const width = Math.max(
        40,
        args.width ?? 400
      );

      const height = Math.max(
        30,
        args.height ?? 180
      );

      const position = clampPosition(
        args.x ?? 100,
        args.y ?? 100,
        width,
        height
      );

      const element: any = {
        id: uid("el"),
        type: args.type,
        x: position.x,
        y: position.y,
        width,
        height,
        zIndex: slide.elementIds.length + 1,
        payload: {},
      };

      if (args.text !== undefined) {
        element.payload.richText = {
          text: args.text,
        };
      }

      if (args.src !== undefined) {
        element.payload.src = args.src;
      }

      if (args.fill !== undefined) {
        element.payload.fill = args.fill;
      }

      if (args.type === "table") {
        const headers =
          Array.isArray(args.headers) && args.headers.length > 0
            ? args.headers.map((value: unknown) => String(value))
            : ["Column 1", "Column 2"];

        const rows =
          Array.isArray(args.rows)
            ? args.rows.map((row: unknown) =>
                Array.isArray(row)
                  ? row.map((value: unknown) => String(value))
                  : []
              )
            : [
                ["Value 1", "Value 2"],
                ["Value 3", "Value 4"],
              ];

        element.payload.table = {
          headers,
          rows,
        };
      }

      slide.elements[element.id] = element;
      slide.elementIds.push(element.id);

      return {
        success: true,
        element_id: element.id,
        slide_id: slide.id,
      };
    }

    case "update_element": {
      const element = findElement(
        deck,
        args.slide_id,
        args.element_id
      );

      if (!element) {
        return {
          success: false,
          error: "element not found",
        };
      }

      for (const key of [
        "x",
        "y",
        "width",
        "height",
        "rotation",
      ]) {
        if (args[key] !== undefined) {
          (element as any)[key] = args[key];
        }
      }

      if (args.text !== undefined) {
        element.payload.richText = {
          ...(element.payload.richText || {}),
          text: args.text,
        };
      }

      if (args.fill !== undefined) {
        element.payload.fill = args.fill;
      }

      return {
        success: true,
        element_id: element.id,
      };
    }

    case "delete_element": {
      const slide = findSlide(
        deck,
        args.slide_id
      );

      if (!slide) {
        return {
          success: false,
          error: "slide not found",
        };
      }

      if (!slide.elements[args.element_id]) {
        return {
          success: false,
          error: "element not found",
        };
      }

      delete slide.elements[args.element_id];

      slide.elementIds =
        slide.elementIds.filter(
          (id) => id !== args.element_id
        );

      return {
        success: true,
        element_id: args.element_id,
      };
    }

    case "move_element": {
      const sourceSlide = findSlide(deck, args.from_slide_id);
      const destinationSlide = findSlide(deck, args.to_slide_id);

      if (!sourceSlide || !destinationSlide) {
        return {
          success: false,
          error: "source or destination slide not found. A move can only target an existing slide.",
        };
      }

      const element = sourceSlide.elements[args.element_id];

      if (!element) {
        return {
          success: false,
          error: "element not found",
        };
      }

      if (sourceSlide.id === destinationSlide.id) {
        const searchSlide = {
          elementIds: destinationSlide.elementIds.filter((id) => id !== element.id),
          elements: destinationSlide.elements,
        };
        const position = findFreePosition(
          searchSlide,
          element,
          args.x ?? element.x,
          args.y ?? element.y
        );
        element.x = position.x;
        element.y = position.y;

        return {
          success: true,
          element_id: element.id,
          from_slide_id: sourceSlide.id,
          to_slide_id: destinationSlide.id,
          x: element.x,
          y: element.y,
        };
      }

      const position = findFreePosition(
        destinationSlide,
        element,
        args.x ?? 120,
        args.y ?? 120
      );

      delete sourceSlide.elements[element.id];
      sourceSlide.elementIds = sourceSlide.elementIds.filter(
        (id) => id !== element.id
      );

      element.x = position.x;
      element.y = position.y;
      element.zIndex =
        destinationSlide.elementIds.reduce(
          (max, id) => Math.max(max, destinationSlide.elements[id]?.zIndex || 0),
          0
        ) + 1;

      destinationSlide.elements[element.id] = element;
      destinationSlide.elementIds.push(element.id);

      return {
        success: true,
        element_id: element.id,
        from_slide_id: sourceSlide.id,
        to_slide_id: destinationSlide.id,
        x: element.x,
        y: element.y,
        note: "Moved to the existing destination slide without moving or replacing existing elements.",
      };
    }

    case "resize_element": {
      const element = findElement(
        deck,
        args.slide_id,
        args.element_id
      );

      if (!element) {
        return {
          success: false,
          error: "element not found",
        };
      }

      element.width = Math.max(
        40,
        args.width
      );

      element.height = Math.max(
        30,
        args.height
      );

      const position = clampPosition(
        element.x,
        element.y,
        element.width,
        element.height
      );

      element.x = position.x;
      element.y = position.y;

      return {
        success: true,
        element_id: element.id,
      };
    }

    case "reorder_elements": {
      const slide = findSlide(
        deck,
        args.slide_id
      );

      if (!slide) {
        return {
          success: false,
          error: "slide not found",
        };
      }

      const index =
        slide.elementIds.indexOf(
          args.element_id
        );

      if (index === -1) {
        return {
          success: false,
          error: "element not found",
        };
      }

      slide.elementIds.splice(index, 1);

      const targetIndex = Math.max(
        0,
        Math.min(
          slide.elementIds.length,
          args.z_index
        )
      );

      slide.elementIds.splice(
        targetIndex,
        0,
        args.element_id
      );

      slide.elementIds.forEach(
        (id, i) => {
          if (slide.elements[id]) {
            slide.elements[id].zIndex =
              i + 1;
          }
        }
      );

      return {
        success: true,
        element_id: args.element_id,
        z_index: targetIndex,
      };
    }

    case "add_chart": {
      const slide = findSlide(
        deck,
        args.slide_id
      );

      if (!slide) {
        return {
          success: false,
          error: "slide not found",
        };
      }

      const width = Math.max(
        200,
        args.width ?? 600
      );

      const height = Math.max(
        150,
        args.height ?? 350
      );

      const position = clampPosition(
        args.x ?? 850,
        args.y ?? 220,
        width,
        height
      );

      const chart = makeChart(
        {
          type: args.chart_type,
          title: args.title,
          categories: args.categories,
          series: args.series,
        },
        position.x,
        position.y,
        width,
        height,
        slide.elementIds.length + 1
      );

      slide.elements[chart.id] = chart;
      slide.elementIds.push(chart.id);

      return {
        success: true,
        element_id: chart.id,
        slide_id: slide.id,
      };
    }

    case "update_table_data": {
      const element = findElement(
        deck,
        args.slide_id,
        args.element_id
      );

      if (
        !element ||
        element.type !== "table" ||
        !element.payload.table
      ) {
        return {
          success: false,
          error: "table not found",
        };
      }

      if (
        !Array.isArray(args.headers) ||
        !Array.isArray(args.rows)
      ) {
        return {
          success: false,
          error: "headers and rows are required",
        };
      }

      const headers = args.headers.map((value: unknown) =>
        String(value)
      );

      const rows = args.rows.map((row: unknown) =>
        Array.isArray(row)
          ? row.map((value: unknown) => String(value))
          : []
      );

      element.payload.table.headers = headers;
      element.payload.table.rows = rows;

      return {
        success: true,
        element_id: element.id,
        headers,
        row_count: rows.length,
      };
    }

    case "update_chart_data": {
      const element = findElement(
        deck,
        args.slide_id,
        args.element_id
      );

      if (
        !element ||
        element.type !== "chart" ||
        !element.payload.chart
      ) {
        return {
          success: false,
          error: "chart not found",
        };
      }

      element.payload.chart.categories =
        args.categories;

      element.payload.chart.series =
        args.series;

      return {
        success: true,
        element_id: element.id,
      };
    }

    case "change_chart_type": {
      const element = findElement(
        deck,
        args.slide_id,
        args.element_id
      );

      if (
        !element ||
        element.type !== "chart" ||
        !element.payload.chart
      ) {
        return {
          success: false,
          error: "chart not found",
        };
      }

      element.payload.chart.type =
        args.chart_type;

      return {
        success: true,
        element_id: element.id,
        chart_type: args.chart_type,
      };
    }

    default:
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
  }
}