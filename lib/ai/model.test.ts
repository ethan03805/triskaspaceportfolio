import { describe, it, expect } from "vitest";
import { MODEL_CHAIN } from "./model";

describe("model chain", () => {
  it("defaults to Kimi K2.6 then falls back", () => {
    expect(MODEL_CHAIN[0]).toBe("moonshotai/kimi-k2.6");
    expect(MODEL_CHAIN).toContain("anthropic/claude-sonnet-4.6");
    expect(MODEL_CHAIN.length).toBeGreaterThanOrEqual(3);
  });
});
