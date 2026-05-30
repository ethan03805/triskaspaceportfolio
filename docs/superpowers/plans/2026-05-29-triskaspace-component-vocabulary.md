# triskaspace Full Component Vocabulary Implementation Plan (Plan 3 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the generative-UI component vocabulary from the spec (§5, §6): tools and live components for the multi-project overview (lead + rows + gated divider), skills (emphasis tailoring), experience, education, contact/resume (with a downloadable resume asset), and `suggestDirections` (the branching chips), all wired into the transcript, with the system prompt taught the new vocabulary and the gating rule.

**Architecture:** Keep Plan 1's tools-as-components design and Plan 2's reliability seams. Each new renderable is one tool (validated public data in, public props out) plus one client component that re-validates its props with a client-safe Zod `renderSchema` at the render boundary and composes itself in with the `Composed` primitive. A single emphasis helper drives "relevant in primary, the rest recede" tailoring. Gated projects stay public data (no private fields) but are surfaced by the model only when relevant, via an `includeGated` flag the tool layer honors. `MessagePart` gains a branch per tool part; `suggestDirections` chips call back up to `Chat.sendMessage` so a tap continues the conversation.

**Tech Stack:** Same as Plans 1–2. Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, `ai` v6 (`tool()` with `inputSchema`), `@ai-sdk/react` v3 (`useChat`), Zod v4, Vitest 3 + @testing-library/react 16 + jsdom, plain CSS modules + the design tokens in `app/globals.css`.

**Branch:** `build/component-vocabulary` (create off `main`). Commit locally per task; do not push (the finishing-a-development-branch wrap-up handles merge/push). Append the trailer to every commit:

```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

Ignore any unstaged `next-env.d.ts` change (Next auto-generates it; do not stage it).

**Spec:** `docs/superpowers/specs/2026-05-29-triskaspace-dynamic-portfolio-design.md` (§5 component vocabulary, §5.3 overview, §5.4 skills, §5.5 experience, §5.6 education, §5.8 contact/resume, §5.9 suggested directions; §6 tailoring engine).

---

## Foundation context the engineer needs

These already exist, are tested, and set the patterns to copy exactly:

- **Content boundary.** `content/schema.ts` exports `projectSchema`/`publicProjectSchema` (+ `PublicProject`), `skillGroupSchema`/`SkillGroup`, `experienceSchema`/`Experience`, `educationSchema`/`Education`, `profileSchema`/`Profile`, and `audienceTag` enum (`"aerospace" | "ai" | "security" | "data" | "business" | "general"`). `content/public.ts` is the project choke point (`toPublicProject`/`toPublicProjects`, both `parse` through `publicProjectSchema`). `content/index.ts` exports `getPublicProjects()`, `getFeaturedPublicProjects()`, `getGatedPublicProjects()`, `getPublicProjectById(id)` — all project-only so far. Every content module starts with `import "server-only"`.
- **Content data.** `content/projects.ts` (serenity, axiom, vox = featured; sstpa, satellite = gated; serenity carries `privateNotes` with the cost trick). `content/skills.ts` (`skills: SkillGroup[]`, ids: languages, ai-ml, data, tooling). `content/experience.ts` (`experience: Experience[]`, ids: ng, pampco). `content/education.ts` (`education: Education[]`, ids: depaul, scranton). `content/profile.ts` (`profile`, email `ethan@triska.space`).
- **AI layer.** `lib/ai/tools.ts` — `export function buildTools()` returns `{ showProject }`; `export type Tools = ReturnType<typeof buildTools>`. `showProject` input `{ id, emphasis }`, output `{ project, emphasis }`, re-validates with `publicProjectSchema.parse`. `lib/ai/system-prompt.ts` — `composeSystemPrompt(persona)` (server-only, embeds `buildContext()`). `lib/ai/leak-detect.ts` — `isLeakedToolIntent(text)` (client-safe; flags `showProject(...)`, tool tags, whole-message JSON). `app/api/chat/route.ts` — wires `buildTools()`, `primaryModel()`, repair, verifier gate.
- **Components.** `components/vocabulary/Project.tsx` — `ProjectComponent({ project, emphasis })`, defines a client-safe `renderSchema` (zod) and `renderSchema.parse(project)` at the top (render-boundary revalidation), wraps output in `<Composed className={styles.card}>`, exports `type RenderProject`. `components/motion/Composed.tsx` — `<Composed as? className? startDelay?>` renders each child as a staggered "line", guards `window.matchMedia` for jsdom, respects reduced-motion. `components/chat/MessagePart.tsx` — switches on `part.type`: `text` → suppress empty/leaked else `<p>`; `tool-showProject` → output-available renders `ProjectComponent`, output-error renders `styles.error` note, input-* renders `<Skeleton />`. `components/chat/Skeleton.tsx` — `aria-label="composing" role="status"`, pulse with reduced-motion guard. `components/chat/Chat.tsx` — `useChat` host; renders `m.parts.map((part,i) => <MessagePart part={part} />)`; `<Input onSend={(text) => sendMessage({ text }, { body: { persona } })} />`. `components/entry/Entry.tsx` — bracketed mono chips look `[ label ]`.
- **Test conventions.** Vitest, `server-only` mocked in `test/setup.ts`, `@/*` alias to project root, jsdom (no `matchMedia` — guard any use). Single file: `npx vitest run <path>`. Whole suite: `npx vitest run`. Type-check: `npx tsc --noEmit`. Build: `npm run build`.

**The non-negotiable boundary (spec §7.3):** private values (`privateNotes` / the "Cost trick" / "aggressive context-management" strings) must never reach the model context or the client bundle. Every new tool returns data through a public selector that re-validates with a Zod schema; every new component re-validates props with a client-safe schema and never imports `server-only`. The milestone gate greps `.next/static` for the private strings.

---

## File structure created/modified by this plan

```
content/
  contact.ts            # NEW: RESUME_URL + public contact schema/types (server-only)
  contact.test.ts       # NEW
  index.ts              # MODIFY: add getPublicSkills/Experience/Education/Contact selectors
  index.test.ts         # MODIFY: add selector assertions
lib/
  emphasis.ts           # NEW: matchesEmphasis (client-safe, no server-only)
  emphasis.test.ts      # NEW
  ai/
    tools.ts            # MODIFY: add showProjects/showSkills/showExperience/showEducation/showContact/suggestDirections
    tools.test.ts       # MODIFY: add per-tool assertions
    leak-detect.ts      # MODIFY: generalize to any show*/suggest* call style
    leak-detect.test.ts # MODIFY: add new-tool cases
    system-prompt.ts    # MODIFY: teach the tool vocabulary + gating rule
    system-prompt.test.ts # MODIFY: assert new guidance
components/vocabulary/
  projectShape.ts       # NEW: shared client-safe renderProjectSchema + RenderProject
  Project.tsx           # MODIFY: import shared shape (DRY; tests stay green)
  Projects.tsx          # NEW: multi-project overview (lead + rows + gated divider)
  Projects.module.css   # NEW
  Projects.test.tsx     # NEW
  Skills.tsx            # NEW
  Skills.module.css     # NEW
  Skills.test.tsx       # NEW
  Experience.tsx        # NEW
  Experience.module.css # NEW
  Experience.test.tsx   # NEW
  Education.tsx         # NEW
  Education.module.css  # NEW
  Education.test.tsx    # NEW
  Contact.tsx           # NEW
  Contact.module.css    # NEW
  Contact.test.tsx      # NEW
components/chat/
  SuggestedDirections.tsx       # NEW: bracketed mono chips, onPick callback
  SuggestedDirections.module.css# NEW
  SuggestedDirections.test.tsx  # NEW
  MessagePart.tsx       # MODIFY: dispatch all new tool parts; thread onPick
  MessagePart.test.tsx  # MODIFY: add new-tool rendering tests
  Chat.tsx              # MODIFY: pass onPick={sendMessage(...)} to MessagePart
public/
  ethan-triska-resume.pdf  # NEW: downloadable resume asset (generated from resume.md)
