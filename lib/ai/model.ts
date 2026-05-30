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
 *
 * `reasoning.max_tokens` HARD-caps Kimi K2.6's reasoning. This must be a hard
 * cap, not `effort`: the `effort` knob barely bounds Kimi on this rich prompt,
 * so verbose personas (e.g. a hiring manager) reason past the whole output
 * budget and the reply finishes with "length" before any visible text or tool
 * call (a blank opening). A hard token cap forces the model to stop reasoning
 * and produce the answer, with REASONING_MAX_TOKENS < MAX_OUTPUT_TOKENS so the
 * answer always has room. Reasoning stays ON (a small budget) because with it
 * fully OFF the model loops and re-emits the opening until the step cap.
 *
 * `provider.sort: "throughput"` routes to the fastest Kimi K2.6 endpoint.
 * OpenRouter's default routing can land on an endpoint that is an order of
 * magnitude slower, which is what made the reasoning-heavy opening crawl.
 */
export const REASONING_MAX_TOKENS = 1024;

export function modelSettings(): {
  models: string[];
  reasoning: { max_tokens: number };
  provider: { sort: "throughput" };
} {
  return {
    models: [...MODEL_CHAIN],
    reasoning: { max_tokens: REASONING_MAX_TOKENS },
    provider: { sort: "throughput" },
  };
}

/** The model to use for chat: primary slug + the full chain as OpenRouter fallback routing. */
export function primaryModel() {
  return openrouter()(MODEL_CHAIN[0], modelSettings());
}
