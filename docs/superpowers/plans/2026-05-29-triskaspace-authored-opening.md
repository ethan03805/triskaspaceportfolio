# triskaspace Authored Opening + Liberation Implementation Plan (Plan 5 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the spec's "lead, then liberate" experience (§3.1–3.3): a free-text visitor gets an instant "reading you as a recruiter" acknowledgment that echoes their words; the authored opening plays as a tailored greeting plus relevant components composing in; and only when that opening completes does the persistent input plus the adaptive suggested-direction chips compose into being below the transcript.

**Architecture:** Split the chat surface into a thin data container (`Chat`, owns `useChat` + persona + tint + opener) and a presentational view (`Conversation`, pure props, fully unit-tested). The opening/liberation logic lives in two pure client-safe helpers (`isOpeningComplete`, `latestDirections`) so it can be tested without the AI SDK. Suggested directions move out of the transcript flow: `MessagePart` stops rendering them inline, and the latest turn's directions render once, below the persistent input. The liberation zone (input + chips) is hidden during the opening and composes in via the existing `Composed` primitive once the first assistant turn finishes (reduced-motion respected). The model is taught, via the system prompt, to structure its first reply as greeting then lead then second item then `suggestDirections`, so the streamed order matches the cinematic sequence.

**Tech Stack:** Same as Plans 1–4. React 19 (`useState`/`useEffect`), `@ai-sdk/react` v3 `useChat` (exposes `status`), the `Composed` motion primitive, `lib/persona` `ROLE_LABEL`, Vitest 3 + @testing-library/react 16 + jsdom. No new dependencies.

**Branch:** `build/authored-opening` (create off `main`). Commit locally per task; do not push (the finishing-a-development-branch wrap-up handles merge/push). Append the trailer to every commit:

```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

Ignore any unstaged `next-env.d.ts` change (Next auto-generates it; do not stage it).

**Spec:** `docs/superpowers/specs/2026-05-29-triskaspace-dynamic-portfolio-design.md` (§3.1 entry + "reading you as" note, §3.2 the authored opening, §3.3 liberation, §4.3 Compose + reduced-motion, §5.9 suggested directions below the input).

---

## How the pacing is achieved (read this first)

The spec describes the opening as beats (greeting ~0.3s, lead ~0.95s, second ~1.9s, liberation ~2.9s). This plan realizes the *felt* sequence with three deterministic mechanisms rather than a fragile millisecond timer fighting model streaming:

1. **The greeting writes itself in via the token stream** — streamed assistant text appears progressively; no extra animation needed.
2. **Each component composes in via `Composed`** (the signature "writing in" motion) as its tool call resolves, in the model's emitted order (greeting → lead → second → directions).
3. **The liberation (input + chips) is gated** — hidden during the opening, then composes in once the first assistant turn completes. This is the "lead, then liberate" payoff and it is fully deterministic/testable.

Exact beat tuning (e.g. a fixed inter-block delay) is a later refinement via `Composed`'s `startDelay`; it is out of scope here and noted at the end.

## Current state the engineer is changing (verified)

- `components/chat/Chat.tsx` — `"use client"` host. Owns `useChat({ transport })`, `persona` state, `declare()` (sets persona, sets `--ink` tint, sends an opener message), then renders `<Entry>` until a persona is declared, else maps `messages` to `<MessagePart part onPick=... />` and renders `<Input onSend=... />` at the end. **Threads `onPick` to MessagePart** for the inline suggested-direction chips.
- `components/chat/MessagePart.tsx` — switches on `part.type`. Text → suppress empty/leaked else `<p>`. Tool parts (8 types incl. `tool-suggestDirections`) → output-available renders the component (suggestDirections → `<SuggestedDirections directions onPick>`), output-error → error note, input-* → `<Skeleton>`. Takes an `onPick?` prop used only by the suggestDirections case.
- `components/chat/SuggestedDirections.tsx` — `{ directions, onPick? }` → bracketed mono chips `[ d ]`, tap calls `onPick(d)`, renders `null` when empty. (Unchanged by this plan; it just moves to a new parent.)
- `components/chat/Input.tsx` — `{ onSend }`, placeholder `"ask anything"`, Enter submits. (Unchanged.)
- `components/chat/Chat.module.css` — `.chat`, `.user`, `.assistant`.
- `components/entry/Entry.tsx` — chips render `[ label ]`; declaring sends `{ role, text }` (`text` is the free-text words, or `null` for a chip). `who's visiting?` hook text.
- `lib/persona.ts` — `ROLE_LABEL` (`recruiter`→`"a recruiter"`, `engineer`→`"an engineer"`, etc.), `type PersonaRole`.
- `lib/ai/system-prompt.ts` — `composeSystemPrompt(persona)`; an array of instruction lines (rules, then a tools list, then gating, then CONTENT).

