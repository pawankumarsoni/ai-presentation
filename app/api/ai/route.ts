import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";
import { tools, deckContext, applyTool } from "@/lib/ai-tools";
import { Deck } from "@/types/deck";

const SYSTEM = `
You are the agentic editing engine for Decksmith, an AI presentation builder.

The canvas is 1600x900 (16:9). You operate only through tools.

RULES:
1. Never regenerate or replace the entire deck during an edit. Use surgical tools.
2. Preserve stable slide IDs and element IDs unless plan_deck is required.
3. Preserve manual user changes.
4. New presentation / "create a deck": you MUST call plan_deck first.
5. plan_deck creates the requested empty slide structure and returns their IDs.
6. After plan_deck, populate those existing slides with add_element / add_chart.
7. Do not call add_slide for slides that plan_deck already created.
8. Edits: never call plan_deck.
9. Patch only what the user asked for.
10. Use real charts and tables when asked.
11. Do not delete and recreate an element just to edit its text.
12. Never invent IDs. Use IDs from the current deck context.
13. When the user asks to move an existing element to another slide, ALWAYS move the existing element.
14. NEVER create a new slide to satisfy a move request.
15. A destination slide must already exist.
16. Preserve every existing element on the destination slide.
17. Do not move, delete, replace, or regenerate destination elements to make room.
18. When moving an element, use the move_element tool.
19. If the request is already satisfied, stop and respond briefly.
20. Keep layouts visually balanced inside 1600x900.
21. The current deck context is the canonical source of truth.
`;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it to .env.local.",
    );
  }

  return new GoogleGenAI({
    apiKey,
  });
}

/**
 * Convert the existing OpenAI-style tool definitions
 * from lib/ai-tools.ts into Gemini function declarations.
 *
 * Existing format:
 *
 * {
 *   type: "function",
 *   function: {
 *     name,
 *     description,
 *     parameters
 *   }
 * }
 *
 * Gemini format:
 *
 * {
 *   name,
 *   description,
 *   parametersJsonSchema
 * }
 */
function normalizeGeminiTools(rawTools: any[]) {
  return rawTools
    .map((tool: any) => {
      if (
        tool?.type === "function" &&
        tool?.function &&
        typeof tool.function === "object"
      ) {
        return {
          name: tool.function.name,
          description: tool.function.description || "",
          parametersJsonSchema:
            tool.function.parameters || {
              type: "object",
              properties: {},
            },
        };
      }

      if (tool?.type === "function" && tool?.name) {
        return {
          name: tool.name,
          description: tool.description || "",
          parametersJsonSchema:
            tool.parameters || {
              type: "object",
              properties: {},
            },
        };
      }

      if (tool?.name) {
        return {
          name: tool.name,
          description: tool.description || "",
          parametersJsonSchema:
            tool.parameters || {
              type: "object",
              properties: {},
            },
        };
      }

      return null;
    })
    .filter(Boolean);
}

function sse(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  payload: unknown,
) {
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
  );
}

function explicitlyRequestsNewSlide(prompt: string) {
  return (
    /\b(add|create|insert|new|another)\b[\s\S]{0,50}\bslide\b/i.test(
      prompt,
    ) ||
    /\bslide\b[\s\S]{0,50}\b(add|create|insert|new|another)\b/i.test(
      prompt,
    )
  );
}

