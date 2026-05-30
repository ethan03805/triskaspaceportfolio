import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { openrouter, MODEL_CHAIN } from "@/lib/ai/model";
import { composeSystemPrompt } from "@/lib/ai/system-prompt";
import { buildTools } from "@/lib/ai/tools";
import { buildModelParams, capMessages } from "@/lib/ai/request";
import { InMemoryRateLimiter } from "@/lib/protection/rate-limiter";
import { type PersonaRole } from "@/lib/persona";

export const maxDuration = 30;
const limiter = new InMemoryRateLimiter({ max: 30, windowMs: 60_000 });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const gate = await limiter.check(ip);
  if (!gate.ok) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((gate.retryAfterMs ?? 60_000) / 1000)) },
    });
  }

  const body = (await req.json()) as {
    messages: UIMessage[];
    persona?: { role: PersonaRole; text: string | null };
  };
  const persona = body.persona ?? { role: "curious" as const, text: null };
  const messages = capMessages<UIMessage>(body.messages);
  // v6: convertToModelMessages is async (returns Promise<ModelMessage[]>).
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openrouter()(MODEL_CHAIN[0]),
    system: composeSystemPrompt(persona),
    messages: modelMessages,
    tools: buildTools(),
    stopWhen: stepCountIs(5),
    ...buildModelParams(),
  });

  return result.toUIMessageStreamResponse();
}
