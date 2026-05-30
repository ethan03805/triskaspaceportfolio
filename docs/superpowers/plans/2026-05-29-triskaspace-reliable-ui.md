# triskaspace Reliable Generative UI Implementation Plan (Plan 2 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generative-UI experience reliable: fall back across the model chain, repair malformed tool calls, suppress tool-intent that leaks into prose, show a composing skeleton while a tool runs and a graceful fallback when it errors, and insert the human-verification gate (inert, AlwaysPass) so Turnstile drops in later.

**Architecture:** Keep the foundation's tools-as-components design. Add small, pure, independently-tested helpers (`leak-detect`, `repair`) and a verifier factory, then wire them into the existing chat route and `MessagePart`. Model-level fallback uses OpenRouter's server-side `models` routing (pass the whole `MODEL_CHAIN` as the fallback list) rather than app-level retry, which is simpler and survives mid-stream. A broken "wow" moment becomes either a repaired render, a quiet skeleton, or a quiet error line, never raw JSON or a crash.

**Tech Stack:** Same as foundation. AI SDK v6 (`ai@6.0.193`) `streamText` options `experimental_repairToolCall` + `onError`; `@openrouter/ai-sdk-provider@2.9.0` `OpenRouterChatSettings.models`; React 19 + Vitest + Testing Library.

**Branch:** `build/reliable-ui` (already created off `main`). Commit locally per task; do not push (wrap-up handles the merge/push). Append `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` to every commit. Ignore any unstaged `next-env.d.ts` change (Next auto-generated; do not stage it).

**Spec:** `docs/superpowers/specs/2026-05-29-triskaspace-dynamic-portfolio-design.md` (§8.3 model + reliability; §5 components; §9 protection).

---

## Foundation context the engineer needs

These already exist and are tested (from Plan 1):
- `app/api/chat/route.ts` — POST handler: rate-limit gate, parses `{messages: UIMessage[], persona?}`, `const messages = capMessages<UIMessage>(body.messages)`, then `streamText({ model: openrouter()(MODEL_CHAIN[0]), system: composeSystemPrompt(persona), messages: await convertToModelMessages(messages), tools: buildTools(), stopWhen: stepCountIs(5), ...buildModelParams() })`, returns `result.toUIMessageStreamResponse()`. Note `convertToModelMessages` is **async** in v6 (already awaited). `export const maxDuration = 30`.
- `lib/ai/model.ts` — `export function openrouter()` returns a directly-callable OpenRouter provider; `openrouter()("slug")` returns a model. `export const MODEL_CHAIN = ["moonshotai/kimi-k2.6","anthropic/claude-sonnet-4.6","google/gemini-3-pro-preview"] as const`.
- `lib/ai/tools.ts` — `export function buildTools()` returns `{ showProject }`; `export type Tools = ReturnType<typeof buildTools>`. The tool name is `showProject`; its output is `{ project, emphasis }`.
- `lib/protection/verifier.ts` — `export interface HumanVerifier { verify(token: string): Promise<{ ok: boolean }> }`; `export class AlwaysPassVerifier implements HumanVerifier`.
- `components/chat/MessagePart.tsx` — currently: text part → `<p>{part.text}</p>`; `tool-showProject` + `output-available` → `<ProjectComponent project={out.project} emphasis={out.emphasis ?? []} />`; else `<div aria-label="composing" />`.
- `components/vocabulary/Project.tsx` — `export function ProjectComponent({ project, emphasis })`; revalidates props with its own client-safe `renderSchema`.
- `components/motion/Composed.tsx` — the compose primitive.

Test conventions: Vitest, `server-only` mocked in `test/setup.ts`, `@/*` alias to project root, jsdom (no `matchMedia` — guard it). Run a single file with `npx vitest run <path>`.

---

## File structure created/modified by this plan

