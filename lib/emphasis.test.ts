import { describe, it, expect } from "vitest";
import { matchesEmphasis } from "./emphasis";

describe("matchesEmphasis", () => {
  it("is true when empty emphasis (nothing to de-emphasize)", () => {
    expect(matchesEmphasis([], "ai-ml", "AI / ML")).toBe(true);
  });
  it("matches case-insensitively against any candidate", () => {
    expect(matchesEmphasis(["AI"], "ai-ml", "AI / ML")).toBe(true);
    expect(matchesEmphasis(["python"], "languages", "Python", "SQL")).toBe(true);
  });
  it("matches on substring within a candidate", () => {
    expect(matchesEmphasis(["aero"], "ng", "aerospace")).toBe(true);
  });
  it("is false when no candidate matches a non-empty emphasis", () => {
    expect(matchesEmphasis(["security"], "tooling", "Git", "Tableau")).toBe(false);
  });
  it("ignores blank emphasis entries", () => {
    expect(matchesEmphasis(["", "   "], "tooling", "Git")).toBe(true);
  });
});
