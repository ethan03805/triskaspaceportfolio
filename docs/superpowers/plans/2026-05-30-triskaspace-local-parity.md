# Local Functional Parity Implementation Plan (Plan 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the local `triskaspace` dev build functionally faithful to what a live visitor will see — sanitized Markdown prose, a bounded lazy-loaded diagram, a production-equivalent CSP, and corrected content — without deploying and without requiring any Redis or Turnstile keys.

**Architecture:** Three render additions and one config layer. (1) A client `<Prose>` component renders assistant text through `react-markdown` + `remark-gfm` + a hardened `rehype-sanitize` schema, styled by descendant CSS in the refined-quiet system, replacing the raw `<p>{text}</p>` in `MessagePart`. (2) A new bounded `showDiagram` tool returns capped Mermaid source; a new `DiagramComponent` dynamically imports Mermaid (`securityLevel: 'strict'`), off the critical path, and degrades to a code block on failure — dispatched through `MessagePart` like every other tool-as-component. (3) A pure `lib/security/csp.ts` builds an environment-aware CSP (dev adds `'unsafe-eval'` so `next dev` keeps working; production is strict) plus standard security headers, wired through `next.config.ts`. Content corrections (Serenity `tech` → `python`, model chain → Kimi only) and a `.gitignore` hardening round it out. The protection seams (`lib/protection/*`) are deliberately left untouched and continue to no-op safely with no keys.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, AI SDK v6 (`ai`), Zod v4, Vitest 3 + Testing Library + jsdom. New deps: `react-markdown`, `remark-gfm`, `rehype-sanitize`, `mermaid`.

---

## Context for the implementer (read once)

You are extending an existing, fully-working app. Established patterns you MUST follow:

- **Tools are components.** `lib/ai/tools.ts` exports `buildTools()` returning a map of `tool({ description, inputSchema, execute })`. `execute` returns validated public data; that object is the component's props. The client dispatches in `components/chat/MessagePart.tsx` via a `switch` on `part.type === "tool-<name>"` plus a `TOOL_TYPES` Set; input states render `<Skeleton/>`, `output-error` renders a quiet note, `output-available` renders the component.
- **Render-boundary revalidation.** Every vocabulary component re-`.parse()`s its props with a client-safe Zod schema before rendering (see `components/vocabulary/projectShape.ts` → `renderProjectSchema`, used in `Project.tsx`/`Serenity.tsx`).
- **Compose motion.** Vocabulary components wrap their content in `<Composed className={styles.card}>` (`components/motion/Composed.tsx`). It is reduced-motion aware and wraps each child in a staggered `.line`. `null`/`false` children are dropped by `Children.toArray`.
- **Design tokens** live in `app/globals.css` (`--bg-raised`, `--border`, `--text`, `--text-secondary`, `--text-tertiary`, `--ink`, `--font-mono`, `--leading-prose`, `--max-col`). Use them; never hardcode colors.
- **Tests.** Vitest with `globals: true`, jsdom, `@` → repo root, `test/setup.ts` mocks `server-only`. Tool tests call `tools.X.execute!({...}, { toolCallId: "t", messages: [] })` and cast the result `as InferToolOutput<Tools["X"]>`. For module mocks use the hoisted idiom: `const { fn } = vi.hoisted(() => ({ fn: vi.fn() })); vi.mock("pkg", () => ({ default: { ... } }));`. For globals: `vi.stubGlobal("fetch", ...)` with `afterEach(() => vi.unstubAllGlobals())`.
- **Leak guard.** `lib/ai/leak-detect.ts` `isLeakedToolIntent()` already matches `/\b(show|suggest)[A-Z]\w*\s*\(/`, so `showDiagram(` is covered — no change needed there.
- **Privacy boundary is sacred.** `content/*.ts` are `server-only`; client components must only import client-safe modules. Never import `lib/ai/tools.ts` or `content/*` into a client component.
- **Commit trailer is mandatory** on every commit:

  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```

- After any `npm run build`, `next-env.d.ts` may be regenerated — if it changes, revert it with `git checkout -- next-env.d.ts` and never commit it.

**Branch:** All work happens on `build/local-parity` (created before Task 1). Do not commit to `main`.

---

## File Structure

**Create:**
- `lib/markdown/sanitize-schema.ts` — hardened `rehype-sanitize` schema (GFM minus raw images).
- `lib/markdown/sanitize-schema.test.ts`
- `components/chat/Prose.tsx` — `react-markdown` renderer, refined-quiet styled.
- `components/chat/Prose.module.css`
- `components/chat/Prose.test.tsx`
- `components/vocabulary/Diagram.tsx` — lazy Mermaid diagram component + `renderDiagramSchema`.
- `components/vocabulary/Diagram.module.css`
- `components/vocabulary/Diagram.test.tsx`
- `lib/security/csp.ts` — environment-aware CSP + security headers (pure, no imports).
- `lib/security/csp.test.ts`
- `content/projects.test.ts` — locks Serenity `tech === "python"`.

**Modify:**
- `content/projects.ts:11` — Serenity `tech: "typescript"` → `"python"`.
- `lib/ai/model.ts:10-14` — `MODEL_CHAIN` → Kimi only; update doc comments.
- `lib/ai/model.test.ts:6-8` — drop the multi-model assertions; assert length 1.
- `.gitignore` — add `.env` (exact) so a bare `.env` is never tracked.
- `lib/ai/tools.ts` — add the `showDiagram` tool.
- `lib/ai/tools.test.ts` — add `showDiagram` coverage.
- `components/chat/MessagePart.tsx` — text branch → `<Prose>`; dispatch `tool-showDiagram`; add to `TOOL_TYPES`.
- `components/chat/MessagePart.test.tsx` — add Markdown + diagram-dispatch coverage.
- `lib/ai/system-prompt.ts` — add the Markdown-allowed line and the `showDiagram` bullet.
- `next.config.ts` — wire `async headers()`.

**Leave untouched (verify only):** `lib/protection/rate-limiter.ts`, `lib/protection/verifier.ts`, `app/api/chat/route.ts`.

---

### Task 1: Content & config corrections

**Files:**
- Modify: `content/projects.ts:11`
- Create: `content/projects.test.ts`
- Modify: `lib/ai/model.ts:10-37`
- Modify: `lib/ai/model.test.ts:5-15`
- Modify: `.gitignore`

- [ ] **Step 1: Create the branch**

Run:
```bash
git checkout -b build/local-parity
```

- [ ] **Step 2: Write the failing content test**

Create `content/projects.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { projects } from "./projects";

