import OpenAI from "openai";
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
4. New presentation / "create a deck": you MUST call plan_deck first. plan_deck replaces the slide list with empty outlined slides and returns their IDs. Then populate those existing slides with add_element / add_chart. Do not add_slide for slides that plan_deck already created.
5. Edits: never call plan_deck. Patch with update_element, update_slide, move_element, add_chart, etc.
6. Use real charts and tables when asked.
7. Do not delete and recreate an element just to edit its text.
8. Never invent IDs. Use IDs from the current deck context.
9. If the request is already satisfied, stop and respond briefly.
10. Keep layouts visually balanced inside 1600x900.
`;

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured. Add it to .env.local.");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
}

function normalizeTools(rawTools: any[]): any[] {
  return rawTools.map((tool: any) => {
    if (tool?.type === "function" && tool?.function && typeof tool.function === "object") {
      return tool;
    }
    if (tool?.type === "function" && tool?.name) {
      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description || "",
          parameters: tool.parameters || { type: "object", properties: {} },
        },
      };
    }
    return tool;
  });
}

function sse(controller: ReadableStreamDefaultController, encoder: TextEncoder, payload: unknown) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const deck: Deck = body.deck;
    const prompt: string = body.prompt;
    const mode: "generate" | "edit" = body.mode || "edit";
    const history: { role: "user" | "assistant"; text: string }[] = body.history || [];

    if (!deck) {
      return Response.json({ error: "Deck is required." }, { status: 400 });
    }
    if (!prompt) {
      return Response.json({ error: "Prompt is required." }, { status: 400 });
    }
    if (!process.env.OPENROUTER_API_KEY) {
      return Response.json(
        { error: "OPENROUTER_API_KEY is not configured. Add your OpenRouter API key to .env.local." },
        { status: 503 },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const client = getClient();
          const model = process.env.OPENROUTER_MODEL || "openrouter/free";
          const chatTools = normalizeTools(tools as any[]);
          const recent = history.slice(-8).map((m) => `${m.role}: ${m.text}`).join("\n");

          const messages: any[] = [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: `Current deck:\n\n${deckContext(deck)}\n\nRecent conversation:\n${recent || "(none)"}\n\nUser request:\n${prompt}\n\nMode: ${mode}\n${
                mode === "generate"
                  ? "This is initial generation. Call plan_deck first, then populate the returned slide IDs."
                  : "This is an edit. Do not call plan_deck. Patch only what the user asked for."
              }`,
            },
          ];

          const maxTurns = mode === "generate" ? 30 : 15;
          const applied: any[] = [];
          let planned = false;

          for (let turn = 0; turn < maxTurns; turn++) {
            const response = await client.chat.completions.create({
              model,
              messages,
              tools: chatTools,
              tool_choice:
                mode === "generate" && !planned
                  ? { type: "function", function: { name: "plan_deck" } }
                  : "auto",
            });

            const message = response.choices?.[0]?.message;
            if (!message) {
              sse(controller, encoder, { type: "error", error: "The AI returned an empty response." });
              break;
            }

            if (!message.tool_calls || message.tool_calls.length === 0) {
              sse(controller, encoder, {
                type: "done",
                message: message.content || "Done",
                deck,
                applied,
              });
              break;
            }

            messages.push({
              role: "assistant",
              content: message.content || null,
              tool_calls: message.tool_calls,
            });

            for (const call of message.tool_calls) {
              if (call.type !== "function") continue;
              const toolName = call.function.name;
              if (mode === "edit" && toolName === "plan_deck") {
                const blocked = { success: false, error: "plan_deck is not allowed during edits." };
                applied.push({ tool: toolName, args: {}, result: blocked });
                messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(blocked) });
                continue;
              }

              let args: any = {};
              try {
                args = JSON.parse(call.function.arguments || "{}");
              } catch {
                args = {};
              }

              let result: any;
              try {
                result = applyTool(deck, toolName, args);
              } catch (error: any) {
                result = { success: false, error: error?.message || `Tool ${toolName} failed` };
              }

              if (toolName === "plan_deck") planned = true;

              applied.push({ tool: toolName, args, result });
              messages.push({
                role: "tool",
                tool_call_id: call.id,
                content: JSON.stringify(result),
              });

              sse(controller, encoder, {
                type: "tool",
                tool: toolName,
                result,
                deck: structuredClone(deck),
                applied,
              });
            }

            messages.push({
              role: "user",
              content: `Updated canonical deck after the latest tool calls:\n\n${deckContext(deck)}\n\nContinue only if more mutations are required. Do not regenerate unchanged slides or elements.`,
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
            error: error?.message || "AI request failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || "AI request failed" }, { status: 500 });
  }
}