Test conventions: Vitest, `@/*` alias, jsdom (`Composed` guards `matchMedia`). Single file: `npx vitest run <path>`.

---

## File structure created/modified by this plan

```
lib/chat/
  transcript.ts          # NEW client-safe: isOpeningComplete, latestDirections, TranscriptMessage type
  transcript.test.ts     # NEW
components/chat/
  AssignmentNote.tsx        # NEW: "reading you as ..." + echo (free-text personas)
  AssignmentNote.module.css # NEW
  AssignmentNote.test.tsx   # NEW
  Conversation.tsx          # NEW presentational view (Entry | note + transcript + gated liberation)
  Conversation.module.css   # NEW (absorbs the old Chat styles + .liberation)
  Conversation.test.tsx     # NEW
  MessagePart.tsx           # MODIFY: stop rendering suggestDirections inline; drop onPick
  MessagePart.test.tsx      # MODIFY: replace the inline-directions test
  Chat.tsx                  # MODIFY: thin container delegating to Conversation
  Chat.module.css           # DELETE (styles move to Conversation.module.css)
lib/ai/
  system-prompt.ts          # MODIFY: add first-turn opening guidance
  system-prompt.test.ts     # MODIFY: + assertion
```

## Conventions for this plan

- TDD per task: write the failing test, run red, implement minimally, run green, commit.
- No em dashes in visitor-facing copy (periods, commas, parentheses; middot `·` and curly quotes are fine).
- Client components: `"use client"`, no `import "server-only"`. New helpers in `lib/chat/` are client-safe.
- Design tokens only in CSS. No dangling `styles.x` references (every class used must exist).

---

## Task 1: Opening + directions transcript helpers (client-safe)

Two pure functions that drive the orchestration, testable without the AI SDK.

**Files:** Create `lib/chat/transcript.ts`, `lib/chat/transcript.test.ts`.

- [ ] **Step 1: Write the failing test** — `lib/chat/transcript.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it FAILS** — `npx vitest run lib/chat/transcript.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `lib/chat/transcript.ts`**

```ts
// client-safe: no server-only (used by the Conversation client component)

export type TranscriptPart = { type: string; state?: string; output?: unknown; text?: string };
export type TranscriptMessage = { id?: string; role: string; parts?: TranscriptPart[] };

/**
 * The authored opening (the first assistant turn) is complete once the stream is
 * idle (or errored, so the visitor is not stuck) and at least one message exists.
 */
export function isOpeningComplete(status: string, messages: TranscriptMessage[]): boolean {
  return (status === "ready" || status === "error") && messages.length > 0;
}

/** Directions from the most recent assistant message that proposed any, else []. */
export function latestDirections(messages: TranscriptMessage[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    for (const part of m.parts ?? []) {
      if (part.type === "tool-suggestDirections" && part.state === "output-available") {
        const out = part.output as { directions?: unknown } | undefined;
        if (Array.isArray(out?.directions)) {
          return out.directions.filter((d): d is string => typeof d === "string");
        }
      }
    }
  }
  return [];
}
```

