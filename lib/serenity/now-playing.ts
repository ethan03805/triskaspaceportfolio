// client-safe: do NOT import "server-only" (used by the Serenity client component)
import { z } from "zod";

/** Live audio stream (CORS-open: access-control-allow-origin: *). Played directly by <audio>. */
export const STREAM_URL = "https://stream.underclassradio.com/stream";

/** Same-origin proxy path the client polls for now-playing data. */
export const NOW_PATH = "/api/serenity/now";

const trackSchema = z.object({ title: z.string(), artist: z.string() });

export const nowPlayingSchema = z.object({
  ok: z.literal(true),
  onAir: z.boolean(),
  station: z.string().nullable(),
  show: z.string().nullable(),
  track: trackSchema.nullable(),
  beat: z.string().nullable(),
  tagline: z.string().nullable(),
});

export const nowPlayingErrorSchema = z.object({ ok: z.literal(false) });

export const nowPlayingResultSchema = z.discriminatedUnion("ok", [
  nowPlayingSchema,
  nowPlayingErrorSchema,
]);

export type NowPlaying = z.infer<typeof nowPlayingSchema>;
export type NowPlayingResult = z.infer<typeof nowPlayingResultSchema>;
