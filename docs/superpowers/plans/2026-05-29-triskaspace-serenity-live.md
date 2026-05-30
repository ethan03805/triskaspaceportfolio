# triskaspace Serenity Live Implementation Plan (Plan 4 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Serenity Radio a live component (spec §5.2): show the real current track / artist / show pulled from the station, an on-air pulse and equalizer tied to playback, and an on-site play/pause player that streams the live station, degrading gracefully to static project info when the station is unreachable.

**Architecture:** The station's now-playing JSON (`https://api.underclassradio.com/api/now`) is **CORS-locked to `https://underclassradio.com`**, so the browser cannot read it cross-origin. A same-origin Next.js route handler (`app/api/serenity/now`) fetches it server-side (CORS is browser-enforced only; server-to-server returns the body) and short-caches it (~15s). The live audio stream (`https://stream.underclassradio.com/stream`, `audio/mpeg` 192 kbps) is **CORS-open** (`access-control-allow-origin: *`), so the `<audio>` element plays it **directly** rather than relaying a 24/7 stream through a serverless function. A new `showSerenity` tool returns the static public project; the `SerenityComponent` adds the live layer client-side (polls the proxy, controls the audio element).

**Tech Stack:** Same as Plans 1–3. Next.js 16 App Router route handler, React 19 (`useEffect`/`useRef`/`useState`), Zod v4, `ai` v6 `tool()`, Vitest 3 + @testing-library/react 16 + jsdom. No new dependencies.

**Branch:** `build/serenity-live` (create off `main`). Commit locally per task; do not push (the finishing-a-development-branch wrap-up handles merge/push). Append the trailer to every commit:

```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

Ignore any unstaged `next-env.d.ts` change (Next auto-generates it; do not stage it).

**Spec:** `docs/superpowers/specs/2026-05-29-triskaspace-dynamic-portfolio-design.md` (§5.2 Serenity Radio live variant, §8.4 Serenity live proxy, §4.3 continuous micro-motion for live status, §11 autoplay policy).

---

## Decisions locked for this plan (confirmed with Ethan)

1. **Stream plays directly** from `https://stream.underclassradio.com/stream` (it is CORS-open). This is a deliberate deviation from the spec's "audio through the proxy" line: that rationale was cross-origin restriction, which does not apply to the open stream, and relaying a continuous 24/7 stream through a Vercel function is costly and hits function duration limits. The now-playing JSON **is** proxied (it is CORS-locked).
2. **Rich now-playing detail:** the component surfaces track, artist, show name, the live "last beat" vignette, the tagline, and an on-air pulse + equalizer. Refresh cadence ~15s.

## Verified facts about the upstream (probed 2026-05-30)

- `GET https://api.underclassradio.com/api/now` → `200 application/json`, body:
  ```json
  { "station": "serenity.fm", "on_air": true, "show_id": "overnight-drift",
    "show_name": "Overnight Drift",
    "track": { "title": "...", "artist": "..." },
    "last_beat": "...", "tagline": "serenity.fm ...", "ts": "...Z",
    "messages_enabled": true }
  ```
  Headers: `access-control-allow-origin: https://underclassradio.com`, `access-control-allow-methods: GET`, `vary: Origin`, `cache-control: no-store`. Backend: Caddy + Python aiohttp. A request with **no Origin header (server-side fetch) returns the full body** — CORS is browser-only, so the proxy works.