```

---

## Conventions for this plan

- TDD per task: write the failing test, run it red, implement minimally, run it green, commit.
- No em dashes in any visitor-facing copy. Use periods, commas, parentheses. (Tests below assert nothing with em dashes; keep component copy clean.)
- Every new client component: `"use client"`, define a client-safe `renderSchema`, call `renderSchema.parse(props)` first, never `import "server-only"`.
- Component styles live in a colocated `.module.css` and use only the design tokens (`--bg-raised`, `--border`, `--text`, `--text-secondary`, `--text-tertiary`, `--ink`, `--font-mono`, `--leading-prose`). No new colors, no gradients.
- Mono meta on project-like components is exactly two items: `tech · year` (middot `·`, U+00B7).

---

## Task 1: Non-project public selectors + contact module

Extend the content boundary to skills, experience, education, and a contact object, all through validating selectors (the choke point pattern). Skills/experience/education have no private fields, so the Zod `parse` is the integrity check; contact is assembled from `profile` + public project URLs + the resume URL.

**Files:** Create `content/contact.ts`, `content/contact.test.ts`; Modify `content/index.ts`, `content/index.test.ts`.

- [ ] **Step 1: Write the failing contact test** — `content/contact.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { RESUME_URL, publicContactSchema } from "./contact";

describe("contact module", () => {
  it("exposes a resume URL pointing at a static asset", () => {
    expect(RESUME_URL).toBe("/ethan-triska-resume.pdf");
  });
  it("validates a contact object", () => {
    const ok = publicContactSchema.parse({
      email: "ethan@triska.space",
      resumeUrl: RESUME_URL,
      links: [{ label: "Axiom", url: "https://agentaxiom.space" }],
    });
    expect(ok.links[0].label).toBe("Axiom");
  });
});
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run content/contact.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `content/contact.ts`**

```ts
import "server-only";
import { z } from "zod";

/** Static asset served from public/. Replaceable with a designed resume PDF at any time. */
export const RESUME_URL = "/ethan-triska-resume.pdf";

export const publicLinkSchema = z.object({
  label: z.string(),
  url: z.string().url(),
});
export type PublicLink = z.infer<typeof publicLinkSchema>;

export const publicContactSchema = z.object({
  email: z.string().email(),
  resumeUrl: z.string(),
  links: z.array(publicLinkSchema),
});
export type PublicContact = z.infer<typeof publicContactSchema>;
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run content/contact.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing selector test** — append inside `content/index.test.ts` (after the existing `describe("public selectors", ...)` block, as a new top-level describe):

```ts
import {
  getPublicSkills,
  getPublicExperience,
  getPublicEducation,
  getPublicContact,
} from "./index";

