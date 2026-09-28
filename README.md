# Decksmith — AI Presentation Builder

An AI-powered presentation builder that combines conversational slide generation with a free-form canvas editor.

The product supports:

- AI-generated presentations from natural-language prompts
- Conversational refinement using tool/function calling
- Structured slide and element schemas
- Manual canvas editing
- Drag, resize, duplicate and delete
- Multi-select and group movement
- Slide reordering
- Cross-slide element movement
- Charts, tables, images, text and shapes
- Undo / redo
- Streaming AI responses
- Print-to-PDF export

## Live Demo

https://ai-presentation-delta.vercel.app

## Tech Stack

- Next.js
- React
- TypeScript
- Zustand
- Google Gemini
- Recharts
- Vercel

---

# Features

## AI Presentation Generation

Users can describe a presentation using natural language.

Example:

> Create a 5-slide presentation about our Q3 product roadmap with a summary, milestones, metrics and risks.

The AI creates a structured presentation using the deck's slide and element schema.

The generation flow uses a two-phase approach:

1. `plan_deck` creates the slide structure.
2. Element-level tools populate the planned slides.

This avoids generating the entire presentation as an unstructured LLM response.

---

## Conversational Editing

The AI can modify the existing presentation using targeted tool calls.

Examples:

- Rewrite a slide
- Make content more concise
- Add or remove a slide
- Change slide titles
- Add a chart
- Update chart data
- Change chart type
- Update table data
- Move an element to another slide
- Reorder slides

AI edits operate on the existing canonical deck instead of replacing the entire presentation.

This allows manual edits and AI edits to coexist.

---

# Architecture

The application is built around a single canonical `Deck` object.

```text
                    ┌─────────────────┐
                    │   User Prompt   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   AI / Gemini   │
                    └────────┬────────┘
                             │
                    Function / Tool Calls
                             │
                             ▼
                    ┌─────────────────┐
                    │  applyTool()    │
                    │                 │
                    │ add_slide       │
                    │ update_slide    │
                    │ add_element     │
                    │ move_element    │
                    │ add_chart       │
                    │ update_table    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Canonical Deck  │
                    │     Store       │
                    │    Zustand      │
                    └───────┬─────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
           Canvas       Filmstrip       Chat
              │
              ▼
          Export / PDF