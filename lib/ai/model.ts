import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Ordered fallback chain of OpenRouter model slugs.
 *
 * The first entry is the default; subsequent entries are tried in order when
 * an upstream model errors or is unavailable. These slugs are provisional and
 * confirmed-at-deploy.
 */
export const MODEL_CHAIN = [
  "moonshotai/kimi-k2.6",
  "anthropic/claude-sonnet-4.6",
  "google/gemini-3-pro-preview",
] as const;

/**
 * Construct an OpenRouter provider instance.
 *
 * Construction is synchronous and lazy: it does not perform any network call,
 * so it imports cleanly under Vitest even with an empty API key. The key is
 * read at call time from the environment.
 *
 * In the v2 @openrouter/ai-sdk-provider API the returned provider is callable
 * directly to obtain a language model, e.g. `openrouter()("moonshotai/kimi-k2.6")`
 * (equivalently `.chat(slug)` / `.languageModel(slug)`).
 */
export function openrouter() {
  return createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY ?? "" });
}