describe("non-project public selectors", () => {
  it("returns validated skills, experience, education", () => {
    expect(getPublicSkills().map((s) => s.id)).toContain("ai-ml");
    expect(getPublicExperience().map((e) => e.org)).toContain("Northrop Grumman Space Systems");
    expect(getPublicEducation().map((e) => e.school)).toContain("DePaul University");
  });
  it("builds a contact object from profile + public project links + resume", () => {
    const c = getPublicContact();
    expect(c.email).toBe("ethan@triska.space");
    expect(c.resumeUrl).toBe("/ethan-triska-resume.pdf");
    expect(c.links.map((l) => l.label)).toContain("Axiom");
    // every link has an absolute url; gated projects without urls do not crash it
    for (const l of c.links) expect(l.url).toMatch(/^https?:\/\//);
  });
  it("never leaks private notes through the new selectors", () => {
    const blob = JSON.stringify([
      getPublicSkills(), getPublicExperience(), getPublicEducation(), getPublicContact(),
    ]);
    expect(blob).not.toContain("Cost trick");
    expect(blob).not.toContain("privateNotes");
  });
});
```

- [ ] **Step 6: Run to verify it FAILS**

Run: `npx vitest run content/index.test.ts`
Expected: FAIL (`getPublicSkills` etc. not exported).

- [ ] **Step 7: Add the selectors to `content/index.ts`** (append below the existing project selectors; add the imports at the top of the file):

```ts
import { skills } from "./skills";
import { experience } from "./experience";
import { education } from "./education";
import { profile } from "./profile";
import {
  skillGroupSchema,
  experienceSchema,
  educationSchema,
  type SkillGroup,
  type Experience,
  type Education,
} from "./schema";
import { RESUME_URL, publicContactSchema, type PublicContact } from "./contact";

export const getPublicSkills = (): SkillGroup[] => skills.map((s) => skillGroupSchema.parse(s));
export const getPublicExperience = (): Experience[] =>
  experience.map((e) => experienceSchema.parse(e));
export const getPublicEducation = (): Education[] =>
  education.map((e) => educationSchema.parse(e));

export const getPublicContact = (): PublicContact => {
  const links = getPublicProjects()
    .filter((p): p is typeof p & { url: string } => typeof p.url === "string")
    .map((p) => ({ label: p.name, url: p.url }));
  return publicContactSchema.parse({ email: profile.email, resumeUrl: RESUME_URL, links });
};
```

- [ ] **Step 8: Run to verify it PASSES**

Run: `npx vitest run content/index.test.ts content/contact.test.ts`
Expected: PASS. Also `npx tsc --noEmit` exit 0.

- [ ] **Step 9: Commit**

```bash
git add content/contact.ts content/contact.test.ts content/index.ts content/index.test.ts
git commit -m "feat: public selectors for skills/experience/education + contact

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Emphasis matcher helper

A small, pure, client-safe function that decides whether an item is "emphasized" given the model's emphasis keywords. Drives "relevant in primary color, the rest recede" for Skills and Experience. Client-safe (no `server-only`) because the components run in the browser.

**Files:** Create `lib/emphasis.ts`, `lib/emphasis.test.ts`.

- [ ] **Step 1: Write the failing test** — `lib/emphasis.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { matchesEmphasis } from "./emphasis";

describe("matchesEmphasis", () => {
  it("is true when empty emphasis (nothing to de-emphasize)", () => {
    expect(matchesEmphasis([], "ai-ml", "AI / ML")).toBe(true);
  });
  it("matches case-insensitively against any candidate", () => {
    expect(matchesEmphasis(["AI"], "ai-ml", "AI / ML")).toBe(true);
    expect(matchesEmphasis(["python"], "languages", "Python", "SQL")).toBe(true);
  });
  it("matches on substring within a candidate", () => {
    expect(matchesEmphasis(["aero"], "ng", "aerospace")).toBe(true);
  });
  it("is false when no candidate matches a non-empty emphasis", () => {
    expect(matchesEmphasis(["security"], "tooling", "Git", "Tableau")).toBe(false);
  });
  it("ignores blank emphasis entries", () => {
    expect(matchesEmphasis(["", "   "], "tooling", "Git")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run lib/emphasis.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/emphasis.ts`**

```ts
// client-safe: do NOT import "server-only" (used by client components in the browser)

/**
 * True when an item should render emphasized.
 * - Empty/blank-only emphasis means "no tailoring", so everything is emphasized (primary color).
 * - Otherwise an item is emphasized when any emphasis keyword case-insensitively
 *   appears within any of its candidate strings (id, label, items, tags).
 */
export function matchesEmphasis(emphasis: string[], ...candidates: string[]): boolean {
  const keys = emphasis.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (keys.length === 0) return true;
  const hay = candidates.map((c) => c.toLowerCase());
  return keys.some((k) => hay.some((c) => c.includes(k)));
}
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run lib/emphasis.test.ts`
Expected: PASS (5 tests). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/emphasis.ts lib/emphasis.test.ts
git commit -m "feat: client-safe emphasis matcher for tailoring

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Shared client-safe project render shape

The multi-project overview (Task 4) needs the same client-safe project shape `Project.tsx` already defines inline. Extract it to one module so both revalidate against a single source (DRY), without changing `Project.tsx`'s public surface or breaking its tests.

**Files:** Create `components/vocabulary/projectShape.ts`; Modify `components/vocabulary/Project.tsx`.

- [ ] **Step 1: Confirm nothing else imports the inline schema**

Run: `grep -rn "RenderProject\|renderSchema" components lib app --include=*.ts --include=*.tsx`
Expected: references only inside `components/vocabulary/Project.tsx` (the `renderSchema` const and the exported `RenderProject` type). If anything else imports `RenderProject`, keep re-exporting it from `Project.tsx` in Step 3 so those imports still resolve.

- [ ] **Step 2: Implement `components/vocabulary/projectShape.ts`**

```ts
// client-safe copy of the public project shape (no server-only import in client bundle)
import { z } from "zod";

export const renderProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  tech: z.string(),
  year: z.string(),
  url: z.string().url().optional(),
  repo: z.string().url().optional(),
  status: z.enum(["featured", "gated"]),
  audienceTags: z.array(z.string()).default([]),
  live: z.object({ kind: z.literal("serenity") }).optional(),
});
export type RenderProject = z.infer<typeof renderProjectSchema>;
```

- [ ] **Step 3: Update `components/vocabulary/Project.tsx`** to use the shared shape. Replace the inline `const renderSchema = z.object({...})` and its `export type RenderProject = ...` with an import, and keep the same local name so the body is unchanged. The file becomes:

```tsx
"use client";
import { Composed } from "@/components/motion/Composed";
import { renderProjectSchema, type RenderProject } from "./projectShape";
import styles from "./Project.module.css";

export type { RenderProject };

export function ProjectComponent({ project, emphasis }: { project: RenderProject; emphasis: string[] }) {
  const p = renderProjectSchema.parse(project); // render-boundary revalidation
  return (
    <Composed className={styles.card}>
      <div className={styles.title}>{p.name}</div>
      <div className={styles.tagline}>{p.tagline}</div>
      <div className={styles.desc}>{p.description}</div>
      <div className={styles.meta}>
        {p.tech} · {p.year}
        {p.url ? <> · <a href={p.url} target="_blank" rel="noreferrer" className={styles.link}>visit</a></> : null}
      </div>
    </Composed>
  );
}
```

(`emphasis` stays in the signature for API compatibility even though the single-project card does not vary on it. The `z` import is dropped from this file since the schema moved.)

- [ ] **Step 4: Run the existing Project test to verify NO regression**

Run: `npx vitest run components/vocabulary/Project.test.tsx`
Expected: PASS (2 tests, unchanged). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/vocabulary/projectShape.ts components/vocabulary/Project.tsx
git commit -m "refactor: extract shared client-safe project render shape

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Multi-project overview (showProjects tool + Projects component)

The "what has Ethan built?" view (spec §5.3): the most relevant project as a lead mini-panel, the rest as compact rows, and gated projects under a quiet "usually hidden, surfaced for you" divider only when `includeGated` is set.

**Files:** Modify `lib/ai/tools.ts`, `lib/ai/tools.test.ts`; Create `components/vocabulary/Projects.tsx`, `components/vocabulary/Projects.module.css`, `components/vocabulary/Projects.test.tsx`.

- [ ] **Step 1: Write the failing tool test** — append to `lib/ai/tools.test.ts` (new describe block; the existing imports of `buildTools` stay):

```ts
describe("showProjects tool", () => {
  it("leads with the requested project and excludes it from the rows", async () => {
    const tools = buildTools();
    const out = await tools.showProjects.execute(
      { lead: "axiom", includeGated: false, emphasis: [] },
      { toolCallId: "t", messages: [] } as never,
    );
    expect(out.lead.id).toBe("axiom");
    expect(out.others.map((p: { id: string }) => p.id)).not.toContain("axiom");
    expect(out.others.every((p: { status: string }) => p.status === "featured")).toBe(true);
  });
  it("hides gated projects unless includeGated is true", async () => {
    const tools = buildTools();
    const hidden = await tools.showProjects.execute(
      { includeGated: false, emphasis: [] },
      { toolCallId: "t", messages: [] } as never,
    );
    expect(hidden.gated).toHaveLength(0);
    const shown = await tools.showProjects.execute(
      { includeGated: true, emphasis: [] },
      { toolCallId: "t", messages: [] } as never,
    );
    expect(shown.gated.map((p: { id: string }) => p.id)).toEqual(
      expect.arrayContaining(["sstpa", "satellite"]),
    );
  });
  it("never leaks private notes", async () => {
    const tools = buildTools();
    const out = await tools.showProjects.execute(
      { includeGated: true, emphasis: [] },
      { toolCallId: "t", messages: [] } as never,
    );
    expect(JSON.stringify(out)).not.toContain("Cost trick");
  });
});
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: FAIL (`showProjects` undefined).

- [ ] **Step 3: Add `showProjects` to `lib/ai/tools.ts`.** Update the imports and add the tool inside the object returned by `buildTools()`. New imports at the top:

```ts
import {
  getPublicProjectById,
  getFeaturedPublicProjects,
  getGatedPublicProjects,
} from "@/content/index";
import { publicProjectSchema } from "@/content/schema";
```

Add this property to the returned object (after `showProject`):

```ts
    showProjects: tool({
      description:
        "Render an overview of multiple projects. Pass `lead` (the id most relevant to this visitor) to feature it. Set `includeGated: true` only for aerospace or security visitors, or on direct request.",
      inputSchema: z.object({
        lead: z.string().optional().describe("id of the project to feature, e.g. axiom"),
        includeGated: z
          .boolean()
          .default(false)
          .describe("surface gated projects (aerospace/security relevance only)"),
        emphasis: z.array(z.string()).default([]).describe("optional keywords to highlight"),
      }),
      execute: async ({ lead, includeGated, emphasis }) => {
        const featured = getFeaturedPublicProjects();
        const leadProject =
          (lead ? getPublicProjectById(lead) : undefined) ?? featured[0];
        const others = featured.filter((p) => p.id !== leadProject.id);
        const gated = includeGated ? getGatedPublicProjects() : [];
        return {
          lead: publicProjectSchema.parse(leadProject),
          others: others.map((p) => publicProjectSchema.parse(p)),
          gated: gated.map((p) => publicProjectSchema.parse(p)),
          emphasis,
        };
      },
    }),
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: PASS (showProject's 2 + showProjects' 3). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Write the failing component test** — `components/vocabulary/Projects.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectsComponent } from "./Projects";

const p = (id: string, name: string, status: "featured" | "gated") => ({
  id, name, tagline: `${name} tagline`, description: "d",
  tech: "go", year: "2026", url: "https://example.com",
  status, audienceTags: [] as string[],
});

describe("ProjectsComponent", () => {
  it("renders the lead and the rows", () => {
    render(
      <ProjectsComponent
        lead={p("axiom", "Axiom", "featured")}
        others={[p("serenity", "Serenity Radio", "featured"), p("vox", "Vox", "featured")]}
        gated={[]}
        emphasis={[]}
      />,
    );
    expect(screen.getByText("Axiom")).toBeInTheDocument();
    expect(screen.getByText("Serenity Radio")).toBeInTheDocument();
    expect(screen.getByText("Vox")).toBeInTheDocument();
  });
  it("shows the gated divider only when gated projects are present", () => {
    const { rerender } = render(
      <ProjectsComponent lead={p("axiom", "Axiom", "featured")} others={[]} gated={[]} emphasis={[]} />,
    );
    expect(screen.queryByText(/surfaced for you/i)).toBeNull();
    rerender(
      <ProjectsComponent
        lead={p("axiom", "Axiom", "featured")}
        others={[]}
        gated={[p("sstpa", "SSTPA Tool", "gated")]}
        emphasis={[]}
      />,
    );
    expect(screen.getByText(/surfaced for you/i)).toBeInTheDocument();
    expect(screen.getByText("SSTPA Tool")).toBeInTheDocument();
  });
  it("throws on malformed (un-public) input", () => {
    const bad = { id: "x" } as never;
    expect(() =>
      render(<ProjectsComponent lead={bad} others={[]} gated={[]} emphasis={[]} />),
    ).toThrow();
  });
});
```

- [ ] **Step 6: Run to verify it FAILS**

Run: `npx vitest run components/vocabulary/Projects.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 7: Implement `components/vocabulary/Projects.tsx`**

```tsx
"use client";
import { Composed } from "@/components/motion/Composed";
import { renderProjectSchema, type RenderProject } from "./projectShape";
import styles from "./Projects.module.css";

function Row({ p }: { p: RenderProject }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowHead}>
        <span className={styles.rowName}>{p.name}</span>
        {p.url ? (
          <a href={p.url} target="_blank" rel="noreferrer" className={styles.link}>visit</a>
        ) : null}
      </div>
      <div className={styles.rowTagline}>{p.tagline}</div>
      <div className={styles.meta}>{p.tech} · {p.year}</div>
    </div>
  );
}

