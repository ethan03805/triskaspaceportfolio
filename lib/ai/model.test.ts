import { describe, it, expect } from "vitest";
import { MODEL_CHAIN, modelSettings, primaryModel } from "./model";

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
  // budget on reasoning tokens and never emits visible text or tool calls.
  // Bounding reasoning to low effort keeps it from dominating the budget.
  it("bounds reasoning to low effort so it cannot consume the whole budget", () => {
    expect(modelSettings().reasoning).toEqual({ effort: "low" });
  });
});
