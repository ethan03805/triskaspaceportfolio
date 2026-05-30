import { describe, it, expect } from "vitest";
import { buildModelParams, capMessages, MAX_OUTPUT_TOKENS, MAX_INPUT_CHARS } from "./request";

describe("request builder", () => {
  it("always sets maxOutputTokens", () => {
    expect(buildModelParams().maxOutputTokens).toBe(MAX_OUTPUT_TOKENS);
  });
  it("caps message count and truncates over-long input", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ role: "user", content: "x".repeat(5000), id: String(i) }));
    const capped = capMessages(many as never);
    expect(capped.length).toBeLessThanOrEqual(20);
    for (const m of capped) expect(JSON.stringify(m).length).toBeLessThanOrEqual(MAX_INPUT_CHARS + 200);
  });
});
