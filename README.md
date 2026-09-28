# Decksmith — AI Presentation Builder

A focused implementation of the Sarvam technical assignment. The architecture is intentionally centered on one canonical deck object shared by AI, chat, canvas, filmstrip, history and export.

## What is implemented

- 16:9 structured deck schema with stable slide/element IDs and absolute slide-relative bounding boxes.
- Agentic AI route using OpenAI function calling. Slide and element operations are separate tools.
- Two-phase initial generation: `plan_deck` is required before slide population.
- Targeted AI mutations: edits use `update_element`, `move_element`, `update_slide`, chart tools, etc. The API never asks the model to regenerate the whole deck.
- Canonical Zustand store. Manual canvas changes and AI changes update the same state.
- Filmstrip slide reorder, add, duplicate and delete.
- Canvas selection, pointer drag, resize, delete and double-click text editing.
- Cross-slide element movement by dragging a selected canvas element over a filmstrip thumbnail.
- Snap/clamp behavior for moved elements through 1600×900 bounds.
- Shift-click multi-select state (group movement is intentionally a small follow-up if time permits).
- Real Recharts bar, line and pie charts with editable chart data/type through the inspector.
- Editable tables through a JSON inspector.
- Unified undo/redo history for store mutations, including AI-applied mutations.
- Print-to-PDF export path with print CSS; charts, tables and positioned elements remain rendered.
- Empty AI configuration is non-fatal: manual editor still works and the chat reports that the API key is missing.

## Architecture

`Deck schema → Zustand canonical store → Canvas / Filmstrip / Inspector / Chat`

The API receives the current deck state and prompt. The model sees slide IDs, element IDs, positions, types, chart data and table data. It can only mutate the deck through defined function tools. The server applies those functions to the same deck object and returns the updated deck.

### Coordinate model

All element positions are stored in a fixed 1600×900 coordinate system. The visible canvas scales that artboard responsively, so drag and resize math is converted back into artboard coordinates. Cross-slide drops are clamped to the destination artboard.

### Drag and drop

- Filmstrip uses native drag-and-drop to reorder thumbnails.
- Canvas elements use pointer events so movement maps predictably to artboard coordinates.
- On pointer release, the destination under the pointer is detected via `data-slide-drop`. If it is another slide thumbnail, the same element ID is moved to that slide.

## Run

```bash
npm install
cp .env.example .env.local
# set OPENAI_API_KEY in .env.local
npm run dev
```

Open `http://localhost:3000`.

## Build / deploy

```bash
npm run build
npm start
```

Vercel can deploy this as a normal Next.js app. Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in project environment variables.

## Known gaps

- Native cross-slide **copy with Alt/Option** is not wired; move is implemented.
- Multi-select selection state exists, but group translation is not yet implemented.
- Image upload is represented by image elements and a fallback remote image; a local file-picker flow is a sensible next pass.
- Print-to-PDF is used instead of native PPTX export, which the assignment explicitly accepts.
- No auth or persistence, intentionally consistent with the brief's scope.


- https://openrouter.ai/workspaces/default/keys