export function ProjectsComponent({
  lead, others, gated, emphasis: _emphasis,
}: {
  lead: RenderProject;
  others: RenderProject[];
  gated: RenderProject[];
  emphasis: string[];
}) {
  const leadP = renderProjectSchema.parse(lead);
  const rows = others.map((p) => renderProjectSchema.parse(p));
  const gatedRows = gated.map((p) => renderProjectSchema.parse(p));

  return (
    <Composed className={styles.wrap}>
      <div className={styles.lead}>
        <div className={styles.leadName}>{leadP.name}</div>
        <div className={styles.leadTagline}>{leadP.tagline}</div>
        <div className={styles.meta}>
          {leadP.tech} · {leadP.year}
          {leadP.url ? <> · <a href={leadP.url} target="_blank" rel="noreferrer" className={styles.link}>visit</a></> : null}
        </div>
      </div>
      {rows.map((p) => <Row key={p.id} p={p} />)}
      {gatedRows.length > 0 ? (
        <div className={styles.divider}>usually hidden, surfaced for you</div>
      ) : null}
      {gatedRows.map((p) => <Row key={p.id} p={p} />)}
    </Composed>
  );
}
```

- [ ] **Step 8: Implement `components/vocabulary/Projects.module.css`**

```css
.wrap { margin: 14px 0; }
.lead { border: 1px solid var(--border); background: var(--bg-raised); padding: 14px 16px; }
.leadName { font-size: 15px; color: var(--text); font-weight: 500; }
.leadTagline { font-size: 12.5px; color: var(--text-secondary); margin-top: 4px; }
.row { padding: 12px 0; border-bottom: 1px solid var(--border-soft); }
.rowHead { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.rowName { font-size: 13.5px; color: var(--text); }
.rowTagline { font-size: 12.5px; color: var(--text-secondary); margin-top: 3px; }
.meta { font-family: var(--font-mono), monospace; font-size: 11px; color: var(--text-tertiary); margin-top: 8px; }
.divider { font-family: var(--font-mono), monospace; font-size: 11px; color: var(--text-tertiary); margin: 18px 0 4px; letter-spacing: 0.03em; }
.link { color: var(--ink); text-decoration: none; font-size: 12px; }
.link:hover { text-decoration: underline; }
```

- [ ] **Step 9: Run to verify it PASSES**

Run: `npx vitest run components/vocabulary/Projects.test.tsx`
Expected: PASS (3 tests). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 10: Commit**

```bash
git add lib/ai/tools.ts lib/ai/tools.test.ts components/vocabulary/Projects.tsx components/vocabulary/Projects.module.css components/vocabulary/Projects.test.tsx
git commit -m "feat: multi-project overview (showProjects tool + Projects component)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Skills (showSkills tool + Skills component)

Grouped skill lists rendered as clean text, no pills (spec §5.4). Tailoring is emphasis: groups relevant to the visitor render in primary text, the rest recede to secondary.

**Files:** Modify `lib/ai/tools.ts`, `lib/ai/tools.test.ts`; Create `components/vocabulary/Skills.tsx`, `components/vocabulary/Skills.module.css`, `components/vocabulary/Skills.test.tsx`.

- [ ] **Step 1: Write the failing tool test** — append to `lib/ai/tools.test.ts`:

```ts
describe("showSkills tool", () => {
  it("returns all skill groups and passes emphasis through", async () => {
    const tools = buildTools();
    const out = await tools.showSkills.execute(
      { emphasis: ["ai"] },
      { toolCallId: "t", messages: [] } as never,
    );
    expect(out.groups.map((g: { id: string }) => g.id)).toContain("ai-ml");
    expect(out.emphasis).toEqual(["ai"]);
  });
});
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: FAIL (`showSkills` undefined).

- [ ] **Step 3: Add `showSkills` to `lib/ai/tools.ts`.** Add `getPublicSkills` to the `@/content/index` import, then add the tool:

```ts
    showSkills: tool({
      description:
        "Render Ethan's skills, grouped. Pass `emphasis` (keywords or group ids relevant to this visitor) to highlight the most relevant groups; the rest recede.",
      inputSchema: z.object({
        emphasis: z.array(z.string()).default([]).describe("keywords/ids to highlight, e.g. ai, data"),
      }),
      execute: async ({ emphasis }) => ({ groups: getPublicSkills(), emphasis }),
    }),
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: PASS. Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Write the failing component test** — `components/vocabulary/Skills.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkillsComponent } from "./Skills";

const groups = [
  { id: "ai-ml", label: "AI / ML", items: ["NLP", "Generative UI"], audienceTags: ["ai"] },
  { id: "tooling", label: "tooling", items: ["Git", "Tableau"], audienceTags: ["general"] },
];

describe("SkillsComponent", () => {
  it("renders every group label and its items", () => {
    render(<SkillsComponent groups={groups} emphasis={[]} />);
    expect(screen.getByText("AI / ML")).toBeInTheDocument();
    expect(screen.getByText(/NLP/)).toBeInTheDocument();
    expect(screen.getByText("tooling")).toBeInTheDocument();
  });
  it("marks emphasized groups and de-emphasizes the rest", () => {
    render(<SkillsComponent groups={groups} emphasis={["ai"]} />);
    expect(screen.getByTestId("skill-group-ai-ml").getAttribute("data-emph")).toBe("true");
    expect(screen.getByTestId("skill-group-tooling").getAttribute("data-emph")).toBe("false");
  });
  it("emphasizes everything when emphasis is empty", () => {
    render(<SkillsComponent groups={groups} emphasis={[]} />);
    expect(screen.getByTestId("skill-group-tooling").getAttribute("data-emph")).toBe("true");
  });
});
```

- [ ] **Step 6: Run to verify it FAILS**

Run: `npx vitest run components/vocabulary/Skills.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 7: Implement `components/vocabulary/Skills.tsx`**

```tsx
"use client";
import { z } from "zod";
import { Composed } from "@/components/motion/Composed";
import { matchesEmphasis } from "@/lib/emphasis";
import styles from "./Skills.module.css";

const renderSchema = z.object({
  groups: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      items: z.array(z.string()),
      audienceTags: z.array(z.string()).default([]),
    }),
  ),
  emphasis: z.array(z.string()).default([]),
});

export function SkillsComponent(props: {
  groups: { id: string; label: string; items: string[]; audienceTags: string[] }[];
  emphasis: string[];
}) {
  const { groups, emphasis } = renderSchema.parse(props);
  return (
    <Composed className={styles.wrap}>
      {groups.map((g) => {
        const on = matchesEmphasis(emphasis, g.id, g.label, ...g.items, ...g.audienceTags);
        return (
          <div
            key={g.id}
            data-testid={`skill-group-${g.id}`}
            data-emph={on ? "true" : "false"}
            className={`${styles.group} ${on ? styles.on : styles.off}`}
          >
            <span className={styles.label}>{g.label}</span>
            <span className={styles.items}>{g.items.join(", ")}</span>
          </div>
        );
      })}
    </Composed>
  );
}
```

- [ ] **Step 8: Implement `components/vocabulary/Skills.module.css`**

```css
.wrap { margin: 14px 0; }
.group { padding: 7px 0; }
.label { display: block; font-family: var(--font-mono), monospace; font-size: 11px; color: var(--text-tertiary); letter-spacing: 0.03em; margin-bottom: 3px; }
.items { font-size: 13px; line-height: var(--leading-prose); }
.on .items { color: var(--text); }
.off .items { color: var(--text-tertiary); }
```

- [ ] **Step 9: Run to verify it PASSES**

Run: `npx vitest run components/vocabulary/Skills.test.tsx`
Expected: PASS (3 tests). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 10: Commit**

```bash
git add lib/ai/tools.ts lib/ai/tools.test.ts components/vocabulary/Skills.tsx components/vocabulary/Skills.module.css components/vocabulary/Skills.test.tsx
git commit -m "feat: skills (showSkills tool + Skills component with emphasis tailoring)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Experience (showExperience tool + Experience component)

Experience entries (spec §5.5): role plus org, mono meta (location and dates), bullets. Emphasis highlights the entries most relevant to the visitor; the rest recede.

**Files:** Modify `lib/ai/tools.ts`, `lib/ai/tools.test.ts`; Create `components/vocabulary/Experience.tsx`, `components/vocabulary/Experience.module.css`, `components/vocabulary/Experience.test.tsx`.

- [ ] **Step 1: Write the failing tool test** — append to `lib/ai/tools.test.ts`:

