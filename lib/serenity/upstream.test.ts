import { describe, it, expect, vi, afterEach } from "vitest";
import { normalizeNowPlaying, fetchNowPlaying } from "./upstream";

describe("normalizeNowPlaying", () => {
  it("maps upstream snake_case fields to the public shape", () => {
    const out = normalizeNowPlaying({
      station: "serenity.fm", on_air: true, show_name: "Overnight Drift",
      track: { title: "Vordhosbn", artist: "Ergo Phizmiz" },
      last_beat: "the radiator clicked", tagline: "serenity.fm",
      show_id: "overnight-drift", ts: "2026-05-30T04:21:31Z", messages_enabled: true,
    });
    expect(out).toEqual({
      ok: true, onAir: true, station: "serenity.fm", show: "Overnight Drift",
      track: { title: "Vordhosbn", artist: "Ergo Phizmiz" },
      beat: "the radiator clicked", tagline: "serenity.fm",
    });
  });
  it("tolerates missing optional fields", () => {
    expect(normalizeNowPlaying({ on_air: false })).toEqual({
      ok: true, onAir: false, station: null, show: null, track: null, beat: null, tagline: null,
    });
  });
  it("nulls a malformed track rather than failing the whole payload", () => {
    expect(normalizeNowPlaying({ on_air: true, track: { title: "x" } })).toEqual({
      ok: true, onAir: true, station: null, show: null, track: null, beat: null, tagline: null,
    });
  });
  it("returns ok:false on a non-object payload", () => {
    expect(normalizeNowPlaying(42)).toEqual({ ok: false });
    expect(normalizeNowPlaying(null)).toEqual({ ok: false });
  });
});

describe("fetchNowPlaying", () => {
  const orig = global.fetch;
  afterEach(() => { global.fetch = orig; vi.restoreAllMocks(); });

  it("returns normalized data on a 200 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ on_air: true, track: { title: "T", artist: "A" } }),
    }) as unknown as typeof fetch;
    expect(await fetchNowPlaying()).toEqual({
      ok: true, onAir: true, station: null, show: null,
      track: { title: "T", artist: "A" }, beat: null, tagline: null,
    });
  });
  it("returns ok:false on a non-2xx response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
    expect(await fetchNowPlaying()).toEqual({ ok: false });
  });
  it("returns ok:false when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    expect(await fetchNowPlaying()).toEqual({ ok: false });
  });
});