- [ ] **Step 4: Run to verify it PASSES** — `npx vitest run lib/chat/transcript.test.ts` → PASS (6 tests). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/chat/transcript.ts lib/chat/transcript.test.ts
git commit -m "feat: opening-complete + latest-directions transcript helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: AssignmentNote ("reading you as a recruiter" + echo)

A small note shown for free-text personas: it echoes the visitor's words and states the role the AI read them as. Instant client-side acknowledgment (§3.1).

**Files:** Create `components/chat/AssignmentNote.tsx`, `components/chat/AssignmentNote.module.css`, `components/chat/AssignmentNote.test.tsx`.

- [ ] **Step 1: Write the failing test** — `components/chat/AssignmentNote.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssignmentNote } from "./AssignmentNote";

describe("AssignmentNote", () => {
  it("echoes the visitor's words and states the assigned role", () => {
    render(<AssignmentNote role="recruiter" text="recruiter at a space company, GNC team" />);
    expect(screen.getByText(/recruiter at a space company, GNC team/)).toBeInTheDocument();
    expect(screen.getByText(/reading you as a recruiter/i)).toBeInTheDocument();
  });
  it("uses the role label (an engineer)", () => {
    render(<AssignmentNote role="engineer" text="i build rockets" />);
    expect(screen.getByText(/reading you as an engineer/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it FAILS** — `npx vitest run components/chat/AssignmentNote.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement `components/chat/AssignmentNote.tsx`**

```tsx
"use client";
import { Composed } from "@/components/motion/Composed";
import { ROLE_LABEL, type PersonaRole } from "@/lib/persona";
import styles from "./AssignmentNote.module.css";

export function AssignmentNote({ role, text }: { role: PersonaRole; text: string }) {
  return (
    <Composed className={styles.note}>
      <div className={styles.echo}>{text}</div>
      <div className={styles.reading}>reading you as {ROLE_LABEL[role]}</div>
    </Composed>
  );
}
```

- [ ] **Step 4: Implement `components/chat/AssignmentNote.module.css`**

```css
.note { margin: 8px 0 20px; }
.echo { font-size: 13px; color: var(--text-secondary); font-style: italic; line-height: var(--leading-prose); }
.echo::before { content: "\201C"; }
.echo::after { content: "\201D"; }
.reading { font-family: var(--font-mono), monospace; font-size: 11px; color: var(--ink); margin-top: 6px; letter-spacing: 0.03em; }
```

