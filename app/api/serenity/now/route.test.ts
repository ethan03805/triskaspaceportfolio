import { describe, it, expect, vi, beforeEach } from "vitest";

const { fetchNowPlaying } = vi.hoisted(() => ({ fetchNowPlaying: vi.fn() }));
vi.mock("@/lib/serenity/upstream", () => ({ fetchNowPlaying }));

describe("GET /api/serenity/now", () => {
  beforeEach(() => {
    vi.resetModules();     // fresh module-level cache per test
    fetchNowPlaying.mockReset();
  });

  it("returns the now-playing JSON and caches within the TTL", async () => {
    fetchNowPlaying.mockResolvedValue({
      ok: true, onAir: true, station: "serenity.fm", show: "Overnight Drift",
      track: { title: "T", artist: "A" }, beat: "b", tagline: "tag",
    });
    const { GET } = await import("./route");

    const res1 = await GET();
    const body1 = await res1.json();
    expect(body1.ok).toBe(true);
    expect(body1.track.title).toBe("T");

    const res2 = await GET();
    await res2.json();
    expect(fetchNowPlaying).toHaveBeenCalledTimes(1); // second call served from cache
  });

  it("returns ok:false when the upstream is unreachable and does not cache it", async () => {
    fetchNowPlaying.mockResolvedValue({ ok: false });
    const { GET } = await import("./route");

    const res1 = await GET();
    expect((await res1.json()).ok).toBe(false);
    await GET();
    expect(fetchNowPlaying).toHaveBeenCalledTimes(2); // failures are re-fetched, not cached
  });
});