```
lib/ai/
  leak-detect.ts        # NEW: isLeakedToolIntent (client-safe, no server-only)
  leak-detect.test.ts   # NEW
  repair.ts             # NEW: repairShowProjectArgs (pure) + makeRepairToolCall (v6 wrapper)
  repair.test.ts        # NEW (tests the pure repairShowProjectArgs)
  model.ts              # MODIFY: add modelSettings() + primaryModel() (OpenRouter fallback routing)
  model.test.ts         # MODIFY: add assertions for modelSettings/primaryModel
lib/protection/
  verifier.ts           # MODIFY: add getVerifier() factory
  protection.test.ts    # MODIFY: add getVerifier assertion
components/chat/
  Skeleton.tsx          # NEW: composing skeleton panel
  Skeleton.module.css   # NEW
  MessagePart.tsx       # MODIFY: skeleton for input states, error fallback, leak suppression
  MessagePart.module.css# NEW: error-line style
  MessagePart.test.tsx  # NEW: state rendering tests
app/api/chat/
  route.ts              # MODIFY: verifier gate + primaryModel() + repair + onError
```

---

## Task 1: Tool-intent leak detector

A defensive pure function: detect when assistant *text* is actually a leaked tool call / raw JSON (some cheap models emit tool intent as prose). The client uses it to suppress such text instead of showing JSON to the visitor. Must be client-safe (no `server-only`).

**Files:** Create `lib/ai/leak-detect.ts`; Test `lib/ai/leak-detect.test.ts`.

- [ ] **Step 1: Write the failing test** — `lib/ai/leak-detect.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run lib/ai/leak-detect.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/ai/leak-detect.ts`**

```ts
// client-safe: do NOT import "server-only" (used by MessagePart in the browser)

/**
 * True when assistant text is actually a leaked tool call / raw JSON blob
 * rather than prose, so the UI can suppress it instead of showing JSON.
 * Conservative: only flags text that is clearly machine output.
 */
export function isLeakedToolIntent(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  // function-call style, e.g. showProject({ ... })
  if (/\bshowProject\s*\(/.test(t)) return true;

  // explicit tool/function tags
  if (/<\/?(tool_call|tool|function_call|function)\b/i.test(t)) return true;

  // the entire message is a JSON object or array
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try {
      JSON.parse(t);
      return true; // a whole-message JSON blob is never prose for this concierge
    } catch {
      return false; // not valid JSON => probably prose that happens to start with a brace
    }
  }

  return false;
}
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run lib/ai/leak-detect.test.ts`
Expected: PASS (4 tests). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/leak-detect.ts lib/ai/leak-detect.test.ts
git commit -m "feat: tool-intent leak detector

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Tool-call argument repair

A pure function that coerces common malformed `showProject` arguments into valid `{ id, emphasis }`, plus a thin v6 `ToolCallRepairFunction` wrapper used by the route. The pure function is fully tested; the wrapper is verified by tsc/build.

**Files:** Create `lib/ai/repair.ts`; Test `lib/ai/repair.test.ts`.

- [ ] **Step 1: Write the failing test** — `lib/ai/repair.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { repairShowProjectArgs } from "./repair";

describe("repairShowProjectArgs", () => {
  it("parses a JSON string of args", () => {
    expect(repairShowProjectArgs('{"id":"serenity"}')).toEqual({ id: "serenity", emphasis: [] });
  });
  it("maps alternate id keys (project/projectId/name)", () => {
    expect(repairShowProjectArgs({ project: "axiom" })).toEqual({ id: "axiom", emphasis: [] });
    expect(repairShowProjectArgs({ projectId: "vox" })).toEqual({ id: "vox", emphasis: [] });
  });
  it("keeps a valid object and string-filters emphasis", () => {
    expect(repairShowProjectArgs({ id: "vox", emphasis: ["live", 3] as unknown as string[] }))
      .toEqual({ id: "vox", emphasis: ["live"] });
  });
  it("treats a bare string as the id", () => {
    expect(repairShowProjectArgs("serenity")).toEqual({ id: "serenity", emphasis: [] });
  });
  it("returns null for unrepairable input", () => {
    expect(repairShowProjectArgs({ foo: "bar" })).toBeNull();
    expect(repairShowProjectArgs(42)).toBeNull();
    expect(repairShowProjectArgs("")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run lib/ai/repair.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/ai/repair.ts`**