- `GET https://stream.underclassradio.com/stream` → `200 audio/mpeg`, `icy-name: serenity.fm`, `icy-br: 192`, **`access-control-allow-origin: *`**, `cache-control: no-cache, no-store`.
- The station also exposes `/messages` and `/schedule` and an `/attribution.csv`. **Out of scope** for triskaspace (those are underclassradio's own features); this plan shows now-playing + plays the stream only.

---

## File structure created/modified by this plan

```
lib/serenity/
  now-playing.ts        # NEW client-safe: STREAM_URL, NOW_PATH, public Zod schema + NowPlaying type
  now-playing.test.ts   # NEW
  upstream.ts           # NEW server-only: upstream Zod schema, normalizeNowPlaying, fetchNowPlaying
  upstream.test.ts      # NEW
app/api/serenity/now/
  route.ts              # NEW: GET proxy with ~15s in-memory TTL cache
  route.test.ts         # NEW
lib/ai/
  tools.ts              # MODIFY: add showSerenity tool
  tools.test.ts         # MODIFY: + showSerenity test
  system-prompt.ts      # MODIFY: teach showSerenity (prefer it over showProject for Serenity)
  system-prompt.test.ts # MODIFY: + assertion
components/vocabulary/
  Serenity.tsx          # NEW client: live now-playing + on-air pulse + equalizer + play/pause + graceful degrade
  Serenity.module.css   # NEW
  Serenity.test.tsx     # NEW
components/chat/
  MessagePart.tsx       # MODIFY: dispatch tool-showSerenity
  MessagePart.test.tsx  # MODIFY: + showSerenity render test
```

## Conventions for this plan

- TDD per task: write the failing test, run red, implement minimally, run green, commit.
- No em dashes in any visitor-facing copy (use periods, commas, parentheses; the ellipsis `…` and middot `·` are fine).
- Client components: `"use client"`, a client-safe `renderSchema.parse(...)` at the render boundary, no `import "server-only"`. `lib/serenity/now-playing.ts` is client-safe; `lib/serenity/upstream.ts` is server-only and must be imported only by the route.
- Design tokens only in CSS (`--bg-raised`, `--border`, `--text`, `--text-secondary`, `--text-tertiary`, `--ink`, `--onair`, `--font-mono`, `--leading-prose`).

---

## Task 1: Serenity now-playing contract (client-safe)

The shared shape the proxy returns and the component consumes, plus the two upstream URLs the client needs (the stream URL for the `<audio>` element, the proxy path for polling).

**Files:** Create `lib/serenity/now-playing.ts`, `lib/serenity/now-playing.test.ts`.

- [ ] **Step 1: Write the failing test** — `lib/serenity/now-playing.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it FAILS** — `npx vitest run lib/serenity/now-playing.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `lib/serenity/now-playing.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it PASSES** — `npx vitest run lib/serenity/now-playing.test.ts` → PASS (4 tests). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/serenity/now-playing.ts lib/serenity/now-playing.test.ts
git commit -m "feat: serenity now-playing contract (client-safe schema + urls)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Upstream fetch + normalize (server-only)

Fetch the station's now-playing JSON server-side and map it to the public `NowPlayingResult` shape, resilient to missing or malformed fields. Server-only so it never ships to the browser.

**Files:** Create `lib/serenity/upstream.ts`, `lib/serenity/upstream.test.ts`.

- [ ] **Step 1: Write the failing test** — `lib/serenity/upstream.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it FAILS** — `npx vitest run lib/serenity/upstream.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `lib/serenity/upstream.ts`**

```ts
import "server-only";
import { z } from "zod";
import { type NowPlayingResult } from "./now-playing";

const UPSTREAM_URL = "https://api.underclassradio.com/api/now";
const TIMEOUT_MS = 4000;

const trackSchema = z.object({ title: z.string(), artist: z.string() });

// Lenient: a bad scalar/track field degrades to null instead of failing the whole payload.
// A non-object payload (number, string, null) fails the object parse and yields ok:false.
const upstreamSchema = z.object({
  station: z.string().nullish().catch(null),
  on_air: z.boolean().nullish().catch(false),
  show_name: z.string().nullish().catch(null),
  track: trackSchema.nullish().catch(null),
  last_beat: z.string().nullish().catch(null),
  tagline: z.string().nullish().catch(null),
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
```

- [ ] **Step 4: Run to verify it PASSES** — `npx vitest run lib/serenity/upstream.test.ts` → PASS (7 tests). Also `npx tsc --noEmit` exit 0.

> Note on Zod v4: `z.string().nullish().catch(null)` means "string | null | undefined, and on parse failure use null". If `.nullish().catch(...)` ordering trips a v4 type error, use `z.string().nullable().optional().catch(null)`; keep the same runtime behavior and the tests must pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add lib/serenity/upstream.ts lib/serenity/upstream.test.ts
git commit -m "feat: serenity upstream fetch + resilient normalize (server-only)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Now-playing proxy route

A same-origin `GET /api/serenity/now` that returns the normalized now-playing JSON, with a ~15s in-memory TTL cache so polling clients do not hammer the upstream. Only successes are cached.

**Files:** Create `app/api/serenity/now/route.ts`, `app/api/serenity/now/route.test.ts`.

- [ ] **Step 1: Write the failing test** — `app/api/serenity/now/route.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it FAILS** — `npx vitest run app/api/serenity/now/route.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `app/api/serenity/now/route.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it PASSES** — `npx vitest run app/api/serenity/now/route.test.ts` → PASS (2 tests). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/api/serenity/now/route.ts app/api/serenity/now/route.test.ts
git commit -m "feat: serenity now-playing proxy route (15s TTL cache)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: showSerenity tool

A dedicated tool that returns the static public Serenity project. The live layer (now-playing + audio) is handled client-side by the component, so the tool only provides the project context. The privacy boundary still applies: the serenity project carries `privateNotes`, which `publicProjectSchema.parse` strips.

**Files:** Modify `lib/ai/tools.ts`, `lib/ai/tools.test.ts`.

- [ ] **Step 1: Write the failing test** — append to `lib/ai/tools.test.ts` (existing `execute!` + `InferToolOutput<Tools[...]>` idiom; `getPublicProjectById`/`publicProjectSchema` are already used in this file):

```ts
describe("showSerenity tool", () => {
  it("returns the serenity public project and never leaks private notes", async () => {
    const tools = buildTools();
    const out = (await tools.showSerenity.execute!(
      {},
      { toolCallId: "t", messages: [] },
    )) as InferToolOutput<Tools["showSerenity"]>;
    expect(out.project.id).toBe("serenity");
    expect(out.project.name).toBe("Serenity Radio");
    expect(JSON.stringify(out)).not.toContain("Cost trick");
  });
});
```

- [ ] **Step 2: Run to verify it FAILS** — `npx vitest run lib/ai/tools.test.ts` → FAIL (`showSerenity` undefined).

- [ ] **Step 3: Add `showSerenity` to `lib/ai/tools.ts`** (add to the object returned by `buildTools()`; no new imports needed):

```ts
    showSerenity: tool({
      description:
        "Render the live Serenity Radio component: the current track, on-air status, and an on-site player. Use this for Serenity Radio instead of showProject whenever the visitor asks about it or wants to listen.",
      inputSchema: z.object({}),
      execute: async () => {
        const project = getPublicProjectById("serenity");
        if (!project) throw new Error("serenity project missing");
        return { project: publicProjectSchema.parse(project) };
      },
    }),
```

- [ ] **Step 4: Run to verify it PASSES** — `npx vitest run lib/ai/tools.test.ts` → PASS. Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/tools.ts lib/ai/tools.test.ts
git commit -m "feat: showSerenity tool (static public project for the live component)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Serenity live component

The flagship live component: polls the proxy every ~15s, shows the current track / artist / show / on-air status / the "last beat" vignette, plays the live stream on a user gesture with an animated equalizer and on-air pulse, and degrades to static project info when the station is unreachable.

**Files:** Create `components/vocabulary/Serenity.tsx`, `components/vocabulary/Serenity.module.css`, `components/vocabulary/Serenity.test.tsx`.

- [ ] **Step 1: Write the failing test** — `components/vocabulary/Serenity.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SerenityComponent } from "./Serenity";

const project = {
  id: "serenity", name: "Serenity Radio", tagline: "An LLM-hosted station.",
  description: "desc here", tech: "typescript", year: "2026",
  url: "https://underclassradio.com", status: "featured" as const,
  audienceTags: [] as string[], live: { kind: "serenity" as const },
};

const live = {
  ok: true, onAir: true, station: "serenity.fm", show: "Overnight Drift",
  track: { title: "Vordhosbn", artist: "Ergo Phizmiz" },
  beat: "the radiator clicked three times", tagline: "serenity.fm tagline",
};

const fetchReturning = (payload: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => payload });

beforeEach(() => {
  // jsdom does not implement media playback
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("SerenityComponent", () => {
  it("shows the live track, artist, show, and beat after polling", async () => {
    vi.stubGlobal("fetch", fetchReturning(live));
    render(<SerenityComponent project={project} />);
    expect(await screen.findByText("Vordhosbn")).toBeInTheDocument();
    expect(screen.getByText(/Ergo Phizmiz/)).toBeInTheDocument();
    expect(screen.getByText(/Overnight Drift/)).toBeInTheDocument();
    expect(screen.getByText(/radiator clicked/)).toBeInTheDocument();
  });

  it("points the audio element at the live stream", () => {
    vi.stubGlobal("fetch", fetchReturning(live));
    const { container } = render(<SerenityComponent project={project} />);
    expect(container.querySelector("audio")).toHaveAttribute(
      "src", "https://stream.underclassradio.com/stream",
    );
  });

  it("plays then pauses the stream on the button", async () => {
    vi.stubGlobal("fetch", fetchReturning(live));
    render(<SerenityComponent project={project} />);
    const playBtn = await screen.findByRole("button", { name: /listen live/i });
    fireEvent.click(playBtn);
    await waitFor(() => expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled());
    const pauseBtn = await screen.findByRole("button", { name: /pause/i });
    fireEvent.click(pauseBtn);
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("degrades to static project info when the station is unreachable", async () => {
    vi.stubGlobal("fetch", fetchReturning({ ok: false }));
    render(<SerenityComponent project={project} />);
    expect(await screen.findByText("desc here")).toBeInTheDocument();
    expect(screen.getByText(/visit/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it FAILS** — `npx vitest run components/vocabulary/Serenity.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement `components/vocabulary/Serenity.tsx`**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Composed } from "@/components/motion/Composed";
import { renderProjectSchema, type RenderProject } from "./projectShape";
import {
  STREAM_URL, NOW_PATH, nowPlayingResultSchema, type NowPlaying,
} from "@/lib/serenity/now-playing";
import styles from "./Serenity.module.css";

const POLL_MS = 15_000;

export function SerenityComponent({ project }: { project: RenderProject }) {
  const p = renderProjectSchema.parse(project); // render-boundary revalidation
  const [np, setNp] = useState<NowPlaying | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(NOW_PATH, { cache: "no-store" });
        const json = nowPlayingResultSchema.parse(await res.json());
        if (!active) return;
        if (json.ok) { setNp(json); setDegraded(false); }
        else setDegraded(true);
      } catch {
        if (active) setDegraded(true);
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const showStatic = degraded && !np;

  return (
    <Composed className={styles.card}>
      <div className={styles.title}>{p.name}</div>
      <div className={styles.tagline}>{np?.tagline ?? p.tagline}</div>
      <div className={styles.body}>
        {showStatic ? (
          <>
            <div className={styles.desc}>{p.description}</div>
            <div className={styles.meta}>
              {p.tech} · {p.year}
              {p.url ? <> · <a href={p.url} target="_blank" rel="noreferrer" className={styles.link}>visit</a></> : null}
            </div>
          </>
        ) : (
          <>
            <div className={styles.live}>
              <span className={`${styles.dot} ${np?.onAir ? styles.on : ""}`} aria-hidden="true" />
              <span className={styles.onair}>
                {np?.onAir ? "on air" : "off air"}{np?.show ? ` · ${np.show}` : ""}
              </span>
            </div>
            <div className={styles.track}>
              {np?.track ? (
                <>
                  <span className={styles.trackTitle}>{np.track.title}</span>
                  <span className={styles.trackArtist}>{np.track.artist}</span>
                </>
              ) : (
                <span className={styles.trackArtist}>loading the current track…</span>
              )}
            </div>
            {np?.beat ? <div className={styles.beat}>{np.beat}</div> : null}
            <div className={styles.player}>
              <button type="button" className={styles.play} onClick={toggle}>
                {playing ? "pause" : "listen live"}
              </button>
              <span className={`${styles.eq} ${playing ? styles.eqOn : ""}`} aria-hidden="true">
                <i /><i /><i /><i />
              </span>
            </div>
            {p.url ? (
              <div className={styles.meta}>
                <a href={p.url} target="_blank" rel="noreferrer" className={styles.link}>open underclassradio.com</a>
              </div>
            ) : null}
          </>
        )}
        <audio ref={audioRef} src={STREAM_URL} preload="none" />
      </div>
    </Composed>
  );
}
```

- [ ] **Step 4: Implement `components/vocabulary/Serenity.module.css`**

```css
.card { border: 1px solid var(--border); background: var(--bg-raised); padding: 14px 16px; margin: 14px 0; }
.title { font-size: 14px; color: var(--text); font-weight: 500; }
.tagline { font-size: 12.5px; color: var(--text-secondary); margin-top: 4px; }
.desc { font-size: 13px; color: var(--text-secondary); line-height: var(--leading-prose); margin-top: 8px; }
.meta { font-family: var(--font-mono), monospace; font-size: 11px; color: var(--text-tertiary); margin-top: 10px; }
.link { color: var(--ink); text-decoration: none; }
.link:hover { text-decoration: underline; }

.live { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--text-tertiary); }
.dot.on { background: var(--onair); animation: serenityPulse 1.8s ease-in-out infinite; }
.onair { font-family: var(--font-mono), monospace; font-size: 11px; color: var(--text-secondary); letter-spacing: 0.03em; }

.track { margin-top: 10px; }
.trackTitle { display: block; font-size: 14px; color: var(--text); }
.trackArtist { display: block; font-size: 12.5px; color: var(--text-secondary); margin-top: 2px; }
.beat { font-size: 12.5px; color: var(--text-tertiary); font-style: italic; line-height: var(--leading-prose); margin-top: 10px; }

.player { display: flex; align-items: center; gap: 14px; margin-top: 14px; }
.play { font-family: var(--font-mono), monospace; font-size: 12.5px; color: var(--ink); background: none; border: 1px solid var(--border); border-radius: 6px; padding: 6px 12px; cursor: pointer; }
.play:hover { border-color: var(--ink); }

.eq { display: inline-flex; align-items: flex-end; gap: 3px; height: 16px; }
.eq i { width: 3px; height: 4px; background: var(--text-tertiary); display: block; }
.eqOn i { background: var(--onair); animation: serenityEq 0.9s ease-in-out infinite; }
.eqOn i:nth-child(2) { animation-delay: 0.15s; }
.eqOn i:nth-child(3) { animation-delay: 0.30s; }
.eqOn i:nth-child(4) { animation-delay: 0.45s; }

@keyframes serenityPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes serenityEq { 0%, 100% { height: 4px; } 50% { height: 15px; } }

@media (prefers-reduced-motion: reduce) {
  .dot.on { animation: none; }
  .eqOn i { animation: none; height: 9px; }
}
```

- [ ] **Step 5: Run to verify it PASSES** — `npx vitest run components/vocabulary/Serenity.test.tsx` → PASS (4 tests). Also `npx tsc --noEmit` exit 0, and confirm `grep -n "server-only" components/vocabulary/Serenity.tsx` shows no import.

- [ ] **Step 6: Commit**

```bash
git add components/vocabulary/Serenity.tsx components/vocabulary/Serenity.module.css components/vocabulary/Serenity.test.tsx
git commit -m "feat: Serenity live component (now-playing, on-air pulse, equalizer, player, graceful degrade)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Wire showSerenity into the transcript + system prompt

Dispatch the new tool part to the live component, and teach the model to use `showSerenity` for Serenity Radio.

**Files:** Modify `components/chat/MessagePart.tsx`, `components/chat/MessagePart.test.tsx`, `lib/ai/system-prompt.ts`, `lib/ai/system-prompt.test.ts`.

> Note: `lib/ai/leak-detect.ts` already flags `showSerenity(...)` via its generalized `\b(show|suggest)[A-Z]\w*\s*\(` pattern, so no leak-detect change is needed.

- [ ] **Step 1: Add the failing MessagePart test** — append inside the existing `describe("MessagePart", ...)` block in `components/chat/MessagePart.test.tsx`:

```ts
  it("renders the Serenity live component for tool-showSerenity", () => {
    // SerenityComponent fetches now-playing on mount; stub fetch so it degrades quietly to static.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false }) }));
    const project = {
      id: "serenity", name: "Serenity Radio", tagline: "t", description: "d",
      tech: "typescript", year: "2026", url: "https://underclassradio.com",
      status: "featured" as const, audienceTags: [] as string[], live: { kind: "serenity" as const },
    };
    render(<MessagePart part={{ type: "tool-showSerenity", state: "output-available", output: { project } }} />);
    expect(screen.getByText("Serenity Radio")).toBeInTheDocument();
  });
```

Also add an `afterEach` (just below the `import` lines and before/after the existing `describe`, at top level of the file) to clear the fetch stub so it does not leak into other test files' globals — if the file already has an `afterEach`, merge this line in:

```ts
import { afterEach } from "vitest";
afterEach(() => { vi.unstubAllGlobals(); });
```

(If `afterEach` is not already imported, add it to the existing `vitest` import instead of a separate import line. `vi` is already imported in this file from Plan 3.)

- [ ] **Step 2: Run to verify it FAILS** — `npx vitest run components/chat/MessagePart.test.tsx` → FAIL (`tool-showSerenity` renders null).

- [ ] **Step 3: Update `components/chat/MessagePart.tsx`** — add the import, the switch case, and the type to the set:
  - Add import near the other vocabulary imports:
    ```tsx
    import { SerenityComponent } from "@/components/vocabulary/Serenity";
    ```
  - Add a case inside `renderTool`'s switch (next to `tool-showProject`):
    ```tsx
        case "tool-showSerenity":
          return <SerenityComponent project={o.project} />;
    ```
  - Add `"tool-showSerenity"` to the `TOOL_TYPES` set:
    ```tsx
    const TOOL_TYPES = new Set([
      "tool-showProject", "tool-showProjects", "tool-showSkills",
      "tool-showExperience", "tool-showEducation", "tool-showContact",
      "tool-showSerenity", "tool-suggestDirections",
    ]);
    ```

- [ ] **Step 4: Run to verify it PASSES** — `npx vitest run components/chat/MessagePart.test.tsx` → PASS (the prior tests + the new one). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Add the failing system-prompt test** — append inside the existing `describe("composeSystemPrompt", ...)` block in `lib/ai/system-prompt.test.ts`:

```ts
  it("teaches the live Serenity tool and prefers it for Serenity Radio", () => {
    const sp = composeSystemPrompt({ role: "curious", text: null });
    expect(sp).toContain("showSerenity");
  });
```

- [ ] **Step 6: Run to verify it FAILS** — `npx vitest run lib/ai/system-prompt.test.ts` → FAIL (`showSerenity` not present).

- [ ] **Step 7: Update `composeSystemPrompt` in `lib/ai/system-prompt.ts`** — add a `showSerenity` bullet to the tools list, immediately after the `showProject` bullet line:

```ts
    "- showSerenity: the live Serenity Radio component (current track, on-air status, on-site player). Use this for Serenity Radio instead of showProject whenever the visitor asks about it or wants to listen.",
```

(Keep the line in the tools list between the `showProject` bullet and the `showProjects` bullet. No em dashes.)

- [ ] **Step 8: Run to verify it PASSES** — `npx vitest run lib/ai/system-prompt.test.ts` → PASS. Also `npx tsc --noEmit` exit 0.

- [ ] **Step 9: Commit**

```bash
git add components/chat/MessagePart.tsx components/chat/MessagePart.test.tsx lib/ai/system-prompt.ts lib/ai/system-prompt.test.ts
git commit -m "feat: dispatch showSerenity in transcript + teach the system prompt to prefer it

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Milestone gate

**Files:** none (verification only).

- [ ] **Step 1: Full suite** — Run: `npx vitest run` → all pass. Record totals (expect the Plan 3 count of 89 plus the tests added here).

- [ ] **Step 2: Types + build** — Run: `npx tsc --noEmit` (exit 0), then `npm run build` (success). Confirm a new dynamic route `ƒ /api/serenity/now` appears in the route list.

- [ ] **Step 3: Bundle privacy** — Run both and expect `clean` for each:

```bash
grep -rl "Cost trick" .next/static 2>/dev/null && echo "LEAK FOUND" || echo "clean"
grep -rl "aggressive context-management" .next/static 2>/dev/null && echo "LEAK FOUND" || echo "clean"
```

If either finds a match, STOP and report BLOCKED.

- [ ] **Step 4: Server-only stays server-side** — confirm no client file imports the server-only upstream module, and the client-safe files have no real `server-only` import (line-anchored so it does not match the comment prose):

```bash
grep -rnE "^\s*import [^/]*serenity/upstream" components/ && echo "CLIENT IMPORTS UPSTREAM" || echo "clean: upstream not imported by any component"
grep -rnE "^\s*import [^/]*server-only" components/vocabulary/Serenity.tsx lib/serenity/now-playing.ts && echo "SERVER-ONLY IN CLIENT" || echo "clean: no server-only in client serenity files"
```

Expect both `clean`.

- [ ] **Step 5: Manual end-to-end (recommended)** — run `npm run dev`, open the app, declare a persona, and ask "play Serenity Radio" / "what is Ethan listening to?". Confirm: the live component composes in with the real current track, artist, show, and the "last beat" line; the on-air dot pulses; clicking "listen live" starts audio from `stream.underclassradio.com/stream` and the equalizer animates; clicking again pauses. Then simulate an outage (e.g. block the host in devtools or temporarily point `NOW_PATH` at a 500) and confirm it degrades to the static description + visit link. If the model under-calls the tool, note it (Plan 5 tunes orchestration); reliable rendering on at least one chain model is sufficient.

- [ ] **Step 6: Commit** (allow empty if nothing changed):

```bash
git commit --allow-empty -m "chore: serenity-live milestone green (tests + build + bundle privacy)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (against the spec and roadmap)

- **§5.2 actual current track pulled live:** Task 1–3 (proxy + contract) + Task 5 (component polls and renders track/artist/show). ✓
- **§5.2 on-site audio player streaming the live station, play/pause:** Task 5 (`<audio>` direct to `STREAM_URL`, user-gesture start, pause). ✓ (direct playback is the confirmed deviation; see Decisions.)
- **§5.2 on-air pulse + equalizer tied to playback state:** Task 5 (`.dot.on` pulse on `onAir`; `.eqOn` equalizer animates while `playing`). ✓
- **§5.2 / §8.4 graceful degradation to static project info when unreachable:** Task 5 (`degraded && !np` → description + visit link); proxy returns `ok:false` on failure (Task 2–3). ✓
- **§8.4 server-side proxy for now-playing (CORS-locked) with short cache:** Task 3 (`/api/serenity/now`, 15s TTL). ✓
- **§4.3 continuous micro-motion only for genuinely live status; reduced-motion respected:** Task 5 CSS (pulse + equalizer; `prefers-reduced-motion` disables both). ✓
- **§11 autoplay policy (require a user gesture):** Task 5 (`audio.play()` only inside the click handler; `preload="none"`). ✓
- **§8.2 tools-as-components + render-boundary revalidation:** Task 4 (`showSerenity`) + Task 5 (`renderProjectSchema.parse`) + Task 6 (dispatch). ✓
- **Privacy boundary:** `showSerenity` strips `privateNotes` via `publicProjectSchema.parse` (Task 4); the component imports the client-safe contract, never `lib/serenity/upstream` (Task 7 gate). ✓
- **Placeholder scan:** every code step is complete; the only conditional is the Zod `.catch` ordering note (Task 2), which gives a concrete fallback. ✓
- **Type consistency:** `NowPlaying`/`NowPlayingResult`, `STREAM_URL`/`NOW_PATH`, `normalizeNowPlaying`/`fetchNowPlaying`, `SerenityComponent`, tool name `showSerenity`, and the part type `tool-showSerenity` are used identically across tasks. ✓

## Out of scope (later plans / not requested)

- The station's `/messages` (listener messaging) and `/schedule` features — those belong to underclassradio.com, not triskaspace.
- Real-time audio spectrum analysis via Web Audio API. The equalizer reflects play/pause state (a CSS animation), which is what the spec asks for; true frequency analysis is unnecessary and heavier.
- CSP wiring. triskaspace sets no CSP today, so direct audio works as-is. When CSP lands in **Plan 6**, it must include `media-src https://stream.underclassradio.com` and `connect-src 'self'` (the now-playing proxy is same-origin).
- Markdown/diagrams (Plan 6); authored-opening orchestration and final chip placement (Plan 5).

## Open items / assumptions

- Assumes the upstream paths stay stable: `https://api.underclassradio.com/api/now` and `https://stream.underclassradio.com/stream`. If Ethan changes them, update `UPSTREAM_URL` in `lib/serenity/upstream.ts` and `STREAM_URL` in `lib/serenity/now-playing.ts`.
- Assumes server-side fetch of `/api/now` keeps returning the body without an `Origin` header (verified 2026-05-30). If the station later requires an Origin/referer/token for non-browser clients, add the appropriate header in `fetchNowPlaying`.
- `tech · year` for Serenity is still the `CONFIRM` placeholder from Plan 1 (`typescript · 2026`); unrelated to this plan but still open.
