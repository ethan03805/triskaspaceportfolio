import { fetchNowPlaying } from "@/lib/serenity/upstream";
import { type NowPlayingResult } from "@/lib/serenity/now-playing";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const TTL_MS = 15_000;
let cache: { at: number; data: NowPlayingResult } | null = null;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return Response.json(cache.data, { headers: { "cache-control": "no-store" } });
  }
  const data = await fetchNowPlaying();
  if (data.ok) cache = { at: now, data }; // never cache a failure
  return Response.json(data, { headers: { "cache-control": "no-store" } });
}
