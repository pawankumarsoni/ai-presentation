import { Deck } from "@/types/deck";
import { Element } from "./Element";

export function PrintDeck({ deck }: { deck: Deck }) {
  return (
    <div className="print-deck">
      {deck.slides.map((slide) => (
        <section className="print-slide" key={slide.id}>
          <div
            className="print-canvas"
            style={{
              width: 1600,
              height: 900,
              position: "relative",
              overflow: "hidden",
              background: slide.background || "#ffffff",
            }}
          >
            {slide.elementIds.map((id) => {
              const element = slide.elements[id];

              if (!element) return null;

              return (
                <Element
                  key={id}
                  e={element}
                  slide={slide}
                  selected={false}
                  onSelect={() => {}}
                  onDragStart={() => {}}
                  onResizeStart={() => {}}
                  onDelete={() => {}}
                  onDuplicate={() => {}}
                  onBringForward={() => {}}
                  onSendBackward={() => {}}
                  onEditText={() => {}}
                  onStartEdit={() => {}}
                  onEndEdit={() => {}}
                  editing={false}
                  onEditTableCell={() => {}}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}