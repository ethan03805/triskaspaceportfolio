import { describe, it, expect } from "vitest";
import { isLeakedToolIntent } from "./leak-detect";

describe("isLeakedToolIntent", () => {
  it("is false for normal prose", () => {
    expect(isLeakedToolIntent("Ethan built Serenity Radio, a live station.")).toBe(false);
    expect(isLeakedToolIntent("Here is the project you asked about:")).toBe(false);
    expect(isLeakedToolIntent("")).toBe(false);
  });
  it("is true for a raw JSON tool-args blob", () => {
    expect(isLeakedToolIntent('{"id":"serenity","emphasis":[]}')).toBe(true);
    expect(isLeakedToolIntent('  {"id":"axiom"}  ')).toBe(true);
  });
  it("is true for function-call style and tool tags", () => {
    expect(isLeakedToolIntent('showProject({ id: "axiom" })')).toBe(true);
    expect(isLeakedToolIntent("<tool_call>showProject</tool_call>")).toBe(true);
  });
  it("does not flag prose that merely contains a brace mid-sentence", () => {
    expect(isLeakedToolIntent("I think {this} idea is great.")).toBe(false);
  });
});