```ts
import "server-only";
import { type ToolCallRepairFunction } from "ai";

export type RepairedShowProjectArgs = { id: string; emphasis: string[] };

/** Coerce common malformed showProject args into a valid shape, or null if unrepairable. */
export function repairShowProjectArgs(raw: unknown): RepairedShowProjectArgs | null {
  let v: unknown = raw;

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    if (s.startsWith("{") || s.startsWith("[")) {
      try { v = JSON.parse(s); } catch { return null; }
    } else {
      return { id: s, emphasis: [] }; // a bare string is the id
    }
  }

  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const idRaw = o.id ?? o.project ?? o.projectId ?? o.name;
    if (typeof idRaw === "string" && idRaw.trim()) {
      const emphasis = Array.isArray(o.emphasis)
        ? o.emphasis.filter((x): x is string => typeof x === "string")
        : [];
      return { id: idRaw.trim(), emphasis };
    }
  }

  return null;
}

/**
 * v6 ToolCallRepairFunction: when a showProject tool call has malformed input,
 * rewrite it to a valid stringified payload. Returns null to leave other failures alone.
 *
 * VERIFY against node_modules/ai/dist/index.d.ts: the ToolCallRepairFunction option shape.
 * In ai@6.0.193 the callback receives an object including `toolCall` (with `toolName` and a
 * string `input`) and must return a tool-call-shaped object (or null). Adapt field names to
 * the installed type; keep repairShowProjectArgs as the core. Cast the generic to the tools
 * type if needed so tsc passes.
 */
export function makeRepairToolCall(): ToolCallRepairFunction<never> {
  const fn = async ({ toolCall }: { toolCall: { toolName: string; input: unknown } }) => {
    if (toolCall.toolName !== "showProject") return null;
    const repaired = repairShowProjectArgs(toolCall.input);
    if (!repaired) return null;
    return { ...toolCall, input: JSON.stringify(repaired) };
  };
  return fn as unknown as ToolCallRepairFunction<never>;
}
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run lib/ai/repair.test.ts`
Expected: PASS (5 tests). Also `npx tsc --noEmit` exit 0. If the `ToolCallRepairFunction` import or generic causes a tsc error, read its definition in `node_modules/ai/dist/index.d.ts`, adjust the `makeRepairToolCall` signature/casts to match v6 exactly, and report what you changed. The pure `repairShowProjectArgs` must stay as specified and its tests must pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/repair.ts lib/ai/repair.test.ts
git commit -m "feat: tool-call argument repair

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Human-verification gate factory

Add a factory that returns the active verifier. Inert now (always `AlwaysPassVerifier`); Plan 6 adds the Turnstile branch behind an env flag. This lets the route call one function and gain Turnstile later with no route change.

**Files:** Modify `lib/protection/verifier.ts`; Modify `lib/protection/protection.test.ts`.

- [ ] **Step 1: Add the failing assertion** to `lib/protection/protection.test.ts` (append inside the existing top-level describe block, after the existing tests):

```ts
  it("getVerifier returns a passing verifier by default", async () => {
    const { getVerifier } = await import("./verifier");
    expect((await getVerifier().verify("any-token")).ok).toBe(true);
  });
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run lib/protection/protection.test.ts`
Expected: FAIL (`getVerifier` is not exported).

- [ ] **Step 3: Add `getVerifier` to `lib/protection/verifier.ts`** (append at the end, below `AlwaysPassVerifier`):

```ts
/**
 * Returns the active human verifier.
 * Plan 6 adds: if (process.env.ENABLE_TURNSTILE === "true") return new TurnstileVerifier(...).
 * Until then this is inert (always passes) so the route gate is wired but never blocks dev.
 */
export function getVerifier(): HumanVerifier {
  return new AlwaysPassVerifier();
}
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run lib/protection/protection.test.ts`
Expected: PASS (3 tests now). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/protection/verifier.ts lib/protection/protection.test.ts
git commit -m "feat: getVerifier factory (inert AlwaysPass seam)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Model fallback routing