```ts
describe("showExperience tool", () => {
  it("returns experience entries and passes emphasis through", async () => {
    const tools = buildTools();
    const out = await tools.showExperience.execute(
      { emphasis: ["aerospace"] },
      { toolCallId: "t", messages: [] } as never,
    );
    expect(out.entries.map((e: { id: string }) => e.id)).toContain("ng");
    expect(out.emphasis).toEqual(["aerospace"]);
  });
});
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: FAIL (`showExperience` undefined).

- [ ] **Step 3: Add `showExperience` to `lib/ai/tools.ts`.** Add `getPublicExperience` to the `@/content/index` import, then add the tool:

```ts
    showExperience: tool({
      description:
        "Render Ethan's work experience. Pass `emphasis` (keywords, org names, or ids) to highlight the most relevant roles; the rest recede.",
      inputSchema: z.object({
        emphasis: z.array(z.string()).default([]).describe("keywords/ids to highlight"),
      }),
      execute: async ({ emphasis }) => ({ entries: getPublicExperience(), emphasis }),
    }),
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: PASS. Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Write the failing component test** — `components/vocabulary/Experience.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExperienceComponent } from "./Experience";

const entries = [
  {
    id: "ng", role: "Pricing & Estimating Intern", org: "Northrop Grumman Space Systems",
    location: "Dulles, VA", dates: "Jun 2024 - Aug 2024",
    bullets: ["Built a Python Cost Volume generator."], audienceTags: ["aerospace", "data"],
  },
  {
    id: "pampco", role: "Data Analytics Assistant", org: "Pampco",
    location: "Passaic, NJ", dates: "Jun 2023 - Aug 2023",
    bullets: ["Aggregated vendor data into one report."], audienceTags: ["data"],
  },
];

describe("ExperienceComponent", () => {
  it("renders role, org, meta, and bullets", () => {
    render(<ExperienceComponent entries={entries} emphasis={[]} />);
    expect(screen.getByText(/Pricing & Estimating Intern/)).toBeInTheDocument();
    expect(screen.getByText(/Northrop Grumman Space Systems/)).toBeInTheDocument();
    expect(screen.getByText(/Dulles, VA · Jun 2024 - Aug 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Cost Volume generator/)).toBeInTheDocument();
  });
  it("marks emphasized entries and de-emphasizes the rest", () => {
    render(<ExperienceComponent entries={entries} emphasis={["aerospace"]} />);
    expect(screen.getByTestId("xp-ng").getAttribute("data-emph")).toBe("true");
    expect(screen.getByTestId("xp-pampco").getAttribute("data-emph")).toBe("false");
  });
});
```

- [ ] **Step 6: Run to verify it FAILS**

Run: `npx vitest run components/vocabulary/Experience.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 7: Implement `components/vocabulary/Experience.tsx`**

```tsx
"use client";
import { z } from "zod";
import { Composed } from "@/components/motion/Composed";
import { matchesEmphasis } from "@/lib/emphasis";
import styles from "./Experience.module.css";

const renderSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string(),
      role: z.string(),
      org: z.string(),
      location: z.string(),
      dates: z.string(),
      bullets: z.array(z.string()),
      audienceTags: z.array(z.string()).default([]),
    }),
  ),
  emphasis: z.array(z.string()).default([]),
});

export function ExperienceComponent(props: {
  entries: {
    id: string; role: string; org: string; location: string; dates: string;
    bullets: string[]; audienceTags: string[];
  }[];
  emphasis: string[];
}) {
  const { entries, emphasis } = renderSchema.parse(props);
  return (
    <Composed className={styles.wrap}>
      {entries.map((e) => {
        const on = matchesEmphasis(emphasis, e.id, e.org, e.role, ...e.audienceTags);
        return (
          <div
            key={e.id}
            data-testid={`xp-${e.id}`}
            data-emph={on ? "true" : "false"}
            className={`${styles.entry} ${on ? styles.on : styles.off}`}
          >
            <div className={styles.role}>{e.role}, {e.org}</div>
            <div className={styles.meta}>{e.location} · {e.dates}</div>
            <ul className={styles.bullets}>
              {e.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        );
      })}
    </Composed>
  );
}
```

- [ ] **Step 8: Implement `components/vocabulary/Experience.module.css`**

```css
.wrap { margin: 14px 0; }
.entry { padding: 12px 0; border-bottom: 1px solid var(--border-soft); }
.role { font-size: 13.5px; color: var(--text); }
.off .role { color: var(--text-secondary); }
.meta { font-family: var(--font-mono), monospace; font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }
.bullets { margin: 8px 0 0; padding-left: 18px; }
.bullets li { font-size: 13px; color: var(--text-secondary); line-height: var(--leading-prose); }
.off .bullets li { color: var(--text-tertiary); }
```

- [ ] **Step 9: Run to verify it PASSES**

Run: `npx vitest run components/vocabulary/Experience.test.tsx`
Expected: PASS (2 tests). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 10: Commit**

```bash
git add lib/ai/tools.ts lib/ai/tools.test.ts components/vocabulary/Experience.tsx components/vocabulary/Experience.module.css components/vocabulary/Experience.test.tsx
git commit -m "feat: experience (showExperience tool + Experience component)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Education (showEducation tool + Education component)

Compact education entries (spec §5.6): degree plus school, mono meta (location, year, honors). No tailoring needed beyond rendering.

**Files:** Modify `lib/ai/tools.ts`, `lib/ai/tools.test.ts`; Create `components/vocabulary/Education.tsx`, `components/vocabulary/Education.module.css`, `components/vocabulary/Education.test.tsx`.

- [ ] **Step 1: Write the failing tool test** — append to `lib/ai/tools.test.ts`:

```ts
describe("showEducation tool", () => {
  it("returns education entries", async () => {
    const tools = buildTools();
    const out = await tools.showEducation.execute(
      {},
      { toolCallId: "t", messages: [] } as never,
    );
    expect(out.entries.map((e: { school: string }) => e.school)).toContain("DePaul University");
  });
});
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: FAIL (`showEducation` undefined).

- [ ] **Step 3: Add `showEducation` to `lib/ai/tools.ts`.** Add `getPublicEducation` to the `@/content/index` import, then add the tool:

```ts
    showEducation: tool({
      description: "Render Ethan's education (degrees, schools, honors).",
      inputSchema: z.object({}),
      execute: async () => ({ entries: getPublicEducation() }),
    }),
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: PASS. Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Write the failing component test** — `components/vocabulary/Education.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EducationComponent } from "./Education";

const entries = [
  { id: "depaul", degree: "M.S. Computer Science", school: "DePaul University", location: "Chicago, IL", meta: "expected 2028" },
  { id: "scranton", degree: "B.S. Business Analytics", school: "University of Scranton", location: "Scranton, PA", meta: "2025 · Dean's List" },
];

describe("EducationComponent", () => {
  it("renders degree, school, and mono meta", () => {
    render(<EducationComponent entries={entries} />);
    expect(screen.getByText(/M.S. Computer Science, DePaul University/)).toBeInTheDocument();
    expect(screen.getByText(/Chicago, IL · expected 2028/)).toBeInTheDocument();
    expect(screen.getByText(/University of Scranton/)).toBeInTheDocument();
  });
  it("throws on malformed input", () => {
    const bad = [{ id: "x" }] as never;
    expect(() => render(<EducationComponent entries={bad} />)).toThrow();
  });
});
```

- [ ] **Step 6: Run to verify it FAILS**

Run: `npx vitest run components/vocabulary/Education.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 7: Implement `components/vocabulary/Education.tsx`**

```tsx
"use client";
import { z } from "zod";
import { Composed } from "@/components/motion/Composed";
import styles from "./Education.module.css";

const renderSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string(),
      degree: z.string(),
      school: z.string(),
      location: z.string(),
      meta: z.string(),
    }),
  ),
});

export function EducationComponent(props: {
  entries: { id: string; degree: string; school: string; location: string; meta: string }[];
}) {
  const { entries } = renderSchema.parse(props);
  return (
    <Composed className={styles.wrap}>
      {entries.map((e) => (
        <div key={e.id} className={styles.entry}>
          <div className={styles.degree}>{e.degree}, {e.school}</div>
          <div className={styles.meta}>{e.location} · {e.meta}</div>
        </div>
      ))}
    </Composed>
  );
}
```

- [ ] **Step 8: Implement `components/vocabulary/Education.module.css`**

```css
.wrap { margin: 14px 0; }
.entry { padding: 9px 0; }
.degree { font-size: 13.5px; color: var(--text); }
.meta { font-family: var(--font-mono), monospace; font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }
```

- [ ] **Step 9: Run to verify it PASSES**

Run: `npx vitest run components/vocabulary/Education.test.tsx`
Expected: PASS (2 tests). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 10: Commit**

```bash
git add lib/ai/tools.ts lib/ai/tools.test.ts components/vocabulary/Education.tsx components/vocabulary/Education.module.css components/vocabulary/Education.test.tsx
git commit -m "feat: education (showEducation tool + Education component)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Contact + downloadable resume (showContact tool + Contact component + asset)

