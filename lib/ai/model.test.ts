import { describe, it, expect } from "vitest";
import { MODEL_CHAIN, modelSettings, primaryModel, REASONING_MAX_TOKENS } from "./model";
import { MAX_OUTPUT_TOKENS } from "./request";

describe("model chain", () => {
  it("defaults to Kimi K2.6 as the only model", () => {
    expect(MODEL_CHAIN[0]).toBe("moonshotai/kimi-k2.6");
    expect(MODEL_CHAIN).toHaveLength(1);
  });
});

describe("model fallback", () => {
  it("modelSettings lists the full chain for OpenRouter fallback", () => {
    expect(modelSettings().models).toEqual([...MODEL_CHAIN]);
  });
  it("primaryModel returns a model object", () => {
    expect(primaryModel()).toBeTruthy();
  });
});

describe("reasoning budget", () => {
  // Kimi K2.6 is a reasoning model: left unbounded it spends the whole output
  // budget on reasoning tokens and never emits visible text or tool calls
  // (finishReason "length", a blank reply). The `effort` knob does not reliably
  // bound it on the rich prompt, so reasoning is HARD-capped by token count.
  it("hard-caps reasoning tokens so it cannot consume the whole budget", () => {
    expect(modelSettings().reasoning).toEqual({ max_tokens: REASONING_MAX_TOKENS });
  });

  // The whole point of the hard cap: reasoning must stop with room to spare for
  // the visible answer and tool calls, so the reasoning cap stays below the
  // total output cap. If this inverts, openings can blank out again.
  it("keeps the reasoning cap below the total output cap", () => {
    expect(REASONING_MAX_TOKENS).toBeLessThan(MAX_OUTPUT_TOKENS);
  });

  // OpenRouter's default routing can land on a Kimi K2.6 endpoint that is an
  // order of magnitude slower; throughput routing keeps the opening snappy.
  it("routes to the fastest endpoint by throughput", () => {
    expect(modelSettings().provider).toEqual({ sort: "throughput" });
  });
});