Add OpenRouter server-side fallback: pass the whole `MODEL_CHAIN` as the `models` list so OpenRouter tries them in order. Expose `primaryModel()` for the route.

**Files:** Modify `lib/ai/model.ts`; Modify `lib/ai/model.test.ts`.

- [ ] **Step 1: Add the failing assertions** to `lib/ai/model.test.ts` (append a new describe block):

```ts
import { modelSettings, primaryModel } from "./model";

describe("model fallback", () => {
  it("modelSettings lists the full chain for OpenRouter fallback", () => {
    expect(modelSettings().models).toEqual([...MODEL_CHAIN]);
  });
  it("primaryModel returns a model object", () => {
    expect(primaryModel()).toBeTruthy();
  });
});
```

(`MODEL_CHAIN` is already imported at the top of the existing test file; if not, add it to the existing import.)

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run lib/ai/model.test.ts`
Expected: FAIL (`modelSettings`/`primaryModel` not exported).

- [ ] **Step 3: Add to `lib/ai/model.ts`** (append below the existing `openrouter()`):

```ts
/**
 * OpenRouter chat settings that enable server-side model fallback:
 * OpenRouter tries each slug in `models` in order, falling back on error/unavailability.
 * VERIFY `models` is a valid field on OpenRouterChatSettings (the 2nd arg to openrouter()(...))
 * in node_modules/@openrouter/ai-sdk-provider/dist/index.d.ts; it is at ~line 382. If the field
 * name differs, use the correct one and report it.
 */
export function modelSettings(): { models: string[] } {
  return { models: [...MODEL_CHAIN] };
}

/** The model to use for chat: primary slug + the full chain as OpenRouter fallback routing. */
export function primaryModel() {
  return openrouter()(MODEL_CHAIN[0], modelSettings());
}
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run lib/ai/model.test.ts`
Expected: PASS. Also `npx tsc --noEmit` exit 0. If `openrouter()(slug, { models })` does not typecheck (the `models` field is not on `OpenRouterChatSettings`), inspect the provider d.ts, switch to the correct settings field for fallback models (or pass via `extraBody: { models: [...] }`), keep `modelSettings().models` returning the chain for the test, and report what you used.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/model.ts lib/ai/model.test.ts
git commit -m "feat: OpenRouter model fallback routing (primaryModel)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Composing skeleton + error fallback + leak suppression in MessagePart

Wire the tool-part lifecycle into the UI: a composing skeleton while the tool runs, a quiet error line if it errors, the real component when output arrives, and suppression of any leaked tool JSON in text parts.

**Files:** Create `components/chat/Skeleton.tsx`, `components/chat/Skeleton.module.css`, `components/chat/MessagePart.module.css`; Modify `components/chat/MessagePart.tsx`; Test `components/chat/MessagePart.test.tsx`.

- [ ] **Step 1: Write the failing test** — `components/chat/MessagePart.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessagePart } from "./MessagePart";

const project = {
  id: "serenity", name: "Serenity Radio", tagline: "t", description: "d",
  tech: "go", year: "2026", status: "featured" as const, audienceTags: [] as string[],
};

