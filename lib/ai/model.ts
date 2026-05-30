import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * The OpenRouter model slug used for chat.
 *
 * Single-model by product decision: Kimi K2.6 only, no fallback chain. Kept as
 * a one-element array so the request layer and any future re-expansion stay
 * unchanged. The slug is confirmed-at-deploy.
 */
export const MODEL_CHAIN = ["moonshotai/kimi-k2.6"] as const;

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

/**
 * OpenRouter chat settings. With a single model this carries just that slug;
 * the `models` array stays so re-introducing fallback later is a one-line change.
 */
export function modelSettings(): { models: string[] } {
  return { models: [...MODEL_CHAIN] };
}

/** The model to use for chat: primary slug + the full chain as OpenRouter fallback routing. */
export function primaryModel() {
  return openrouter()(MODEL_CHAIN[0], modelSettings());
}