Contact surface (spec §5.8): `mailto:ethan@triska.space`, links to the live project sites, and a downloadable resume served as a static asset.

> The resume PDF is generated from `resume.md`. It is Ethan's real resume and contains his real contact details (this matches his explicit choice to publish contact info). It is a static file in `public/` and can be replaced with a designed PDF at any time by overwriting `public/ethan-triska-resume.pdf`.

**Files:** Modify `lib/ai/tools.ts`, `lib/ai/tools.test.ts`; Create `components/vocabulary/Contact.tsx`, `components/vocabulary/Contact.module.css`, `components/vocabulary/Contact.test.tsx`, `public/ethan-triska-resume.pdf`.

- [ ] **Step 1: Generate the resume asset**

Run (macOS has `cupsfilter`):

```bash
mkdir -p public
/usr/sbin/cupsfilter resume.md > public/ethan-triska-resume.pdf 2>/dev/null
head -c 4 public/ethan-triska-resume.pdf; echo
```

Expected: prints `%PDF` and the file is non-empty. Verify size:

```bash
test -s public/ethan-triska-resume.pdf && echo "ok: $(wc -c < public/ethan-triska-resume.pdf) bytes" || echo "EMPTY"
```

If `cupsfilter` is unavailable or produces an empty file, STOP and report DONE_WITH_CONCERNS: the tool/component below still ship (they only reference the URL), but the asset must be supplied. Do not fake a binary. The controller will provide a real PDF.

- [ ] **Step 2: Write the failing tool test** — append to `lib/ai/tools.test.ts`:

```ts
describe("showContact tool", () => {
  it("returns email, resume url, and project links", async () => {
    const tools = buildTools();
    const out = await tools.showContact.execute(
      {},
      { toolCallId: "t", messages: [] } as never,
    );
    expect(out.email).toBe("ethan@triska.space");
    expect(out.resumeUrl).toBe("/ethan-triska-resume.pdf");
    expect(out.links.map((l: { label: string }) => l.label)).toContain("Axiom");
  });
});
```

- [ ] **Step 3: Run to verify it FAILS**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: FAIL (`showContact` undefined).

- [ ] **Step 4: Add `showContact` to `lib/ai/tools.ts`.** Add `getPublicContact` to the `@/content/index` import, then add the tool:

```ts
    showContact: tool({
      description: "Render contact info: email, a resume download, and links to Ethan's live project sites.",
      inputSchema: z.object({}),
      execute: async () => getPublicContact(),
    }),
```

- [ ] **Step 5: Run to verify it PASSES**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: PASS. Also `npx tsc --noEmit` exit 0.

- [ ] **Step 6: Write the failing component test** — `components/vocabulary/Contact.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactComponent } from "./Contact";

const contact = {
  email: "ethan@triska.space",
  resumeUrl: "/ethan-triska-resume.pdf",
  links: [
    { label: "Axiom", url: "https://agentaxiom.space" },
    { label: "Serenity Radio", url: "https://underclassradio.com" },
  ],
};

describe("ContactComponent", () => {
  it("renders a mailto, a resume download, and project links", () => {
    render(<ContactComponent {...contact} />);
    const mail = screen.getByText("ethan@triska.space").closest("a");
    expect(mail).toHaveAttribute("href", "mailto:ethan@triska.space");
    const resume = screen.getByText(/resume/i).closest("a");
    expect(resume).toHaveAttribute("href", "/ethan-triska-resume.pdf");
    expect(resume).toHaveAttribute("download");
    expect(screen.getByText("Axiom").closest("a")).toHaveAttribute("href", "https://agentaxiom.space");
  });
  it("throws on malformed input", () => {
    const bad = { email: "not-an-email" } as never;
    expect(() => render(<ContactComponent {...bad} />)).toThrow();
  });
});
```

- [ ] **Step 7: Run to verify it FAILS**

Run: `npx vitest run components/vocabulary/Contact.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 8: Implement `components/vocabulary/Contact.tsx`**

```tsx
"use client";
import { z } from "zod";
import { Composed } from "@/components/motion/Composed";
import styles from "./Contact.module.css";

const renderSchema = z.object({
  email: z.string().email(),
  resumeUrl: z.string(),
  links: z.array(z.object({ label: z.string(), url: z.string().url() })),
});

export function ContactComponent(props: {
  email: string;
  resumeUrl: string;
  links: { label: string; url: string }[];
}) {
  const { email, resumeUrl, links } = renderSchema.parse(props);
  return (
    <Composed className={styles.card}>
      <a className={styles.primary} href={`mailto:${email}`}>{email}</a>
      <a className={styles.primary} href={resumeUrl} download>download resume</a>
      <div className={styles.links}>
        {links.map((l) => (
          <a key={l.url} className={styles.link} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
        ))}
      </div>
    </Composed>
  );
}
```

- [ ] **Step 9: Implement `components/vocabulary/Contact.module.css`**

```css
.card { border: 1px solid var(--border); background: var(--bg-raised); padding: 14px 16px; margin: 14px 0; display: flex; flex-direction: column; gap: 8px; }
.primary { color: var(--ink); font-size: 13px; text-decoration: none; }
.primary:hover { text-decoration: underline; }
.links { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 6px; }
.link { font-family: var(--font-mono), monospace; font-size: 12px; color: var(--text-secondary); text-decoration: none; }
.link:hover { color: var(--text); }
```

- [ ] **Step 10: Run to verify it PASSES**

Run: `npx vitest run components/vocabulary/Contact.test.tsx`
Expected: PASS (2 tests). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 11: Commit**

```bash
git add lib/ai/tools.ts lib/ai/tools.test.ts components/vocabulary/Contact.tsx components/vocabulary/Contact.module.css components/vocabulary/Contact.test.tsx public/ethan-triska-resume.pdf
git commit -m "feat: contact + downloadable resume (showContact tool + Contact component + asset)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Suggested directions (suggestDirections tool + SuggestedDirections component)

The model proposes 2 to 3 short next directions each turn (spec §5.9), rendered as bracketed monospace chips. Tapping a chip continues the conversation, so the component takes an `onPick` callback that the transcript wires to `sendMessage`.

**Files:** Modify `lib/ai/tools.ts`, `lib/ai/tools.test.ts`; Create `components/chat/SuggestedDirections.tsx`, `components/chat/SuggestedDirections.module.css`, `components/chat/SuggestedDirections.test.tsx`.

- [ ] **Step 1: Write the failing tool test** — append to `lib/ai/tools.test.ts`:

```ts
describe("suggestDirections tool", () => {
  it("trims, drops blanks, and caps to three directions", async () => {
    const tools = buildTools();
    const out = await tools.suggestDirections.execute(
      { directions: ["  tell me about Axiom  ", "", "show his skills", "experience", "education"] },
      { toolCallId: "t", messages: [] } as never,
    );
    expect(out.directions).toEqual(["tell me about Axiom", "show his skills", "experience"]);
  });
});
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: FAIL (`suggestDirections` undefined).

- [ ] **Step 3: Add `suggestDirections` to `lib/ai/tools.ts`** (no new content import needed):

```ts
    suggestDirections: tool({
      description:
        "Propose 2 to 3 short next directions for the visitor, tailored to them and to what was already asked. Call this at the end of most turns.",
      inputSchema: z.object({
        directions: z.array(z.string()).min(1).describe("2 to 3 short prompts the visitor might tap"),
      }),
      execute: async ({ directions }) => ({
        directions: directions.map((d) => d.trim()).filter(Boolean).slice(0, 3),
      }),
    }),
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: PASS. Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Write the failing component test** — `components/chat/SuggestedDirections.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SuggestedDirections } from "./SuggestedDirections";

describe("SuggestedDirections", () => {
  it("renders each direction as a bracketed chip", () => {
    render(<SuggestedDirections directions={["tell me about Axiom", "show his skills"]} />);
    expect(screen.getByText("[ tell me about Axiom ]")).toBeInTheDocument();
    expect(screen.getByText("[ show his skills ]")).toBeInTheDocument();
  });
  it("calls onPick with the raw direction text when a chip is tapped", () => {
    const onPick = vi.fn();
    render(<SuggestedDirections directions={["show his skills"]} onPick={onPick} />);
    fireEvent.click(screen.getByText("[ show his skills ]"));
    expect(onPick).toHaveBeenCalledWith("show his skills");
  });
  it("renders nothing when there are no directions", () => {
    const { container } = render(<SuggestedDirections directions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 6: Run to verify it FAILS**

Run: `npx vitest run components/chat/SuggestedDirections.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 7: Implement `components/chat/SuggestedDirections.tsx`**