describe("MessagePart", () => {
  it("shows a composing skeleton for input states", () => {
    render(<MessagePart part={{ type: "tool-showProject", state: "input-available" }} />);
    expect(screen.getByLabelText("composing")).toBeInTheDocument();
  });
  it("shows an error fallback for output-error", () => {
    render(<MessagePart part={{ type: "tool-showProject", state: "output-error" }} />);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });
  it("renders the project for output-available", () => {
    render(<MessagePart part={{ type: "tool-showProject", state: "output-available", output: { project, emphasis: [] } }} />);
    expect(screen.getByText("Serenity Radio")).toBeInTheDocument();
  });
  it("suppresses leaked tool JSON in a text part", () => {
    const { container } = render(<MessagePart part={{ type: "text", text: '{"id":"serenity"}' }} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("renders normal prose", () => {
    render(<MessagePart part={{ type: "text", text: "Ethan built Serenity Radio." }} />);
    expect(screen.getByText(/Ethan built/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run components/chat/MessagePart.test.tsx`
Expected: FAIL (Skeleton/error/suppression behavior not present yet — the input-available case currently renders an unlabeled div, the leak case renders the JSON).

- [ ] **Step 3: Implement `components/chat/Skeleton.tsx`**

```tsx
"use client";
import styles from "./Skeleton.module.css";

export function Skeleton() {
  return <div className={styles.skeleton} aria-label="composing" role="status" />;
}
```

- [ ] **Step 4: Implement `components/chat/Skeleton.module.css`**

```css
.skeleton {
  border: 1px solid var(--border);
  background: var(--bg-raised);
  height: 64px;
  margin: 14px 0;
  animation: skeletonPulse 1.4s ease-in-out infinite;
}
@keyframes skeletonPulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.65; }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; opacity: 0.5; }
}
```

- [ ] **Step 5: Implement `components/chat/MessagePart.module.css`**

```css
.error {
  font-family: var(--font-mono), monospace;
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 14px 0;
}
```

- [ ] **Step 6: Replace `components/chat/MessagePart.tsx` with:**

```tsx
"use client";
import { ProjectComponent } from "@/components/vocabulary/Project";
import { Skeleton } from "./Skeleton";
import { isLeakedToolIntent } from "@/lib/ai/leak-detect";
import styles from "./MessagePart.module.css";

type Part = { type: string; state?: string; output?: unknown; text?: string };

export function MessagePart({ part }: { part: Part }) {
  if (part.type === "text") {
    if (!part.text || isLeakedToolIntent(part.text)) return null;
    return <p>{part.text}</p>;
  }
  if (part.type === "tool-showProject") {
    if (part.state === "output-available" && part.output) {
      const out = part.output as { project: never; emphasis?: string[] };
      return <ProjectComponent project={out.project} emphasis={out.emphasis ?? []} />;
    }
    if (part.state === "output-error") {
      return <div className={styles.error} role="note">that one could not be loaded.</div>;
    }
    // input-streaming | input-available
    return <Skeleton />;
  }
  return null;
}
```

- [ ] **Step 7: Run to verify it PASSES**

Run: `npx vitest run components/chat/MessagePart.test.tsx`
Expected: PASS (5 tests). Also run the full suite `npx vitest run` (no regressions) and `npx tsc --noEmit` (exit 0).

- [ ] **Step 8: Commit**

```bash
git add components/chat/Skeleton.tsx components/chat/Skeleton.module.css components/chat/MessagePart.tsx components/chat/MessagePart.module.css components/chat/MessagePart.test.tsx
git commit -m "feat: composing skeleton, error fallback, leak suppression

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Wire the route (verifier gate + fallback model + repair + onError)

Integration task; verified by tsc + build (the live model call still needs a key, which the build does not require).

**Files:** Modify `app/api/chat/route.ts`.

- [ ] **Step 1: Update the imports** at the top of `app/api/chat/route.ts`:
  - Change `import { openrouter, MODEL_CHAIN } from "@/lib/ai/model";` to `import { primaryModel } from "@/lib/ai/model";`
  - Add `import { getVerifier } from "@/lib/protection/verifier";`
  - Add `import { makeRepairToolCall } from "@/lib/ai/repair";`

- [ ] **Step 2: Insert the verifier gate** immediately AFTER the existing rate-limit gate block (after the `if (!gate.ok) { ... }` return) and BEFORE `const body = ...`:

```ts
  const verifyToken = req.headers.get("x-verify-token") ?? "";
  const verified = await getVerifier().verify(verifyToken);
  if (!verified.ok) {
    return new Response("Verification required", { status: 403 });
  }
```

- [ ] **Step 3: Update the `streamText` call** — change the `model` line and add `experimental_repairToolCall` and `onError`. The call becomes:

```ts
  const result = streamText({
    model: primaryModel(),
    system: composeSystemPrompt(persona),
    messages: await convertToModelMessages(messages),
    tools: buildTools(),
    stopWhen: stepCountIs(5),
    experimental_repairToolCall: makeRepairToolCall(),
    onError: ({ error }) => { console.error("[chat] stream error", error); },
    ...buildModelParams(),
  });
```

(Keep the rest of the file — `maxDuration`, the limiter, body parsing, persona default, `capMessages<UIMessage>`, and `return result.toUIMessageStreamResponse()` — unchanged. If `onError`'s argument shape differs in v6, check `node_modules/ai/dist/index.d.ts` for the `onError` callback type and adjust the destructure; keep it logging the error.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → exit 0. Fix any v6 type mismatch on `experimental_repairToolCall` or `onError` (read the `streamText` option types; the repair generic may need a cast like `makeRepairToolCall() as never` if the `Tools` generic does not unify — keep runtime behavior).
Run: `npm run build` → succeeds; `/api/chat` still a dynamic route.

- [ ] **Step 5: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: wire verifier gate, model fallback, tool-call repair into chat route

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Milestone gate

**Files:** none (verification only).

- [ ] **Step 1: Full suite** — Run: `npx vitest run` → all pass. Record totals.
- [ ] **Step 2: Types + build** — Run: `npx tsc --noEmit` (exit 0), then `npm run build` (success).
- [ ] **Step 3: Bundle privacy** — Run both and expect `clean`:
  - `grep -rl "Cost trick" .next/static 2>/dev/null && echo "LEAK FOUND" || echo "clean"`
  - `grep -rl "aggressive context-management" .next/static 2>/dev/null && echo "LEAK FOUND" || echo "clean"`
  If either finds a match, STOP and report BLOCKED.
- [ ] **Step 4: Client-bundle server-only check** — confirm `lib/ai/leak-detect.ts` did NOT pull `server-only` into the client bundle: it must have no `server-only` import (it is imported by the client `MessagePart`). Verify with `grep -n "server-only" lib/ai/leak-detect.ts` → no matches.
- [ ] **Step 5: Commit** (allow empty if nothing changed):

```bash
git commit --allow-empty -m "chore: reliable-ui milestone green (tests + build + bundle privacy)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (against the spec and roadmap)

- **Provider fallback across MODEL_CHAIN** (§8.3): Task 4 (`primaryModel` + OpenRouter `models` routing), wired in Task 6. ✓
- **Defensive tool-call handling** (§8.3): validate/repair → Task 2 (`repairShowProjectArgs` + `experimental_repairToolCall`); tool-intent leaking into text → Task 1 + Task 5 suppression; `onError` → Task 6. ✓
- **Composing skeleton wired to input-\* tool states** (§5, §4.3): Task 5. ✓
- **Error fallback for output-error** (§5.2 degradation spirit): Task 5. ✓
- **Verifier gate using AlwaysPassVerifier** (§9): Task 3 (`getVerifier`) + Task 6 (gate in route). ✓
- **Placeholder scan:** the two `VERIFY ...` notes (repair function signature, OpenRouter `models` field) are real SDK-shape verifications with a concrete fallback instruction, not vague placeholders; every code step has complete code. ✓
- **Type consistency:** `isLeakedToolIntent`, `repairShowProjectArgs`/`makeRepairToolCall`, `getVerifier`, `modelSettings`/`primaryModel`, `Skeleton`, `MessagePart` names are used consistently across tasks; `primaryModel()` replaces the old `openrouter()(MODEL_CHAIN[0])` in the route exactly once. ✓

## Out of scope (later plans)
- Real Redis limiter + real Turnstile verifier (Plan 6).
- App-level retry beyond OpenRouter's `models` routing (only if OpenRouter routing proves insufficient in testing).
- Full component vocabulary, Serenity live audio, authored-opening orchestration, Markdown/diagrams (Plans 3-6).
