import "server-only";
import { z } from "zod";
import { type NowPlayingResult } from "./now-playing";

const UPSTREAM_URL = "https://api.underclassradio.com/api/now";
const TIMEOUT_MS = 4000;

const trackSchema = z.object({ title: z.string(), artist: z.string() });

// Lenient: a bad scalar/track field degrades to null instead of failing the whole payload.
// A non-object payload (number, string, null) fails the object parse and yields ok:false.
const upstreamSchema = z.object({
  station: z.string().nullable().optional().catch(null),
  on_air: z.boolean().nullable().optional().catch(false),
  show_name: z.string().nullable().optional().catch(null),
  track: trackSchema.nullable().optional().catch(null),
  last_beat: z.string().nullable().optional().catch(null),
  tagline: z.string().nullable().optional().catch(null),
});

export function normalizeNowPlaying(raw: unknown): NowPlayingResult {
  const parsed = upstreamSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const d = parsed.data;
  return {
    ok: true,
    onAir: d.on_air ?? false,
    station: d.station ?? null,
    show: d.show_name ?? null,
    track: d.track ?? null,
    beat: d.last_beat ?? null,
    tagline: d.tagline ?? null,
  };
}

export async function fetchNowPlaying(): Promise<NowPlayingResult> {
  try {
    const res = await fetch(UPSTREAM_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { ok: false };
    return normalizeNowPlaying(await res.json());
  } catch {
    return { ok: false };
  }
}
