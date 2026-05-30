import { describe, it, expect } from "vitest";
import { isOpeningComplete, latestDirections } from "./transcript";

describe("isOpeningComplete", () => {
  it("is false while the opening is in flight or before any message", () => {
    expect(isOpeningComplete("submitted", [])).toBe(false);
    expect(isOpeningComplete("streaming", [{ role: "user" }])).toBe(false);
    expect(isOpeningComplete("ready", [])).toBe(false);
  });
  it("is true once the stream is idle and a turn has happened", () => {
    expect(isOpeningComplete("ready", [{ role: "user" }, { role: "assistant" }])).toBe(true);
  });
  it("is true on error so the visitor can still type", () => {
    expect(isOpeningComplete("error", [{ role: "user" }])).toBe(true);
  });
});

describe("latestDirections", () => {
  const dir = (ds: string[]) => ({
    type: "tool-suggestDirections", state: "output-available", output: { directions: ds },
  });
  it("returns directions from the most recent assistant message that proposed any", () => {
    const messages = [
      { role: "assistant", parts: [dir(["a", "b"])] },
      { role: "user", parts: [{ type: "text", text: "hi" }] },
      { role: "assistant", parts: [{ type: "text", text: "ok" }, dir(["c", "d", "e"])] },
    ];
    expect(latestDirections(messages)).toEqual(["c", "d", "e"]);
  });
  it("returns [] when no assistant message proposed directions", () => {
    expect(latestDirections([{ role: "assistant", parts: [{ type: "text", text: "hi" }] }])).toEqual([]);
    expect(latestDirections([])).toEqual([]);
  });
  it("ignores a directions part that is not output-available", () => {
    expect(latestDirections([
      { role: "assistant", parts: [{ type: "tool-suggestDirections", state: "input-available" }] },
    ])).toEqual([]);
  });
});