describe("projects content", () => {
  it("lists Serenity Radio's tech as python", () => {
    const serenity = projects.find((p) => p.id === "serenity");
    expect(serenity?.tech).toBe("python");
  });
  it("keeps Serenity's year at 2026", () => {
    const serenity = projects.find((p) => p.id === "serenity");
    expect(serenity?.year).toBe("2026");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run content/projects.test.ts`
Expected: FAIL — "expected 'typescript' to be 'python'".

- [ ] **Step 4: Correct Serenity's tech**

In `content/projects.ts`, change line 11 from:
```ts
    tech: "typescript",
```
to:
```ts
    tech: "python",
```

- [ ] **Step 5: Update the model chain to Kimi only**

Replace `lib/ai/model.ts` lines 3-37 (the doc block, `MODEL_CHAIN`, and `modelSettings`) with:
```ts
/**
 * The OpenRouter model slug used for chat.
 *
 * Single-model by product decision: Kimi K2.6 only, no fallback chain. Kept as
 * a one-element array so the request layer and any future re-expansion stay
 * unchanged. The slug is confirmed-at-deploy.
 */
export const MODEL_CHAIN = ["moonshotai/kimi-k2.6"] as const;

/**
 * Construct an OpenRouter provider instance.
 *
 * Construction is synchronous and lazy: it does not perform any network call,
 * so it imports cleanly under Vitest even with an empty API key. The key is
 * read at call time from the environment.
 *
 * In the v2 @openrouter/ai-sdk-provider API the returned provider is callable
 * directly to obtain a language model, e.g. `openrouter()("moonshotai/kimi-k2.6")`
 * (equivalently `.chat(slug)` / `.languageModel(slug)`).
 */
export function openrouter() {
  return createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY ?? "" });
}

/**
 * OpenRouter chat settings. With a single model this carries just that slug;
 * the `models` array stays so re-introducing fallback later is a one-line change.
 */
export function modelSettings(): { models: string[] } {
  return { models: [...MODEL_CHAIN] };
}
```
(Leave `primaryModel()` at the bottom of the file unchanged — it already reads `MODEL_CHAIN[0]` + `modelSettings()`.)

- [ ] **Step 6: Update the model test**

In `lib/ai/model.test.ts`, replace the first `it(...)` block (lines 5-9, the one asserting the chain) so it reads:
```ts
  it("defaults to Kimi K2.6 as the only model", () => {
    expect(MODEL_CHAIN[0]).toBe("moonshotai/kimi-k2.6");
    expect(MODEL_CHAIN).toHaveLength(1);
  });
```
Leave the `modelSettings` test (`expect(modelSettings().models).toEqual([...MODEL_CHAIN])`) unchanged — it still holds.

- [ ] **Step 7: Harden .gitignore**

In `.gitignore`, on the line immediately after `.env*.local`, add a bare-`.env` ignore (this does NOT ignore `.env.example`, which stays tracked):
```
.env
```

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS (all files green, including the new `content/projects.test.ts` and the updated `model.test.ts`). If `components/vocabulary/Serenity.test.tsx` or `components/chat/MessagePart.test.tsx` assert the literal text `typescript`, they don't — they only assert `"Serenity Radio"` renders — so they stay green; their `tech: "typescript"` fixtures are component props, not content, and may be left as-is.

- [ ] **Step 9: Commit**

```bash
git add content/projects.ts content/projects.test.ts lib/ai/model.ts lib/ai/model.test.ts .gitignore
git commit -m "$(cat <<'EOF'
fix: Serenity tech is python, model chain is Kimi-only, ignore bare .env

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Markdown sanitize schema

**Files:**
- Create: `lib/markdown/sanitize-schema.ts`
- Create: `lib/markdown/sanitize-schema.test.ts`

- [ ] **Step 1: Install the Markdown dependencies**

Run:
```bash
npm install react-markdown@^9.0.1 remark-gfm@^4.0.1 rehype-sanitize@^6.0.0
```
Expected: installs cleanly. If npm reports a React 19 peer-dependency conflict, re-run with `npm install --legacy-peer-deps <same packages>` (react-markdown 9.0.1+ supports React 19; the warning is conservative). Verify `package.json` lists all three under `dependencies`.

- [ ] **Step 2: Write the failing test**

Create `lib/markdown/sanitize-schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sanitizeSchema } from "./sanitize-schema";

describe("sanitizeSchema", () => {
  it("allows GFM table and code elements", () => {
    const tags = sanitizeSchema.tagNames ?? [];
    for (const t of ["table", "thead", "tbody", "tr", "th", "td", "code", "pre", "blockquote", "a"]) {
      expect(tags).toContain(t);
    }
  });
  it("disallows raw images and scripts", () => {
    const tags = sanitizeSchema.tagNames ?? [];
    expect(tags).not.toContain("img");
    expect(tags).not.toContain("script");
    expect(tags).not.toContain("iframe");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run lib/markdown/sanitize-schema.test.ts`
Expected: FAIL — "Cannot find module './sanitize-schema'".

- [ ] **Step 4: Write the schema**

Create `lib/markdown/sanitize-schema.ts`:
```ts
// client-safe: hardened rehype-sanitize schema (no "server-only" import).
import { defaultSchema } from "rehype-sanitize";

/**
 * GFM-friendly sanitize schema for assistant prose. Starts from rehype-sanitize's
 * safe defaults (which already restrict URL protocols and strip scripts/iframes)
 * and additionally drops <img>: the assistant renders live components, never
 * remote images, so disallowing them removes a tracking / IP-leak vector.
 */
export const sanitizeSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((t) => t !== "img"),
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/markdown/sanitize-schema.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/markdown/sanitize-schema.ts lib/markdown/sanitize-schema.test.ts
git commit -m "$(cat <<'EOF'
feat: hardened GFM sanitize schema for assistant prose

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Prose component

**Files:**
- Create: `components/chat/Prose.tsx`
- Create: `components/chat/Prose.module.css`
- Create: `components/chat/Prose.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/chat/Prose.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Prose } from "./Prose";

describe("Prose", () => {
  it("renders bold and headings", () => {
    render(<Prose>{"# Title\n\nEthan built **Serenity**."}</Prose>);
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("Serenity").tagName).toBe("STRONG");
  });
  it("renders a GFM table", () => {
    render(<Prose>{"| Project | Year |\n|---|---|\n| Axiom | 2026 |"}</Prose>);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Project" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Axiom" })).toBeInTheDocument();
  });
  it("does not execute or emit raw HTML", () => {
    const { container } = render(<Prose>{"<script>alert(1)</script> hello"}</Prose>);
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText(/hello/)).toBeInTheDocument();
  });
  it("renders external links safely", () => {
    render(<Prose>{"[site](https://agentaxiom.space)"}</Prose>);
    const a = screen.getByRole("link", { name: "site" });
    expect(a).toHaveAttribute("href", "https://agentaxiom.space");
    expect(a).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/chat/Prose.test.tsx`
Expected: FAIL — "Cannot find module './Prose'".

- [ ] **Step 3: Write the component**

Create `components/chat/Prose.tsx`:
```tsx
"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { sanitizeSchema } from "@/lib/markdown/sanitize-schema";
import styles from "./Prose.module.css";

/**
 * Renders an assistant text part as sanitized GFM Markdown, styled in the
 * refined-quiet system. Raw HTML is never parsed (no rehype-raw), and
 * rehype-sanitize provides defense in depth.
 */
export function Prose({ children }: { children: string }) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className={styles.link}>
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 4: Write the styles**

Create `components/chat/Prose.module.css`:
```css
.prose { font-size: 14px; color: var(--text); line-height: var(--leading-prose); }
.prose :first-child { margin-top: 0; }
.prose :last-child { margin-bottom: 0; }

.prose p { margin: 10px 0; }
.prose h1, .prose h2, .prose h3 { color: var(--text); font-weight: 500; line-height: 1.3; margin: 16px 0 8px; }
.prose h1 { font-size: 17px; }
.prose h2 { font-size: 15px; }
.prose h3 { font-size: 14px; }

.prose ul, .prose ol { margin: 10px 0; padding-left: 20px; }
.prose li { margin: 4px 0; }

.prose a, .link { color: var(--ink); text-decoration: none; }
.prose a:hover, .link:hover { text-decoration: underline; }

.prose blockquote {
  margin: 12px 0; padding: 2px 14px;
  border-left: 2px solid var(--border); color: var(--text-secondary);
}

.prose hr { border: none; border-top: 1px solid var(--border-soft); margin: 16px 0; }

/* inline code */
.prose code {
  font-family: var(--font-mono), monospace; font-size: 12.5px;
  background: var(--bg-raised); border: 1px solid var(--border-soft);
  border-radius: 3px; padding: 1px 5px;
}
/* code block: raised surface, no inline border doubling */
.prose pre {
  margin: 12px 0; padding: 12px 14px; overflow-x: auto;
  background: var(--bg-raised); border: 1px solid var(--border);
}
.prose pre code { background: none; border: none; padding: 0; font-size: 12.5px; }

/* GFM tables: hairline borders */
.prose table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
.prose th, .prose td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; }
.prose th { color: var(--text); font-weight: 500; background: var(--bg-raised); }
.prose td { color: var(--text-secondary); }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/chat/Prose.test.tsx`
Expected: PASS (all four cases).

- [ ] **Step 6: Commit**

```bash
git add components/chat/Prose.tsx components/chat/Prose.module.css components/chat/Prose.test.tsx
git commit -m "$(cat <<'EOF'
feat: Prose — sanitized GFM markdown renderer, refined-quiet styled

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Render assistant text through Prose

**Files:**
- Modify: `components/chat/MessagePart.tsx:44-48`
- Modify: `components/chat/MessagePart.test.tsx`

- [ ] **Step 1: Write the failing test**

In `components/chat/MessagePart.test.tsx`, add inside the `describe("MessagePart", ...)` block:
```tsx
  it("renders markdown formatting in a text part", () => {
    render(<MessagePart part={{ type: "text", text: "Ethan built **Serenity Radio**." }} />);
    expect(screen.getByText("Serenity Radio").tagName).toBe("STRONG");
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/chat/MessagePart.test.tsx`
Expected: FAIL — the existing `<p>{part.text}</p>` renders the literal asterisks, so no `STRONG` element exists.

- [ ] **Step 3: Wire Prose into MessagePart**

In `components/chat/MessagePart.tsx`:

Add the import after line 9 (`import { Skeleton } from "./Skeleton";`):
```tsx
import { Prose } from "./Prose";
```

Replace the text branch (lines 45-48) so it reads:
```tsx
  if (part.type === "text") {
    if (!part.text || isLeakedToolIntent(part.text)) return null;
    return <Prose>{part.text}</Prose>;
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run components/chat/MessagePart.test.tsx`
Expected: PASS — the new markdown test passes; the existing "renders normal prose" (`/Ethan built/`) and "suppresses leaked tool JSON" (guard returns `null` before `Prose`) both stay green.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add components/chat/MessagePart.tsx components/chat/MessagePart.test.tsx
git commit -m "$(cat <<'EOF'
feat: render assistant text as sanitized markdown via Prose

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: The bounded showDiagram tool

**Files:**
- Modify: `lib/ai/tools.ts`
- Modify: `lib/ai/tools.test.ts`

- [ ] **Step 1: Write the failing test**

In `lib/ai/tools.test.ts`, add at the end of the file:
```ts
describe("showDiagram tool", () => {
  it("returns a trimmed title and the mermaid source", async () => {
    const tools = buildTools();
    const out = (await tools.showDiagram.execute!(
      { title: "  Flow  ", mermaid: "graph TD; A-->B" },
      { toolCallId: "t", messages: [] } as never,
    )) as InferToolOutput<Tools["showDiagram"]>;
    expect(out.title).toBe("Flow");
    expect(out.mermaid).toBe("graph TD; A-->B");
  });
  it("nulls an empty title and caps very long source", async () => {
    const tools = buildTools();
    const long = "graph TD;" + "A-->B;".repeat(2000);
    const out = (await tools.showDiagram.execute!(
      { mermaid: long },
      { toolCallId: "t", messages: [] } as never,
    )) as InferToolOutput<Tools["showDiagram"]>;
    expect(out.title).toBeNull();
    expect(out.mermaid.length).toBeLessThanOrEqual(4000);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: FAIL — `tools.showDiagram` is `undefined`.

- [ ] **Step 3: Add the tool**

In `lib/ai/tools.ts`, add this entry to the object returned by `buildTools()`, immediately after the `suggestDirections` tool (after its closing `}),` on line 99, before the closing `};` on line 100):
```ts
    showDiagram: tool({
      description:
        "Render a small diagram from Mermaid source (flowchart, sequence, simple graph). Use sparingly, only when a diagram genuinely clarifies a relationship or process. Keep it small.",
      inputSchema: z.object({
        title: z.string().optional().describe("short caption for the diagram"),
        mermaid: z.string().min(1).describe("Mermaid diagram source, e.g. 'graph TD; A-->B'"),
      }),
      execute: async ({ title, mermaid }) => ({
        title: title?.trim() ? title.trim() : null,
        mermaid: mermaid.slice(0, 4000),
      }),
    }),
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: PASS (both new cases plus all existing tool tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/tools.ts lib/ai/tools.test.ts
git commit -m "$(cat <<'EOF'
feat: showDiagram tool — bounded, length-capped mermaid source

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: The Diagram component (lazy Mermaid)

**Files:**
- Create: `components/vocabulary/Diagram.tsx`
- Create: `components/vocabulary/Diagram.module.css`
- Create: `components/vocabulary/Diagram.test.tsx`

- [ ] **Step 1: Install Mermaid**

Run:
```bash
npm install mermaid@^11.4.0
```
Expected: installs cleanly; `package.json` `dependencies` lists `mermaid`.

- [ ] **Step 2: Write the failing test**

Create `components/vocabulary/Diagram.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { mermaidRender, initialize } = vi.hoisted(() => ({
  mermaidRender: vi.fn(),
  initialize: vi.fn(),
}));
vi.mock("mermaid", () => ({ default: { initialize, render: mermaidRender } }));

import { DiagramComponent } from "./Diagram";

beforeEach(() => {
  mermaidRender.mockReset();
  initialize.mockReset();
});

describe("DiagramComponent", () => {
  it("renders the title and the rendered svg", async () => {
    mermaidRender.mockResolvedValue({ svg: "<svg data-testid='mmd'></svg>" });
    const { container } = render(<DiagramComponent title="Flow" mermaid="graph TD; A-->B" />);
    expect(screen.getByText("Flow")).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
    expect(initialize).toHaveBeenCalled();
  });
  it("falls back to the source as a code block when rendering fails", async () => {
    mermaidRender.mockRejectedValue(new Error("boom"));
    render(<DiagramComponent title={null} mermaid="graph TD; A-->B" />);
    expect(await screen.findByText(/graph TD/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run components/vocabulary/Diagram.test.tsx`
Expected: FAIL — "Cannot find module './Diagram'".

- [ ] **Step 4: Write the component**

Create `components/vocabulary/Diagram.tsx`:
```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Composed } from "@/components/motion/Composed";
import styles from "./Diagram.module.css";

export const renderDiagramSchema = z.object({
  title: z.string().nullable().optional(),
  mermaid: z.string().min(1),
});
export type RenderDiagram = z.infer<typeof renderDiagramSchema>;

let seq = 0;

export function DiagramComponent(props: { title?: string | null; mermaid: string }) {
  const { title, mermaid } = renderDiagramSchema.parse(props); // render-boundary revalidation
  const ref = useRef<HTMLDivElement | null>(null);
  const idRef = useRef("mermaid-" + ++seq);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mod = await import("mermaid");
        const mermaidApi = mod.default;
        mermaidApi.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark" });
        const { svg } = await mermaidApi.render(idRef.current, mermaid);
        if (active && ref.current) {
          ref.current.innerHTML = svg;
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [mermaid]);

  return (
    <Composed className={styles.card}>
      {title ? <div className={styles.title}>{title}</div> : null}
      {failed ? (
        <pre className={styles.fallback}>{mermaid}</pre>
      ) : (
        <div className={styles.svg} ref={ref} role="img" aria-label={title ?? "diagram"} />
      )}
    </Composed>
  );
}
```

- [ ] **Step 5: Write the styles**

Create `components/vocabulary/Diagram.module.css`:
```css
.card { border: 1px solid var(--border); background: var(--bg-raised); padding: 14px 16px; margin: 14px 0; }
.title { font-size: 12.5px; color: var(--text-secondary); margin-bottom: 10px; }
.svg { overflow-x: auto; }
.svg svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
.fallback {
  font-family: var(--font-mono), monospace; font-size: 12px; color: var(--text-tertiary);
  white-space: pre-wrap; word-break: break-word; margin: 0;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run components/vocabulary/Diagram.test.tsx`
Expected: PASS (both cases). A benign React `act()` warning from the async mount-render resolving after assertions may appear, as it does for the Serenity component test; it does not fail the test.

- [ ] **Step 7: Commit**

```bash
git add components/vocabulary/Diagram.tsx components/vocabulary/Diagram.module.css components/vocabulary/Diagram.test.tsx package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: Diagram — lazy-loaded Mermaid (strict), graceful code-block fallback

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Dispatch the diagram + teach the system prompt

**Files:**
- Modify: `components/chat/MessagePart.tsx`
- Modify: `components/chat/MessagePart.test.tsx`
- Modify: `lib/ai/system-prompt.ts`
- Modify: `lib/ai/system-prompt.test.ts`

- [ ] **Step 1: Write the failing tests**

In `components/chat/MessagePart.test.tsx`, add a hoisted Mermaid mock at the TOP of the file (after the existing imports on lines 1-3), so the dispatched diagram does not try to load real Mermaid in jsdom:
```tsx
vi.mock("mermaid", () => ({
  default: { initialize: vi.fn(), render: vi.fn().mockResolvedValue({ svg: "<svg></svg>" }) },
}));
```
Then add inside the `describe("MessagePart", ...)` block:
```tsx
  it("renders the diagram for tool-showDiagram output-available", () => {
    render(
      <MessagePart
        part={{ type: "tool-showDiagram", state: "output-available", output: { title: "Flow", mermaid: "graph TD; A-->B" } }}
      />,
    );
    expect(screen.getByText("Flow")).toBeInTheDocument();
  });
```

In `lib/ai/system-prompt.test.ts`, add inside its top-level describe:
```ts
  it("documents the showDiagram tool", () => {
    const prompt = composeSystemPrompt({ role: "curious", text: null });
    expect(prompt).toContain("showDiagram");
  });
  it("allows markdown for prose answers", () => {
    const prompt = composeSystemPrompt({ role: "curious", text: null });
    expect(prompt.toLowerCase()).toContain("markdown");
  });
```
(If `system-prompt.test.ts` imports `composeSystemPrompt` differently, match its existing import; the assertions are what matter.)

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run components/chat/MessagePart.test.tsx lib/ai/system-prompt.test.ts`
Expected: FAIL — `tool-showDiagram` is not dispatched (renders `null`), and the prompt mentions neither `showDiagram` nor markdown.

- [ ] **Step 3: Dispatch the diagram in MessagePart**

In `components/chat/MessagePart.tsx`:

Add the import after the `SerenityComponent` import (line 8):
```tsx
import { DiagramComponent } from "@/components/vocabulary/Diagram";
```

Add a case to `renderTool`, after the `tool-showContact` case (line 32):
```tsx
    case "tool-showDiagram":
      return <DiagramComponent title={o.title ?? null} mermaid={o.mermaid} />;
```

Add `"tool-showDiagram"` to the `TOOL_TYPES` Set (lines 38-42):
```tsx
const TOOL_TYPES = new Set([
  "tool-showProject", "tool-showProjects", "tool-showSkills",
  "tool-showExperience", "tool-showEducation", "tool-showContact",
  "tool-showSerenity", "tool-showDiagram",
]);
```

- [ ] **Step 4: Teach the system prompt**

In `lib/ai/system-prompt.ts`:

Add the `showDiagram` bullet to the tools list, immediately after the `showContact` bullet (line 21):
```ts
    "- showDiagram: render a small Mermaid diagram (flowchart, sequence, simple graph). Use sparingly, only when a diagram genuinely clarifies a relationship or process.",
```

Add a Markdown-allowance sentence to the existing "Rules:" string (line 12). Change it from ending `...No em dashes, no superlatives.` to:
```ts
    "Rules: only state what is in the content below. If asked something not present, say it is not available. Never claim to be Ethan. Default to third person; warm and casual only for the friend persona. No em dashes, no superlatives. You may use Markdown in prose answers (headings, lists, GFM tables, inline code, code blocks) when it genuinely aids clarity; use it sparingly and prefer live components.",
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run components/chat/MessagePart.test.tsx lib/ai/system-prompt.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck + full suite**

Run: `npx tsc --noEmit && npm test`
Expected: 0 type errors; all tests green.

- [ ] **Step 7: Commit**

```bash
git add components/chat/MessagePart.tsx components/chat/MessagePart.test.tsx lib/ai/system-prompt.ts lib/ai/system-prompt.test.ts
git commit -m "$(cat <<'EOF'
feat: dispatch showDiagram and teach the prompt markdown + diagrams

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Production-equivalent CSP + security headers

**Files:**
- Create: `lib/security/csp.ts`
- Create: `lib/security/csp.test.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/security/csp.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./csp";

describe("contentSecurityPolicy", () => {
  it("allows the Serenity stream as a media source", () => {
    expect(contentSecurityPolicy()).toContain("media-src 'self' https://stream.underclassradio.com");
  });
  it("keeps connect and font same-origin", () => {
    const csp = contentSecurityPolicy();
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("font-src 'self'");
  });
  it("is strict in production (no unsafe-eval)", () => {
    expect(contentSecurityPolicy({ dev: false })).not.toContain("'unsafe-eval'");
  });
  it("permits unsafe-eval in development so next dev works", () => {
    expect(contentSecurityPolicy({ dev: true })).toContain("'unsafe-eval'");
  });
});

describe("securityHeaders", () => {
  it("includes CSP plus standard hardening headers", () => {
    const keys = securityHeaders().map((h) => h.key);
    expect(keys).toContain("Content-Security-Policy");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("X-Content-Type-Options");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/security/csp.test.ts`
Expected: FAIL — "Cannot find module './csp'".

- [ ] **Step 3: Write the CSP builder**

Create `lib/security/csp.ts`:
```ts
// Pure, dependency-free CSP builder. Imported by next.config.ts (build/runtime)
// and by tests. Must not import "server-only" or any app module.

/**
 * Build the Content-Security-Policy header value.
 *
 * Production is strict. Development adds 'unsafe-eval' (required by React Fast
 * Refresh under `next dev`) and a websocket connect source (HMR) so local
 * development keeps working while the rest of the policy stays faithful to prod.
 */
export function contentSecurityPolicy(opts: { dev?: boolean } = {}): string {
  const dev = opts.dev ?? process.env.NODE_ENV !== "production";

  const scriptSrc = ["'self'", "'unsafe-inline'"]; // nonce-tightening deferred to Plan 7
  const connectSrc = ["'self'"]; // chat API + serenity now-proxy (same origin)
  if (dev) {
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push("ws:");
  }

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"], // CSS modules + the --ink inline style on <html>
    "img-src": ["'self'", "data:"],
    "font-src": ["'self'"], // next/font self-hosts at build time
    "connect-src": connectSrc,
    "media-src": ["'self'", "https://stream.underclassradio.com"], // the live Serenity stream
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");
}

/** CSP plus standard hardening headers, in Next.js `headers()` shape. */
export function securityHeaders(): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy() },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/security/csp.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Wire the headers into next.config**

Replace `next.config.ts` entirely with:
```ts
import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/csp";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
```

- [ ] **Step 6: Verify the dev server boots under the CSP**

Run: `npm run build`
Expected: build succeeds (this also confirms `next.config.ts` imports `lib/security/csp` cleanly). If `next-env.d.ts` changed, run `git checkout -- next-env.d.ts`.

- [ ] **Step 7: Commit**

```bash
git add lib/security/csp.ts lib/security/csp.test.ts next.config.ts
git commit -m "$(cat <<'EOF'
feat: production-equivalent CSP + security headers (dev-permissive)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Faithfulness verification (manual + final review)

**Files:** none (verification only).

- [ ] **Step 1: Full automated gate**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all tests green, 0 type errors, clean production build. Revert `next-env.d.ts` if regenerated.

- [ ] **Step 2: Client-bundle privacy re-check**

Run:
```bash
grep -rl "Cost trick" .next/static 2>/dev/null && echo "LEAK" || echo "clean"
```
Expected: `clean` (no private note in the client bundle).

- [ ] **Step 3: Manual local walkthrough under the DEV server**

Run `npm run dev`, open the local URL, and confirm (with `OPENROUTER_API_KEY` present in `.env.local`):
- The page loads with no CSP console errors that break rendering.
- Declaring a persona produces the authored opening → liberation.
- If the model answers with Markdown (or you prompt "answer me in a markdown table"), it renders as a styled table/list/code — not raw asterisks.
- Prompting for a diagram (e.g. "draw a simple flowchart of Axiom's orchestrator → workers") renders a Mermaid diagram, or degrades to a readable code block.
- The Serenity component shows live now-playing and "listen live" plays audio (this exercises `media-src` + `connect-src`).

- [ ] **Step 4: Manual walkthrough under the PRODUCTION CSP**

Run `npm run build && npm start`, open the local URL, and repeat the Serenity audio + diagram checks. This exercises the STRICT production CSP (no `'unsafe-eval'`). Note explicitly in the final report:
- Whether Mermaid renders under the strict CSP or falls back to the code block. If it falls back because Mermaid needs `'unsafe-eval'`, that is acceptable for Plan 6 (graceful degrade); record it as a Plan 7 decision (allow a scoped exception vs. keep the fallback). Do NOT loosen the production CSP in this plan.
- Confirm the Serenity stream still plays and fonts still load under the strict policy.

- [ ] **Step 5: Final whole-implementation review**

Dispatch the final code reviewer over the whole `build/local-parity` diff (all of Tasks 1-8). Then use **superpowers:finishing-a-development-branch**.

---

## Self-Review (completed by plan author)

- **Spec coverage:** §5.7 / §8.5 Markdown → Tasks 2-4; "small graphics" (bounded, lazy, sanitized) → Tasks 5-7 (Mermaid, `securityLevel: 'strict'`, dynamic import, 4000-char cap); §7.6 content confirm (Serenity tech, model) → Task 1; CSP with `media-src https://stream.underclassradio.com` + `connect-src 'self'` → Task 8. §9 protection deferral honored: `lib/protection/*` untouched, app runs keyless (verified Step 3/4). Deployment (Vercel, domain, real Redis/Turnstile) is explicitly out of scope → Plan 7.
- **Placeholder scan:** every code step contains complete code; no TODO/TBD.
- **Type consistency:** `showDiagram` returns `{ title: string | null, mermaid: string }`; `renderDiagramSchema` accepts `title` nullable+optional and `MessagePart` passes `o.title ?? null` — consistent. `MODEL_CHAIN` stays a readonly tuple consumed by `modelSettings`/`primaryModel` unchanged.
- **Known risk recorded:** Mermaid under the strict production CSP may require `'unsafe-eval'`; if so the component degrades to a code block (Task 9 Step 4) — recorded for Plan 7 rather than loosening CSP now.