(The curly quotes wrap the echo via CSS pseudo-elements, so the echoed text node stays exactly the visitor's words. `.reading` uses the role tint `--ink`.)

- [ ] **Step 5: Run to verify it PASSES** — `npx vitest run components/chat/AssignmentNote.test.tsx` → PASS (2 tests). Also `npx tsc --noEmit` exit 0, and `grep -nE "^\s*import .*server-only" components/chat/AssignmentNote.tsx` → none.

- [ ] **Step 6: Commit**

```bash
git add components/chat/AssignmentNote.tsx components/chat/AssignmentNote.module.css components/chat/AssignmentNote.test.tsx
git commit -m "feat: AssignmentNote (reading-you-as + free-text echo)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Hoist suggested directions out of the transcript

Stop rendering suggested directions inline in `MessagePart` (they will render once, below the input, in the liberation zone). Remove the now-unused `onPick` plumbing from `MessagePart`, and make the one matching edit to the current `Chat` so it still type-checks.

**Files:** Modify `components/chat/MessagePart.tsx`, `components/chat/MessagePart.test.tsx`, `components/chat/Chat.tsx`.

> After this task, suggested directions are temporarily not rendered anywhere (the liberation zone arrives in Task 5). That intermediate gap is fine on the dev branch; tests and tsc stay green.

- [ ] **Step 1: Update the failing test first** — in `components/chat/MessagePart.test.tsx`:
  - Change the imports (line 1-2) to drop `fireEvent` (it becomes unused) and keep `vi`/`afterEach`:
    ```tsx
    import { describe, it, expect, vi, afterEach } from "vitest";
    import { render, screen } from "@testing-library/react";
    ```
  - **Delete** the existing test `it("renders directions for tool-suggestDirections and forwards onPick", ...)` (the one using `onPick`/`fireEvent`).
  - **Add** this test in its place (inside the `describe("MessagePart", ...)` block):
    ```tsx
      it("does not render suggested directions inline (they are hoisted below the input)", () => {
        const { container } = render(
          <MessagePart part={{ type: "tool-suggestDirections", state: "output-available", output: { directions: ["x"] } }} />,
        );
        expect(container).toBeEmptyDOMElement();
      });
    ```

- [ ] **Step 2: Run to verify it FAILS** — `npx vitest run components/chat/MessagePart.test.tsx` → FAIL (suggestDirections currently renders the chip, so the container is not empty).

- [ ] **Step 3: Edit `components/chat/MessagePart.tsx`**
  - Remove the import line `import { SuggestedDirections } from "./SuggestedDirections";`.
  - Change `renderTool`'s signature to drop `onPick`: `function renderTool(type: string, output: unknown) {`.
  - Remove the `case "tool-suggestDirections": return <SuggestedDirections directions={o.directions ?? []} onPick={onPick} />;` lines.
  - Remove `"tool-suggestDirections"` from the `TOOL_TYPES` set.
  - Change the `MessagePart` signature to drop `onPick`: `export function MessagePart({ part }: { part: Part }) {` and update the call site to `return renderTool(part.type, part.output);`.

  The result (verify it matches):
  ```tsx
  "use client";
  import { ProjectComponent } from "@/components/vocabulary/Project";
  import { ProjectsComponent } from "@/components/vocabulary/Projects";
  import { SkillsComponent } from "@/components/vocabulary/Skills";
  import { ExperienceComponent } from "@/components/vocabulary/Experience";
  import { EducationComponent } from "@/components/vocabulary/Education";
  import { ContactComponent } from "@/components/vocabulary/Contact";
  import { SerenityComponent } from "@/components/vocabulary/Serenity";
  import { Skeleton } from "./Skeleton";
  import { isLeakedToolIntent } from "@/lib/ai/leak-detect";
  import styles from "./MessagePart.module.css";

  type Part = { type: string; state?: string; output?: unknown; text?: string };

  function renderTool(type: string, output: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o = output as any;
    switch (type) {
      case "tool-showProject":
        return <ProjectComponent project={o.project} emphasis={o.emphasis ?? []} />;
      case "tool-showSerenity":
        return <SerenityComponent project={o.project} />;
      case "tool-showProjects":
        return <ProjectsComponent lead={o.lead} others={o.others ?? []} gated={o.gated ?? []} emphasis={o.emphasis ?? []} />;
      case "tool-showSkills":
        return <SkillsComponent groups={o.groups ?? []} emphasis={o.emphasis ?? []} />;
      case "tool-showExperience":
        return <ExperienceComponent entries={o.entries ?? []} emphasis={o.emphasis ?? []} />;
      case "tool-showEducation":
        return <EducationComponent entries={o.entries ?? []} />;
      case "tool-showContact":
        return <ContactComponent email={o.email} resumeUrl={o.resumeUrl} links={o.links ?? []} />;
      default:
        return null;
    }
  }

  const TOOL_TYPES = new Set([
    "tool-showProject", "tool-showProjects", "tool-showSkills",
    "tool-showExperience", "tool-showEducation", "tool-showContact",
    "tool-showSerenity",
  ]);

  export function MessagePart({ part }: { part: Part }) {
    if (part.type === "text") {
      if (!part.text || isLeakedToolIntent(part.text)) return null;
      return <p>{part.text}</p>;
    }
    if (TOOL_TYPES.has(part.type)) {
      if (part.state === "output-available" && part.output) {
        return renderTool(part.type, part.output);
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

- [ ] **Step 4: Edit `components/chat/Chat.tsx`** so it still compiles — change the transcript map's MessagePart usage to drop `onPick`. Replace:
  ```tsx
            <MessagePart
              key={i}
              part={part as never}
              onPick={(text) => sendMessage({ text }, { body: { persona } })}
            />
  ```
  with:
  ```tsx
            <MessagePart key={i} part={part as never} />
  ```
  (Leave the rest of `Chat.tsx` unchanged for now; it is fully refactored in Task 5.)

- [ ] **Step 5: Run to verify it PASSES** — `npx vitest run components/chat/MessagePart.test.tsx` → PASS (10 tests now). Run the full suite `npx vitest run` (no regressions). `npx tsc --noEmit` exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/chat/MessagePart.tsx components/chat/MessagePart.test.tsx components/chat/Chat.tsx
git commit -m "refactor: stop rendering suggested directions inline (hoist out of MessagePart)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Conversation presentational view

The pure view: shows the entry screen until a persona is declared; then the assignment note (free-text only), the transcript, and a liberation zone (input + directions below it) that is hidden during the opening and composes in once the opening completes.

**Files:** Create `components/chat/Conversation.tsx`, `components/chat/Conversation.module.css`, `components/chat/Conversation.test.tsx`.

- [ ] **Step 1: Write the failing test** — `components/chat/Conversation.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Conversation } from "./Conversation";

const noop = () => {};
const eng = { role: "engineer" as const, text: null };

describe("Conversation", () => {
  it("shows the entry screen when no persona is declared", () => {
    render(<Conversation persona={null} messages={[]} status="ready" onDeclare={noop} onSend={noop} />);
    expect(screen.getByText("[ recruiter ]")).toBeInTheDocument();
  });

  it("shows the assignment note only for a free-text persona", () => {
    const { rerender } = render(
      <Conversation persona={{ role: "recruiter", text: "recruiter at a space company" }}
        messages={[{ id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] }]}
        status="streaming" onDeclare={noop} onSend={noop} />,
    );
    expect(screen.getByText(/recruiter at a space company/)).toBeInTheDocument();
    expect(screen.getByText(/reading you as a recruiter/i)).toBeInTheDocument();
    rerender(
      <Conversation persona={eng}
        messages={[{ id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] }]}
        status="streaming" onDeclare={noop} onSend={noop} />,
    );
    expect(screen.queryByText(/reading you as/i)).toBeNull();
  });

  it("hides the input during the opening, reveals it once the opening completes", async () => {
    const opening = [{ id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] }];
    const { rerender } = render(
      <Conversation persona={eng} messages={opening} status="streaming" onDeclare={noop} onSend={noop} />,
    );
    expect(screen.queryByPlaceholderText(/ask anything/i)).toBeNull();
    const done = [
      ...opening,
      { id: "a1", role: "assistant", parts: [
        { type: "text", text: "hello" },
        { type: "tool-suggestDirections", state: "output-available", output: { directions: ["tell me about Axiom"] } },
      ] },
    ];
    rerender(<Conversation persona={eng} messages={done} status="ready" onDeclare={noop} onSend={noop} />);
    expect(await screen.findByPlaceholderText(/ask anything/i)).toBeInTheDocument();
  });

  it("renders the latest directions once, below the input, and a tap sends them", async () => {
    const onSend = vi.fn();
    const done = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
      { id: "a1", role: "assistant", parts: [
        { type: "tool-suggestDirections", state: "output-available", output: { directions: ["show his skills"] } },
      ] },
    ];
    render(<Conversation persona={eng} messages={done} status="ready" onDeclare={noop} onSend={onSend} />);
    const chip = await screen.findByText("[ show his skills ]");
    expect(screen.getAllByText("[ show his skills ]")).toHaveLength(1); // not duplicated in the transcript
    fireEvent.click(chip);
    expect(onSend).toHaveBeenCalledWith("show his skills");
  });
});
```

- [ ] **Step 2: Run to verify it FAILS** — `npx vitest run components/chat/Conversation.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement `components/chat/Conversation.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Entry, type Declaration } from "@/components/entry/Entry";
import { AssignmentNote } from "./AssignmentNote";
import { MessagePart } from "./MessagePart";
import { Input } from "./Input";
import { SuggestedDirections } from "./SuggestedDirections";
import { Composed } from "@/components/motion/Composed";
import { isOpeningComplete, latestDirections, type TranscriptMessage } from "@/lib/chat/transcript";
import styles from "./Conversation.module.css";

export function Conversation({
  persona, messages, status, onDeclare, onSend,
}: {
  persona: Declaration | null;
  messages: TranscriptMessage[];
  status: string;
  onDeclare: (d: Declaration) => void;
  onSend: (text: string) => void;
}) {
  const [liberated, setLiberated] = useState(false);
  useEffect(() => {
    if (isOpeningComplete(status, messages)) setLiberated(true);
  }, [status, messages]);

  if (!persona) return <Entry onDeclare={onDeclare} />;

  const directions = latestDirections(messages);

  return (
    <div className={styles.conversation}>
      {persona.text ? <AssignmentNote role={persona.role} text={persona.text} /> : null}
      {messages.map((m, mi) => (
        <div key={m.id ?? mi} className={m.role === "user" ? styles.user : styles.assistant}>
          {(m.parts ?? []).map((part, i) => <MessagePart key={i} part={part as never} />)}
        </div>
      ))}
      {liberated ? (
        <Composed className={styles.liberation}>
          <Input onSend={onSend} />
          <SuggestedDirections directions={directions} onPick={onSend} />
        </Composed>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Implement `components/chat/Conversation.module.css`** (absorbs the old Chat styles plus the liberation zone)

```css
.conversation { padding: 24px 0 40px; }
.user { color: var(--text-tertiary); font-size: 12px; font-family: var(--font-mono), monospace; margin: 16px 0 4px; }
.assistant { color: var(--text-secondary); font-size: 14px; line-height: var(--leading-prose); }
.liberation { margin-top: 22px; border-top: 1px solid var(--border-soft); padding-top: 18px; }
```

- [ ] **Step 5: Run to verify it PASSES** — `npx vitest run components/chat/Conversation.test.tsx` → PASS (4 tests). Also `npx tsc --noEmit` exit 0.

> Note on the type of `messages`: `TranscriptMessage[]` is a structural subset of the AI SDK's `UIMessage[]`, so `Chat` (Task 5) can pass `useChat`'s `messages` to this prop. If tsc rejects the direct assignment there, Task 5 casts it; this component's prop type stays `TranscriptMessage[]`.

- [ ] **Step 6: Commit**

```bash
git add components/chat/Conversation.tsx components/chat/Conversation.module.css components/chat/Conversation.test.tsx
git commit -m "feat: Conversation view (entry, assignment note, transcript, gated liberation)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Chat becomes a thin container

Reduce `Chat` to wiring `useChat` + persona + tint + opener into `Conversation`. Delete the now-unused `Chat.module.css`.

**Files:** Modify `components/chat/Chat.tsx`; Delete `components/chat/Chat.module.css`.

- [ ] **Step 1: Replace `components/chat/Chat.tsx` entirely with:**

```tsx
"use client";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Conversation } from "./Conversation";
import { type Declaration } from "@/components/entry/Entry";
import { TINTS } from "@/lib/persona";
import { type TranscriptMessage } from "@/lib/chat/transcript";

export function Chat() {
  const [persona, setPersona] = useState<Declaration | null>(null);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const declare = (d: Declaration) => {
    setPersona(d);
    document.documentElement.style.setProperty("--ink", TINTS[d.role]);
    const opener = d.text
      ? `I am ${d.text}. Give me your tailored opening.`
      : `I'm here as ${d.role}. Give me your tailored opening.`;
    sendMessage({ text: opener }, { body: { persona: { role: d.role, text: d.text } } });
  };

  const send = (text: string) => sendMessage({ text }, { body: { persona } });

  return (
    <Conversation
      persona={persona}
      messages={messages as unknown as TranscriptMessage[]}
      status={status}
      onDeclare={declare}
      onSend={send}
    />
  );
}
```

(If `messages as unknown as TranscriptMessage[]` is unnecessary because the direct assignment type-checks, drop the cast. Keep `status` typed as it comes from `useChat`.)

- [ ] **Step 2: Delete the orphaned stylesheet**

```bash
git rm components/chat/Chat.module.css
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → exit 0 (no references to the deleted CSS or old imports remain).
Run: `npx vitest run` → all pass (no test imports `Chat.module.css` or `Chat` directly).
Run: `npm run build` → succeeds. `/` still prerenders.

- [ ] **Step 4: Manual end-to-end (recommended)** — `npm run dev`, open the app:
  - The resting page shows the entry screen (no input box visible).
  - Declaring via **free text** shows the "reading you as a ..." note echoing your words, then the assistant greeting and components compose in, and only after that does the input + suggested-direction chips compose in below.
  - Declaring via a **chip** shows no note, same opening-then-liberation flow.
  - Tapping a suggested direction sends it and the chips below the input update on the next turn.
  - With OS reduced-motion on, everything appears without staggered composition.
  If the model does not structure the opening well, note it (Task 6 tunes the prompt); rendering correctness is what this task verifies.

- [ ] **Step 5: Commit**

```bash
git add components/chat/Chat.tsx
git commit -m "refactor: Chat is a thin container delegating to Conversation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Teach the system prompt the opening structure

Tell the model to structure its first reply as greeting then lead then second item then `suggestDirections`, so the streamed order matches the cinematic sequence.

**Files:** Modify `lib/ai/system-prompt.ts`, `lib/ai/system-prompt.test.ts`.

- [ ] **Step 1: Add the failing assertion** — append inside the existing `describe("composeSystemPrompt", ...)` block in `lib/ai/system-prompt.test.ts`:

```ts
  it("teaches the first-turn opening structure", () => {
    const sp = composeSystemPrompt({ role: "engineer", text: null });
    expect(sp).toContain("tailored opening");
    expect(sp).toContain("greeting");
  });
```

- [ ] **Step 2: Run to verify it FAILS** — `npx vitest run lib/ai/system-prompt.test.ts` → FAIL (the opening guidance is not present yet).

- [ ] **Step 3: Add the opening guidance to `composeSystemPrompt` in `lib/ai/system-prompt.ts`** — insert this line into the instruction array immediately AFTER the `"Rules: ..."` line and BEFORE the blank line that precedes the tools list:

```ts
    "Opening: the visitor's first message asks for a tailored opening. For that first reply only, write a short greeting of one or two sentences tailored to them, then show the single most relevant lead item, then one more relevant item, then call suggestDirections. Keep the sequence tight and deliberate.",
```

(No em dashes. Leave the rest of the array order unchanged.)

- [ ] **Step 4: Run to verify it PASSES** — `npx vitest run lib/ai/system-prompt.test.ts` → PASS (original + new). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/system-prompt.ts lib/ai/system-prompt.test.ts
git commit -m "feat: teach the system prompt the first-turn opening structure

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Milestone gate

**Files:** none (verification only).

- [ ] **Step 1: Full suite** — Run: `npx vitest run` → all pass. Record totals (expect the Plan 4 count of 109 plus the tests added here, minus the one MessagePart test replaced).

- [ ] **Step 2: Types + build** — Run: `npx tsc --noEmit` (exit 0), then `npm run build` (success). Confirm `/` still prerenders and `/api/chat` + `/api/serenity/now` are still dynamic routes.

- [ ] **Step 3: Bundle privacy** — Run both and expect `clean`:

```bash
grep -rl "Cost trick" .next/static 2>/dev/null && echo "LEAK FOUND" || echo "clean"
grep -rl "aggressive context-management" .next/static 2>/dev/null && echo "LEAK FOUND" || echo "clean"
```

If either matches, STOP and report BLOCKED.

- [ ] **Step 4: No orphaned references** — confirm `Chat.module.css` is gone and nothing imports it:

```bash
test -e components/chat/Chat.module.css && echo "STILL EXISTS" || echo "deleted"
grep -rn "Chat.module.css" components/ app/ 2>/dev/null && echo "STILL REFERENCED" || echo "clean"
```

Expect `deleted` and `clean`.

- [ ] **Step 5: Client-safety** — confirm the new client-shared modules have no `server-only` import:

```bash
grep -rnE "^\s*import .*server-only" lib/chat/transcript.ts components/chat/AssignmentNote.tsx components/chat/Conversation.tsx 2>/dev/null && echo "SERVER-ONLY IN CLIENT" || echo "clean"
```

Expect `clean`.

- [ ] **Step 6: Commit** (allow empty if nothing changed):

```bash
git commit --allow-empty -m "chore: authored-opening milestone green (tests + build + bundle privacy)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (against the spec and roadmap)

- **§3.1 free-text "reading you as" note + echo:** Task 2 (`AssignmentNote`), shown by Task 4 only when `persona.text` is present. ✓
- **§3.2 authored opening (greeting, lead, second, then liberate):** greeting via token stream + components via `Composed` (Plans 3-4) in the model's order (Task 6 prompt), liberation gated and composed in (Task 1 `isOpeningComplete` + Task 4). ✓ (Exact millisecond beats noted as a future refinement.)
- **§3.3 liberation: persistent input + adaptive chips below it:** Task 3 (hoist out of transcript) + Task 4 (`latestDirections` below the `Input`, updating each turn). ✓
- **§4.3 Compose + reduced-motion:** the liberation and the note use `Composed`, which already respects `prefers-reduced-motion`. ✓
- **§5.9 directions below the input, adapting every turn:** Task 4. ✓
- **Testability:** the orchestration logic is pure (`isOpeningComplete`/`latestDirections`, fully tested) and the view is a pure-prop component (`Conversation`, fully tested); the only untested unit is the thin `Chat` container (tsc + build + manual, matching the prior approach for `Chat`). ✓
- **Placeholder scan:** every code step is complete; the only conditional is the optional `messages` cast in Task 5, with a concrete instruction. ✓
- **Type consistency:** `TranscriptMessage`, `isOpeningComplete`/`latestDirections`, `AssignmentNote`, `Conversation`, `Declaration`, and the `Input`/`SuggestedDirections` props are used identically across tasks. `MessagePart` no longer takes `onPick` after Task 3, and the only caller (`Chat`/`Conversation`) is updated in the same or a later task so every commit type-checks. ✓

## Out of scope (later plans / not requested)

- Exact millisecond beat tuning of the opening (a fixed inter-block delay via `Composed` `startDelay`). The felt sequence is delivered; precise pacing is a refinement.
- A fade-and-translate transition on the entry-to-opening swap (§3.1 "the resting prompt steps aside"). The swap is clean and the opening composes in; an explicit exit animation is optional polish.
- Sticky/pinned positioning of the input at the viewport bottom. It sits at the end of the content flow (as today); pinning is a layout enhancement.
- Hiding the synthetic opener user message ("I am ... Give me your tailored opening.") from the transcript. It renders subtly (tertiary mono) as today.
- Markdown/diagrams + real Redis/Turnstile + deploy (Plan 6).

## Open items carried forward

- `tech · year` `CONFIRM` placeholders in `content/projects.ts` (unrelated, still open from Plan 1).
- Plan 6 CSP must include `media-src https://stream.underclassradio.com` and `connect-src 'self'` (from Plan 4).
