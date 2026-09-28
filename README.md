# Decksmith full replacement files

Replace the corresponding files in the project with these files.

Included:
- components/PresentationBuilder.tsx
- components/Element.tsx
- components/Filmstrip.tsx
- components/Canvas.tsx
- components/Chat.tsx
- components/Inspector.tsx
- components/ChartView.tsx
- lib/store.ts
- lib/ai-tools.ts
- app/api/ai/route.ts
- types/deck.ts
- app/globals.css

Keep your existing components/SlidePreview.tsx because it was not present in the uploaded source bundle.

Main fixes:
1. Frontend now correctly consumes the Gemini SSE response.
2. AI gets the latest canonical deck plus recent chat history.
3. AI tool mutations stream to the canvas without creating one undo entry per tool.
4. The complete AI operation creates one undo entry.
5. Initial generation is distinguished from later surgical edits.
6. Manual cross-slide move works with stable IDs.
7. Alt-drag copies an element to another slide with a new ID while preserving the source.
8. AI move_element supports copy=true.
9. Gemini defaults to gemini-2.5-flash-lite and falls back to it when the preferred model is temporarily unavailable/high-demand.
10. plan_deck tracking uses the actual `planned: true` result.
