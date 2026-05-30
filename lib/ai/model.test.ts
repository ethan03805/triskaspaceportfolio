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