```tsx
"use client";
import { z } from "zod";
import styles from "./SuggestedDirections.module.css";

const renderSchema = z.object({ directions: z.array(z.string()) });

export function SuggestedDirections({
  directions, onPick,
}: {
  directions: string[];
  onPick?: (text: string) => void;
}) {
  const { directions: list } = renderSchema.parse({ directions });
  const clean = list.map((d) => d.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  return (
    <div className={styles.row}>
      {clean.map((d) => (
        <button key={d} type="button" className={styles.chip} onClick={() => onPick?.(d)}>
          [ {d} ]
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Implement `components/chat/SuggestedDirections.module.css`**

```css
.row { display: flex; flex-wrap: wrap; gap: 14px; margin: 12px 0 4px; }
.chip { font-family: var(--font-mono), monospace; font-size: 12.5px; color: var(--ink); background: none; border: 0; padding: 0; cursor: pointer; }
.chip:hover { text-decoration: underline; }
```

- [ ] **Step 9: Run to verify it PASSES**

Run: `npx vitest run components/chat/SuggestedDirections.test.tsx`
Expected: PASS (3 tests). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 10: Commit**

```bash
git add lib/ai/tools.ts lib/ai/tools.test.ts components/chat/SuggestedDirections.tsx components/chat/SuggestedDirections.module.css components/chat/SuggestedDirections.test.tsx
git commit -m "feat: suggested directions (suggestDirections tool + chips component)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Wire the transcript (leak-detect generalization + MessagePart dispatch + Chat onPick)

Render every new tool part in the transcript, suppress leaked tool intent for the new tool names too, and make `suggestDirections` chips continue the conversation.

**Files:** Modify `lib/ai/leak-detect.ts`, `lib/ai/leak-detect.test.ts`, `components/chat/MessagePart.tsx`, `components/chat/MessagePart.test.tsx`, `components/chat/Chat.tsx`.

- [ ] **Step 1: Add failing leak-detect cases** — append inside the existing `describe("isLeakedToolIntent", ...)` block in `lib/ai/leak-detect.test.ts`:

```ts
  it("is true for any show*/suggest* call style (new tools)", () => {
    expect(isLeakedToolIntent('showProjects({ lead: "axiom" })')).toBe(true);
    expect(isLeakedToolIntent('showSkills({ emphasis: ["ai"] })')).toBe(true);
    expect(isLeakedToolIntent("suggestDirections([\"a\",\"b\"])")).toBe(true);
  });
  it("does not flag prose that merely says show or suggest", () => {
    expect(isLeakedToolIntent("Let me show you what Ethan built.")).toBe(false);
    expect(isLeakedToolIntent("I suggest starting with Axiom.")).toBe(false);
  });
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run lib/ai/leak-detect.test.ts`
Expected: FAIL (`showSkills(...)` / `suggestDirections([...])` not yet flagged).

- [ ] **Step 3: Generalize the call-style check in `lib/ai/leak-detect.ts`.** Replace the single `showProject` line:

```ts
  // function-call style, e.g. showProject({ ... })
  if (/\bshowProject\s*\(/.test(t)) return true;
```

with a pattern that matches any of this app's tool-call names (camelCase `show*`/`suggest*` immediately followed by a paren), while leaving lowercase prose ("show you", "I suggest") alone:

```ts
  // function-call style for any tool, e.g. showProject({...}), showSkills([...]), suggestDirections([...])
  if (/\b(show|suggest)[A-Z]\w*\s*\(/.test(t)) return true;
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run lib/ai/leak-detect.test.ts`
Expected: PASS (all, including the original `showProject` case which still matches). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Add failing MessagePart cases** — append inside the existing `describe("MessagePart", ...)` block in `components/chat/MessagePart.test.tsx`:

```ts
  it("renders the overview for tool-showProjects output-available", () => {
    const lead = { id: "axiom", name: "Axiom", tagline: "t", description: "d", tech: "go", year: "2026", status: "featured" as const, audienceTags: [] as string[] };
    render(<MessagePart part={{ type: "tool-showProjects", state: "output-available", output: { lead, others: [], gated: [], emphasis: [] } }} />);
    expect(screen.getByText("Axiom")).toBeInTheDocument();
  });
  it("renders skills for tool-showSkills output-available", () => {
    render(<MessagePart part={{ type: "tool-showSkills", state: "output-available", output: { groups: [{ id: "ai-ml", label: "AI / ML", items: ["NLP"], audienceTags: ["ai"] }], emphasis: [] } }} />);
    expect(screen.getByText("AI / ML")).toBeInTheDocument();
  });
  it("renders directions for tool-suggestDirections and forwards onPick", () => {
    const onPick = vi.fn();
    render(<MessagePart onPick={onPick} part={{ type: "tool-suggestDirections", state: "output-available", output: { directions: ["show his skills"] } }} />);
    fireEvent.click(screen.getByText("[ show his skills ]"));
    expect(onPick).toHaveBeenCalledWith("show his skills");
  });
  it("shows a skeleton for any tool input state", () => {
    render(<MessagePart part={{ type: "tool-showExperience", state: "input-available" }} />);
    expect(screen.getByLabelText("composing")).toBeInTheDocument();
  });
  it("shows an error fallback for any tool output-error", () => {
    render(<MessagePart part={{ type: "tool-showEducation", state: "output-error" }} />);
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });
```

Also extend the test file's imports to include `vi` and `fireEvent`:

```ts
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
```

- [ ] **Step 6: Run to verify it FAILS**

Run: `npx vitest run components/chat/MessagePart.test.tsx`
Expected: FAIL (new tool parts render `null`).

- [ ] **Step 7: Replace `components/chat/MessagePart.tsx`** with a version that dispatches all tools through a shared lifecycle (skeleton for input states, error line for `output-error`, the component for `output-available`):

```tsx
"use client";
import { ProjectComponent } from "@/components/vocabulary/Project";
import { ProjectsComponent } from "@/components/vocabulary/Projects";
import { SkillsComponent } from "@/components/vocabulary/Skills";
import { ExperienceComponent } from "@/components/vocabulary/Experience";
import { EducationComponent } from "@/components/vocabulary/Education";
import { ContactComponent } from "@/components/vocabulary/Contact";
import { SuggestedDirections } from "./SuggestedDirections";
import { Skeleton } from "./Skeleton";
import { isLeakedToolIntent } from "@/lib/ai/leak-detect";
import styles from "./MessagePart.module.css";

type Part = { type: string; state?: string; output?: unknown; text?: string };

function renderTool(type: string, output: unknown, onPick?: (text: string) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = output as any;
  switch (type) {
    case "tool-showProject":
      return <ProjectComponent project={o.project} emphasis={o.emphasis ?? []} />;
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
    case "tool-suggestDirections":
      return <SuggestedDirections directions={o.directions ?? []} onPick={onPick} />;
    default:
      return null;
  }
}

const TOOL_TYPES = new Set([
  "tool-showProject", "tool-showProjects", "tool-showSkills",
  "tool-showExperience", "tool-showEducation", "tool-showContact",
  "tool-suggestDirections",
]);

export function MessagePart({ part, onPick }: { part: Part; onPick?: (text: string) => void }) {
  if (part.type === "text") {
    if (!part.text || isLeakedToolIntent(part.text)) return null;
    return <p>{part.text}</p>;
  }
  if (TOOL_TYPES.has(part.type)) {
    if (part.state === "output-available" && part.output) {
      return renderTool(part.type, part.output, onPick);
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

- [ ] **Step 8: Run to verify it PASSES**

Run: `npx vitest run components/chat/MessagePart.test.tsx`
Expected: PASS (the original 5 + the 5 new). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 9: Wire `onPick` in `components/chat/Chat.tsx`.** In the transcript map, pass `onPick` to `MessagePart` so a tapped direction sends a new message with the current persona body. Change:

```tsx
          {m.parts.map((part, i) => (
            <MessagePart key={i} part={part as never} />
          ))}
```

to:

```tsx
          {m.parts.map((part, i) => (
            <MessagePart
              key={i}
              part={part as never}
              onPick={(text) => sendMessage({ text }, { body: { persona } })}
            />
          ))}