function hasMoveIntent(prompt: string) {
  return /\b(move|transfer|relocate|drag|place)\b/i.test(prompt);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const deck: Deck = body.deck;
    const prompt: string = body.prompt;
    const mode: "generate" | "edit" = body.mode || "edit";

    const history: {
      role: "user" | "assistant";
      text: string;
    }[] = body.history || [];

    if (!deck) {
      return Response.json(
        { error: "Deck is required." },
        { status: 400 },
      );
    }

    if (!prompt) {
      return Response.json(
        { error: "Prompt is required." },
        { status: 400 },
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY is not configured. Add your Gemini API key to .env.local.",
        },
        { status: 503 },
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const client = getClient();

          const model =
            process.env.GEMINI_MODEL || "gemini-2.5-flash";

          const functionDeclarations = normalizeGeminiTools(
            tools as any[],
          );

          const recent = history
            .slice(-8)
            .map((m) => `${m.role}: ${m.text}`)
            .join("\n");

          /**
           * Gemini conversation history.
           *
           * We keep the model/tool interaction history explicitly
           * because every tool result must be sent back to Gemini
           * before it decides the next mutation.
           */
          const contents: any[] = [
            {
              role: "user",
              parts: [
                {
                  text: `
${SYSTEM}

Current deck:

${deckContext(deck)}

Recent conversation:
${recent || "(none)"}

User request:
${prompt}

Mode:
${mode}

${
  mode === "generate"
    ? "This is initial generation. Call plan_deck first, then populate the returned slide IDs."
    : "This is an edit. Do not call plan_deck. Patch only what the user asked for."
}
`,
                },
              ],
            },
          ];

          const maxTurns = mode === "generate" ? 30 : 15;

          const applied: any[] = [];

          let planned = false;

          for (let turn = 0; turn < maxTurns; turn++) {
            const config: any = {
              systemInstruction: SYSTEM,

              tools: [
                {
                  functionDeclarations,
                },
              ],
            };

            /**
             * During first generation force plan_deck.
             *
             * Gemini's function calling configuration supports
             * restricting allowed function names.
             */
            if (mode === "generate" && !planned) {
              config.toolConfig = {
                functionCallingConfig: {
                  mode: "ANY",
                  allowedFunctionNames: ["plan_deck"],
                },
              };
            }

            const response = await client.models.generateContent({
              model,
              contents,
              config,
            });

            const candidate = response.candidates?.[0];

            if (!candidate) {
              sse(controller, encoder, {
                type: "error",
                error: "The AI returned no candidate response.",
              });
              break;
            }

            const parts = candidate.content?.parts || [];

            const functionCalls = parts.filter(
              (part: any) => part.functionCall,
            );

            /**
             * No tool call means Gemini has finished reasoning.
             */
            if (functionCalls.length === 0) {
              const text =
                response.text ||
                "Applied the requested changes.";

              sse(controller, encoder, {
                type: "done",
                message: text,
                deck,
                applied,
              });

              break;
            }

            /**
             * Preserve Gemini's model response before sending
             * function results back.
             */
            contents.push(candidate.content);

            for (const part of functionCalls) {
              const functionCall = part.functionCall;

              if (!functionCall?.name) {
                continue;
              }

              const toolName = functionCall.name;
              const args = functionCall.args || {};

              /**
               * Safety guard:
               *
               * If the user asked to move something, do not allow
               * Gemini to accidentally create a new slide.
               */
              if (
                mode === "edit" &&
                toolName === "add_slide" &&
                hasMoveIntent(prompt) &&
                !explicitlyRequestsNewSlide(prompt)
              ) {
                const blocked = {
                  success: false,
                  error:
                    "This is a move request. Do not create a new slide. Move the existing element to the existing destination slide.",
                };

                applied.push({
                  tool: toolName,
                  args,
                  result: blocked,
                });

                contents.push({
                  role: "user",
                  parts: [
                    {
                      functionResponse: {
                        name: toolName,
                        response: blocked,
                      },
                    },
                  ],
                });

                sse(controller, encoder, {
                  type: "tool",
                  tool: toolName,
                  result: blocked,
                  deck: structuredClone(deck),
                  applied,
                });

                continue;
              }

              if (
                mode === "edit" &&
                toolName === "plan_deck"
              ) {
                const blocked = {
                  success: false,
                  error:
                    "plan_deck is not allowed during edits. Use surgical editing tools.",
                };

                applied.push({
                  tool: toolName,
                  args,
                  result: blocked,
                });

                contents.push({
                  role: "user",
                  parts: [
                    {
                      functionResponse: {
                        name: toolName,
                        response: blocked,
                      },
                    },
                  ],
                });

                sse(controller, encoder, {
                  type: "tool",
                  tool: toolName,
                  result: blocked,
                  deck: structuredClone(deck),
                  applied,
                });

                continue;
              }

              let result: any;

              try {
                result = applyTool(
                  deck,
                  toolName,
                  args,
                );
              } catch (error: any) {
                result = {
                  success: false,
                  error:
                    error?.message ||
                    `Tool ${toolName} failed`,
                };
              }

              if (toolName === "plan_deck" && result?.success) {
                planned = true;
              }

              applied.push({
                tool: toolName,
                args,
                result,
              });

              /**
               * Send the actual tool result back to Gemini.
               */
              contents.push({
                role: "user",
                parts: [
                  {
                    functionResponse: {
                      name: toolName,
                      response: result,
                    },
                  },
                ],
              });

              /**
               * Send intermediate tool state to the frontend.
               */
              sse(controller, encoder, {
                type: "tool",
                tool: toolName,
                result,
                deck: structuredClone(deck),
                applied,
              });
            }

            /**
             * Give Gemini the updated canonical deck.
             *
             * This is important for chained operations such as:
             *
             * plan_deck
             *   ↓
             * add_slide/content
             *   ↓
             * add_chart
             *   ↓
             * update chart
             *
             * or:
             *
             * move chart
             *   ↓
             * inspect updated destination
             *   ↓
             * continue
             */
            contents.push({
              role: "user",
              parts: [
                {
                  text: `
Updated canonical deck after the latest tool calls:

${deckContext(deck)}

Continue only if more mutations are required.

Do not regenerate unchanged slides or elements.
Do not create a slide for an element movement.
Preserve all existing destination elements.
`,
                },
              ],
            });

            if (turn === maxTurns - 1) {
              sse(controller, encoder, {
                type: "done",
                message: "Applied the requested changes.",
                deck,
                applied,
              });
            }
          }
        } catch (error: any) {
          sse(controller, encoder, {
            type: "error",
            error:
              error?.message ||
              "Gemini request failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":
          "text/event-stream; charset=utf-8",
        "Cache-Control":
          "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error?.message ||
          "AI request failed",
      },
      { status: 500 },
    );
  }
}