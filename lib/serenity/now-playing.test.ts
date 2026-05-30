import { describe, it, expect } from "vitest";
import { STREAM_URL, NOW_PATH, nowPlayingResultSchema } from "./now-playing";

describe("serenity now-playing contract", () => {
  it("exposes the live stream URL and the same-origin proxy path", () => {
    expect(STREAM_URL).toBe("https://stream.underclassradio.com/stream");
    expect(NOW_PATH).toBe("/api/serenity/now");
  });
  it("parses a live payload", () => {
    const r = nowPlayingResultSchema.parse({
      ok: true, onAir: true, station: "serenity.fm", show: "Overnight Drift",
      track: { title: "T", artist: "A" }, beat: "b", tagline: "tag",
    });
    expect(r.ok).toBe(true);
  });
  it("parses an error payload", () => {
    expect(nowPlayingResultSchema.parse({ ok: false }).ok).toBe(false);
  });
  it("rejects a payload missing the ok discriminant", () => {
    expect(() => nowPlayingResultSchema.parse({ onAir: true })).toThrow();
  });
});