```

- [ ] **Step 10: Verify the whole suite + types + build**

Run: `npx vitest run` → all pass.
Run: `npx tsc --noEmit` → exit 0.
Run: `npm run build` → succeeds.

- [ ] **Step 11: Commit**

```bash
git add lib/ai/leak-detect.ts lib/ai/leak-detect.test.ts components/chat/MessagePart.tsx components/chat/MessagePart.test.tsx components/chat/Chat.tsx
git commit -m "feat: dispatch full component vocabulary in transcript + tappable directions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Teach the system prompt the tool vocabulary + gating rule

The model must know when to call each new tool and that gated projects surface only for aerospace/security visitors or on direct request (spec §6).

**Files:** Modify `lib/ai/system-prompt.ts`, `lib/ai/system-prompt.test.ts`.

- [ ] **Step 1: Add failing assertions** — append inside the existing `describe("composeSystemPrompt", ...)` block in `lib/ai/system-prompt.test.ts`:

```ts
  it("teaches the full tool vocabulary and the gating rule", () => {
    const sp = composeSystemPrompt({ role: "engineer", text: null });
    expect(sp).toContain("showProjects");
    expect(sp).toContain("showSkills");
    expect(sp).toContain("showExperience");
    expect(sp).toContain("showEducation");
    expect(sp).toContain("showContact");
    expect(sp).toContain("suggestDirections");
    expect(sp).toMatch(/aerospace|security/i);
    expect(sp).not.toContain("Cost trick");
  });
```

- [ ] **Step 2: Run to verify it FAILS**

Run: `npx vitest run lib/ai/system-prompt.test.ts`
Expected: FAIL (new tool names not present).

- [ ] **Step 3: Update `composeSystemPrompt` in `lib/ai/system-prompt.ts`.** Replace the two existing instruction lines:

```ts
    "When you present a project, call the showProject tool rather than describing it in plain prose.",
    "End each turn by proposing the next directions for the visitor.",
```

with the full vocabulary and gating guidance:

```ts
    "",
    "Always prefer rendering a live component over plain prose. Tools:",
    "- showProject: one project in depth (ids: serenity, axiom, vox, sstpa, satellite).",
    "- showProjects: an overview of several projects. Pass `lead` (the id most relevant to this visitor). Set `includeGated: true` only when the visitor is in aerospace or security, or explicitly asks about that work.",
    "- showSkills, showExperience: pass `emphasis` (keywords or ids) so what matters to this visitor renders prominently and the rest recede.",
    "- showEducation: degrees and schools.",
    "- showContact: email, resume download, and project links.",
    "- suggestDirections: end most turns by proposing 2 to 3 short next directions tailored to this visitor.",
    "Gating: the gated projects (SSTPA Tool, Satellite Simulator) are hidden by default. Surface them only for aerospace or security visitors, or on direct request.",
```

- [ ] **Step 4: Run to verify it PASSES**

Run: `npx vitest run lib/ai/system-prompt.test.ts`
Expected: PASS (original + new). Also `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/system-prompt.ts lib/ai/system-prompt.test.ts
git commit -m "feat: teach system prompt the full tool vocabulary + gating rule

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Milestone gate

**Files:** none (verification only).

- [ ] **Step 1: Full suite** — Run: `npx vitest run` → all pass. Record totals (expect the Plan 2 count of 48 plus the new tests added here).

- [ ] **Step 2: Types + build** — Run: `npx tsc --noEmit` (exit 0), then `npm run build` (success). Confirm `/api/chat` is still a dynamic route and the new `public/ethan-triska-resume.pdf` is served as a static asset.

- [ ] **Step 3: Bundle privacy** — Run both and expect `clean` for each:

```bash
grep -rl "Cost trick" .next/static 2>/dev/null && echo "LEAK FOUND" || echo "clean"
grep -rl "aggressive context-management" .next/static 2>/dev/null && echo "LEAK FOUND" || echo "clean"
```

If either finds a match, STOP and report BLOCKED.

- [ ] **Step 4: Client-bundle server-only check** — confirm no new client component pulled `server-only` into the browser bundle:

```bash
grep -ln "server-only" components/vocabulary/Projects.tsx components/vocabulary/Skills.tsx components/vocabulary/Experience.tsx components/vocabulary/Education.tsx components/vocabulary/Contact.tsx components/vocabulary/projectShape.ts components/chat/SuggestedDirections.tsx lib/emphasis.ts 2>/dev/null && echo "SERVER-ONLY IN CLIENT" || echo "clean"
```

Expected: `clean` (no matches).

- [ ] **Step 5: Manual end-to-end (optional but recommended)** — with a real `OPENROUTER_API_KEY` in `.env.local`, run `npm run dev`, declare a persona, and ask "what has Ethan built?", "show me his skills", "how can I contact him?". Confirm the overview (with the gated divider only for an aerospace/security persona), skills (with emphasis), and contact (with a working resume download) compose in, and that tapping a suggested direction continues the conversation. If the model under-calls a tool, note it (Plan 5 tunes the orchestration); reliable rendering on at least one chain model is sufficient for this milestone.

- [ ] **Step 6: Commit** (allow empty if nothing changed):

```bash
git commit --allow-empty -m "chore: component-vocabulary milestone green (tests + build + bundle privacy)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (against the spec and roadmap)

- **§5.3 multi-project overview** (lead + rows + gated divider): Task 4 (`showProjects` + `ProjectsComponent`, "usually hidden, surfaced for you" divider, `includeGated` gating). ✓
- **§5.4 skills** (grouped text, no pills, emphasis tailoring): Task 5 (`showSkills` + `SkillsComponent` + `matchesEmphasis`). ✓
- **§5.5 experience** (role+org, mono meta, bullets, emphasis): Task 6. ✓
- **§5.6 education** (degree+school, mono meta): Task 7. ✓
- **§5.8 contact + resume** (`mailto`, project links, downloadable resume asset): Task 8 (`showContact` + `ContactComponent` + `public/ethan-triska-resume.pdf`). ✓
- **§5.9 suggested directions** (2 to 3 bracketed mono chips, adapt each turn, tappable): Task 9 + wired in Task 10. ✓
- **§6 tailoring** (ordering via `lead`, emphasis via `emphasis`, gating via `includeGated`, suggested directions): Tasks 4–9 + Task 11 (system prompt). ✓
- **§7.3 boundary** (public selectors re-validate; client components re-validate at the render boundary; no `server-only` in client; bundle grep): Tasks 1, 3–9 + Task 12 gate. ✓
- **§8.2 generative-UI mechanism** (tools-as-components, render-boundary revalidation, input/output-available/output-error states): Tasks 4–10. ✓
- **Reliability continuity** (leak suppression covers new tool names): Task 10. ✓
- **Placeholder scan:** every code step has complete code; the only conditional is the resume-asset generation (Task 8 Step 1), which has an explicit DONE_WITH_CONCERNS fallback rather than a fake binary. ✓
- **Type consistency:** `getPublicSkills/Experience/Education/Contact`, `matchesEmphasis`, `renderProjectSchema`/`RenderProject`, `ProjectsComponent`/`SkillsComponent`/`ExperienceComponent`/`EducationComponent`/`ContactComponent`/`SuggestedDirections`, and tool names `showProjects`/`showSkills`/`showExperience`/`showEducation`/`showContact`/`suggestDirections` are used identically across tasks. MessagePart part-type strings are exactly `tool-<toolName>`. ✓

## Out of scope (later plans)

- Serenity live now-playing + on-site audio (Plan 4): the Serenity project still renders via `showProject`/`showProjects` as a static card here; the live variant is Plan 4.
- The authored-opening orchestration and final placement of the suggested-direction chips below the persistent input (Plan 5): this plan renders directions inline in the transcript and makes them tappable; Plan 5 sequences and positions them.
- Markdown/diagrams rich prose (§5.7) and real Redis/Turnstile + deploy (Plan 6).

## Open items carried forward

- Confirm `tech · year` for Vox, Serenity, SSTPA, Satellite (the `CONFIRM` markers in `content/projects.ts`) — still open from Plan 1.
- The resume PDF in `public/ethan-triska-resume.pdf` is generated from `resume.md` and contains real contact details; replace it with a designed PDF whenever ready by overwriting that file (no code change needed).
- Serenity upstream now-playing endpoint, stream URL, and on-site playback licensing (Plan 4).
