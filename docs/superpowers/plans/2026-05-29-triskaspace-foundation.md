# triskaspace Foundation Implementation Plan (Plan 1 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the triskaspace app with a validated content model, a structurally-enforced public/private boundary, the refined-quiet design system with Compose motion, the entry/persona screen, and an AI chat backend that can stream a tailored answer and render one real component end to end.

**Architecture:** Next.js App Router on Vercel. Typed, Zod-validated TypeScript content modules are the runtime source of truth, with a single `toPublic()` choke point so private notes can never reach the model or the browser. The AI backend streams via the AI SDK with tools-as-components (Kimi K2.6 default through OpenRouter, Claude/Gemini fallback), with `max_tokens` and input caps always on and Redis/Turnstile stubbed behind interfaces. The UI is a bespoke CSS design system; the signature "Compose" motion is a small reusable primitive.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, React 19, `ai` v6 + `@ai-sdk/react` v3 + `@openrouter/ai-sdk-provider`, Zod v4, Vitest + @testing-library/react + jsdom, next/font (self-hosted Inter + JetBrains Mono), plain CSS (custom properties + CSS Modules).

**Source documents in repo:** `resume.md` (current, canonical for education/experience/skills), `axiominfo.md` (Axiom architecture doc to distill), `supplamental_context.md` (empty, to be rebuilt). The design spec lives at `docs/superpowers/specs/2026-05-29-triskaspace-dynamic-portfolio-design.md`.

> **This plan = the first staged milestone.** When it completes you have a running, tested app: the resting page renders, declaring a persona (chip or free text) reveals a streamed AI answer that can render a real Project component, and the content boundary is proven by tests. Plans 2–6 (full component vocabulary, Serenity live audio, the authored-opening orchestration, Markdown/diagrams, real protection + deploy) are scoped in the **Roadmap** at the end and written when reached.

---

## Conventions

- Commit after every task with the message shown. Branch: create and work on `build/foundation` (this folder is not yet a git repo; Task 0.1 initializes it).
- Test command throughout: `npx vitest run <path>` for a single file, `npx vitest run` for all.
- No em dashes in any visitor-facing copy (per the style spec). Use periods, commas, parentheses.
- File responsibility is one-thing-per-file. Component styles live in a colocated `.module.css`.

---

## File structure created by this plan

```
.gitignore
package.json
next.config.ts
tsconfig.json
vitest.config.ts
test/setup.ts
supplamental_context.md                # rebuilt (Task 1.7)

app/
  layout.tsx                            # fonts, <html>, global chrome
  page.tsx                              # server component: builds persona-less shell
  globals.css                           # design tokens + Compose keyframes + reset
  api/chat/route.ts                     # streaming chat endpoint

content/
  schema.ts                             # Zod schemas + Public* types
  public.ts                             # toPublic* choke point
  projects.ts                           # Project[] (featured + gated)
  skills.ts
  experience.ts
  education.ts
  profile.ts                            # identity, contact, career goals, voice rules
  index.ts                              # public selectors (getPublicProjects, etc.)
  build-context.ts                      # buildContext(): system-prompt content string

lib/
  persona.ts                            # PersonaRole, classifyPersona() (client-safe)
  ai/
    model.ts                            # provider + model id + fallback chain
    request.ts                          # buildModelRequest(): max_tokens + caps (always on)
    system-prompt.ts                    # composeSystemPrompt(persona, context)
    tools.ts                            # tools-as-components (showProject for now)
  protection/
    rate-limiter.ts                     # RateLimiter interface + InMemory/NoOp impls
    verifier.ts                         # HumanVerifier interface + AlwaysPass impl

components/
  motion/
    Composed.tsx                        # the Compose primitive
    Composed.module.css
  chrome/
    Header.tsx  Header.module.css
    Footer.tsx  Footer.module.css
    Column.tsx  Column.module.css       # narrow centered column
  entry/
    Entry.tsx   Entry.module.css        # "who's visiting?" + chips + describe box
  chat/
    Chat.tsx    Chat.module.css         # 'use client' useChat host
    MessagePart.tsx                     # switch on tool part type/state
    Input.tsx   Input.module.css        # persistent input + role-tinted caret
  vocabulary/
    Project.tsx Project.module.css      # single project component (render-boundary revalidated)
```

---

## Phase 0 — Scaffold and tooling

### Task 0.1: Initialize repo and Next.js app

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `.gitignore`

- [ ] **Step 1: Initialize git and ignore artifacts**

Run from the project root (`/Users/ethantriska/triskaspaceupdate_muchbetterversion`):

```bash
git init
git checkout -b build/foundation
```

Create `.gitignore`:

```
node_modules/
.next/
.env*.local
.vercel/
.superpowers/
*.tsbuildinfo
coverage/
```

- [ ] **Step 2: Create package.json with pinned majors**

```json
{
  "name": "triskaspace",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "ai": "^6.0.0",
    "@ai-sdk/react": "^3.0.0",
    "@openrouter/ai-sdk-provider": "^1.0.0",
    "zod": "^4.0.0",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/node": "^22.0.0",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 3: Install and record exact resolved versions**

```bash
npm install
```

Expected: `node_modules/` populated, `package-lock.json` created. After install, open `package-lock.json` and confirm the resolved `next`, `ai`, `@ai-sdk/react`, and `zod` versions. If any major resolved differently than expected, note it in the commit message (the AI SDK API surface changes across majors; later tasks assume `ai` v6 `streamText` + `toUIMessageStreamResponse` and `@ai-sdk/react` `useChat` + `DefaultChatTransport`).

- [ ] **Step 4: Create next.config.ts and tsconfig.json**

`next.config.ts`:

```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with pinned deps"
```

### Task 0.2: Vitest setup

**Files:**
- Create: `vitest.config.ts`, `test/setup.ts`

- [ ] **Step 1: Write vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    globals: true,
  },
  resolve: { alias: { "@": new URL(".", import.meta.url).pathname } },
});
```

Add the plugin: `npm install -D @vitejs/plugin-react`.

- [ ] **Step 2: Write test/setup.ts**

```ts
import "@testing-library/jest-dom/vitest";

// content modules import 'server-only'; stub it so unit tests can import them.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
```

- [ ] **Step 3: Add a smoke test and run it**

Create `test/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("runs", () => { expect(1 + 1).toBe(2); });
});
```

Run: `npx vitest run test/smoke.test.ts`
Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add vitest + testing-library setup"
```

### Task 0.3: Fonts, design tokens, and the bare layout

**Files:**
- Create: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Write design tokens + reset + Compose keyframes in app/globals.css**

```css
:root {
  --bg: #0e0e0e;
  --bg-raised: #151515;
  --border: #2a2a2a;
  --border-soft: #232323;
  --text: #d4d4d4;
  --text-secondary: #888888;
  --text-tertiary: #666666;

  /* role tints (also the only component accents) */
  --tint-recruiter: #93a3f8;
  --tint-hiring: #b0a8f0;
  --tint-engineer: #88c9a1;
  --tint-founder: #d8b783;
  --tint-friend: #d49bb4;
  --tint-curious: #8fc6cf;

  --onair: var(--tint-engineer);

  /* the active persona tint; defaults to recruiter lavender, set by JS */
  --ink: var(--tint-recruiter);

  --max-col: 640px;
  --pad-x: 24px;
  --leading-prose: 1.7;
}

* { box-sizing: border-box; }
html { background: var(--bg); }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
::selection { background: rgba(147, 163, 248, 0.3); }

/* Compose: a block arrives, then its lines write themselves in. */
@keyframes panelIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes lineIn  { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }

@media (prefers-reduced-motion: reduce) {
  /* motion utilities must check this; see Composed.tsx */
}
```

- [ ] **Step 2: Write app/layout.tsx with self-hosted fonts**

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "ethan triska",
  description: "Ethan Triska — dynamic portfolio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Write a minimal app/page.tsx**

```tsx
export default function Page() {
  return <main style={{ padding: 24 }}>ethan triska</main>;
}
```

- [ ] **Step 4: Run the dev server and verify**

Run: `npm run dev`
Expected: app boots on http://localhost:3000 and shows "ethan triska" with no console errors. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: fonts, design tokens, bare layout"
```

---

## Phase 1 — Content model and public/private boundary

This phase implements the spec's defining requirement (§7): one edit updates both the model's knowledge and the on-page component, with private fields that structurally cannot leak.

### Task 1.1: Zod schemas and Public types

**Files:**
- Create: `content/schema.ts`
- Test: `content/schema.test.ts`

- [ ] **Step 1: Write the failing test**

`content/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { projectSchema, publicProjectSchema } from "./schema";

const sample = {
  id: "serenity",
  name: "Serenity Radio",
  tagline: "An LLM-hosted 24/7 radio station.",
  description: "Long description.",
  tech: "typescript",
  year: "2026",
  url: "https://underclassradio.com",
  status: "featured" as const,
  audienceTags: ["ai"],
  live: { kind: "serenity" as const },
  privateNotes: "secret cost trick",
};

describe("project schema", () => {
  it("parses a full project", () => {
    const p = projectSchema.parse(sample);
    expect(p.name).toBe("Serenity Radio");
  });
  it("public schema strips privateNotes", () => {
    const pub = publicProjectSchema.parse(sample) as Record<string, unknown>;
    expect("privateNotes" in pub).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run content/schema.test.ts`
Expected: FAIL ("Cannot find module './schema'").

- [ ] **Step 3: Implement content/schema.ts**

```ts
import "server-only";
import { z } from "zod";

export const audienceTag = z.enum([
  "aerospace", "ai", "security", "data", "business", "general",
]);

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  tech: z.string(),
  year: z.string(),
  url: z.string().url().optional(),
  repo: z.string().url().optional(),
  status: z.enum(["featured", "gated"]),
  audienceTags: z.array(audienceTag).default([]),
  live: z.object({ kind: z.literal("serenity") }).optional(),
  privateNotes: z.string().optional(),
});
export type Project = z.infer<typeof projectSchema>;
export const publicProjectSchema = projectSchema.omit({ privateNotes: true });
export type PublicProject = z.infer<typeof publicProjectSchema>;

export const skillGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  items: z.array(z.string()),
  audienceTags: z.array(audienceTag).default([]),
});
export type SkillGroup = z.infer<typeof skillGroupSchema>;

export const experienceSchema = z.object({
  id: z.string(),
  role: z.string(),
  org: z.string(),
  location: z.string(),
  dates: z.string(),
  bullets: z.array(z.string()),
  audienceTags: z.array(audienceTag).default([]),
});
export type Experience = z.infer<typeof experienceSchema>;

export const educationSchema = z.object({
  id: z.string(),
  degree: z.string(),
  school: z.string(),
  location: z.string(),
  meta: z.string(),
});
export type Education = z.infer<typeof educationSchema>;

export const profileSchema = z.object({
  name: z.string(),
  wordmark: z.string(),
  email: z.string().email(),
  summary: z.string(),
  careerGoals: z.string(),
  voiceRules: z.array(z.string()),
});
export type Profile = z.infer<typeof profileSchema>;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run content/schema.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add content/schema.ts content/schema.test.ts
git commit -m "feat: content Zod schemas + Public types"
```

### Task 1.2: The toPublic choke point

**Files:**
- Create: `content/public.ts`
- Test: `content/public.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { toPublicProject } from "./public";
import type { Project } from "./schema";

const withSecret: Project = {
  id: "x", name: "X", tagline: "t", description: "d", tech: "go", year: "2026",
  status: "featured", audienceTags: [], privateNotes: "DO NOT LEAK",
};

describe("toPublicProject", () => {
  it("removes private keys and their values", () => {
    const pub = toPublicProject(withSecret);
    expect(JSON.stringify(pub)).not.toContain("DO NOT LEAK");
    expect("privateNotes" in (pub as Record<string, unknown>)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run content/public.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement content/public.ts**

```ts
import "server-only";
import { publicProjectSchema, type Project, type PublicProject } from "./schema";

export const toPublicProject = (p: Project): PublicProject =>
  publicProjectSchema.parse(p);

export const toPublicProjects = (ps: Project[]): PublicProject[] =>
  ps.map(toPublicProject);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run content/public.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add content/public.ts content/public.test.ts
git commit -m "feat: toPublic choke point strips private fields"
```

### Task 1.3: Populate projects.ts (featured + gated)

**Files:**
- Create: `content/projects.ts`
- Test: `content/projects.test.ts`

> Content note: Axiom is featured and carries the richest description (distilled from `axiominfo.md`, with all dev-status/phase/ECO language removed). SSTPA and Satellite are gated with short descriptions. OpenClaw is omitted. Vox is a macOS local speech-to-text app. Meta `tech · year` strings marked `CONFIRM` should be verified with Ethan before Plan 2; use the listed defaults until then.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { projects } from "./projects";
import { projectSchema } from "./schema";

describe("projects content", () => {
  it("every entry is schema-valid", () => {
    for (const p of projects) expect(() => projectSchema.parse(p)).not.toThrow();
  });
  it("has the expected featured set and no OpenClaw", () => {
    const ids = projects.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["serenity", "axiom", "vox"]));
    expect(ids).not.toContain("openclaw");
  });
  it("axiom has the longest description (it is featured)", () => {
    const axiom = projects.find((p) => p.id === "axiom")!;
    const others = projects.filter((p) => p.id !== "axiom");
    for (const o of others) expect(axiom.description.length).toBeGreaterThan(o.description.length);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run content/projects.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement content/projects.ts**

Author the array (descriptions are real content sourced from the project sites and `axiominfo.md`; keep Axiom the longest). Distill Axiom to substance only: budget-aware orchestration, the trusted engine vs untrusted planes model, disposable "Meeseeks" workers, orchestrator to sub-orchestrators to workers, the cost-minimization thesis. Remove anything about development phase, status, or ECOs.

```ts
import "server-only";
import { type Project } from "./schema";

export const projects: Project[] = [
  {
    id: "serenity",
    name: "Serenity Radio",
    tagline: "An LLM-hosted 24/7 internet radio station.",
    description:
      "Serenity Radio is an autonomous internet radio station with no human staff. A language model selects tracks from a curated library, schedules shows, and replies to listener messages in real time. Listeners can send short notes and hear the AI host respond on air.",
    tech: "typescript", // CONFIRM tech
    year: "2026",
    url: "https://underclassradio.com",
    status: "featured",
    audienceTags: ["ai"],
    live: { kind: "serenity" },
    privateNotes:
      "Cost trick: aggressive context-management keeps the always-on host cheap to run. Never expose.",
  },
  {
    id: "axiom",
    name: "Axiom",
    tagline: "A cost-minimizing engine for agentic AI.",
    description:
      "Axiom is an agent orchestration engine that drives down the cost and unreliability of multi-agent AI. A small trusted engine holds authority and budget; it compartmentalizes a high-level goal into bounded tasks and routes each to the cheapest model that can do it reliably. Planning and execution run in untrusted planes the engine supervises, so a misbehaving agent cannot exceed its scope or budget. Workers are disposable: each is spun up for one bounded task with the minimum necessary context, does the job, and is discarded, which keeps context small and hallucinations low. An orchestrator delegates to sub-orchestrators and then to workers, giving a clean hierarchy from intent to finished work. Written in Go.",
    tech: "go",
    year: "2026",
    url: "https://agentaxiom.space",
    status: "featured",
    audienceTags: ["ai", "data"],
  },
  {
    id: "vox",
    name: "Vox",
    tagline: "On-device speech to text for macOS.",
    description:
      "Vox is a macOS dictation app that turns speech into text entirely on-device, with nothing sent to the cloud. A system-wide hotkey works in any app, it supports Whisper and Parakeet models, transcribes audio files, learns custom vocabulary, and runs fully offline after the initial model download. One-time 5 dollar license, no subscription.",
    tech: "go", // CONFIRM tech (macOS app; confirm language/year)
    year: "2026",
    url: "https://voxtts.space",
    status: "featured",
    audienceTags: ["ai"],
  },
  {
    id: "sstpa",
    name: "SSTPA Tool",
    tagline: "Systems-security engineering for large hierarchical systems.",
    description:
      "A desktop tool that helps engineers apply the Systems Security-Theoretic Process Analysis method to large, air-gapped systems, modeling system hierarchy and generating security requirements.",
    tech: "python", // CONFIRM
    year: "2025",
    status: "gated",
    audienceTags: ["security", "aerospace"],
  },
  {
    id: "satellite",
    name: "Satellite Simulator",
    tagline: "Custom-physics orbital mechanics with GIS visualization.",
    description:
      "A simulation tool with a custom physics engine for orbital mechanics and integrated GIS data for realistic visualization.",
    tech: "c++", // CONFIRM year
    year: "2025",
    status: "gated",
    audienceTags: ["aerospace"],
  },
];
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run content/projects.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add content/projects.ts content/projects.test.ts
git commit -m "feat: projects content (Axiom featured, gated trimmed, no OpenClaw)"
```

### Task 1.4: Populate skills / experience / education / profile from resume.md

**Files:**
- Create: `content/skills.ts`, `content/experience.ts`, `content/education.ts`, `content/profile.ts`
- Test: `content/resume-content.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { skills } from "./skills";
import { experience } from "./experience";
import { education } from "./education";
import { profile } from "./profile";
import { skillGroupSchema, experienceSchema, educationSchema, profileSchema } from "./schema";

describe("resume-derived content", () => {
  it("validates", () => {
    skills.forEach((s) => expect(() => skillGroupSchema.parse(s)).not.toThrow());
    experience.forEach((e) => expect(() => experienceSchema.parse(e)).not.toThrow());
    education.forEach((e) => expect(() => educationSchema.parse(e)).not.toThrow());
    expect(() => profileSchema.parse(profile)).not.toThrow();
  });
  it("includes Northrop Grumman and DePaul", () => {
    expect(experience.map((e) => e.org)).toContain("Northrop Grumman Space Systems");
    expect(education.map((e) => e.school)).toContain("DePaul University");
  });
  it("profile email is ethan@triska.space", () => {
    expect(profile.email).toBe("ethan@triska.space");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run content/resume-content.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement the four modules from resume.md**

`content/skills.ts`:

```ts
import "server-only";
import { type SkillGroup } from "./schema";

export const skills: SkillGroup[] = [
  { id: "languages", label: "languages", items: ["Python", "SQL", "Go", "VBA", "Bash", "PowerShell"], audienceTags: ["data"] },
  { id: "ai-ml", label: "AI / ML", items: ["Agentic orchestration", "Cost-minimization inference", "NLP", "Generative UI"], audienceTags: ["ai"] },
  { id: "data", label: "data / analytics", items: ["Pandas", "NumPy", "SpaCy", "K-nearest-neighbors", "Cluster analysis", "Decision trees", "ARIMA", "Regression", "System reliability analysis"], audienceTags: ["data"] },
  { id: "tooling", label: "tooling", items: ["Git", "MS Access", "Tableau", "Pivot Tables"], audienceTags: ["general"] },
];
```

`content/experience.ts`:

```ts
import "server-only";
import { type Experience } from "./schema";

export const experience: Experience[] = [
  {
    id: "ng",
    role: "Pricing & Estimating Intern",
    org: "Northrop Grumman Space Systems",
    location: "Dulles, VA",
    dates: "Jun 2024 - Aug 2024",
    bullets: [
      "Built a Python Cost Volume generator with an Agile Scrum team that automates CV creation and assures DFARS compliance, intended for the entire Space Sector.",
      "Reviewed Basis of Estimates for accuracy and sector-policy compliance, and analyzed BOE quality, revenue, and headcount metrics in Tableau.",
      "Independently developed Pricing & Estimating onboarding training in Adobe Captivate, used across the Space Sector.",
    ],
    audienceTags: ["aerospace", "data", "business"],
  },
  {
    id: "pampco",
    role: "Data Analytics Assistant",
    org: "Pampco",
    location: "Passaic, NJ",
    dates: "Jun 2023 - Aug 2023",
    bullets: [
      "Aggregated vendor data into a single rebate-management report, improving accessibility and efficiency.",
      "Cleaned and standardized product-catalog data in Excel.",
    ],
    audienceTags: ["data", "business"],
  },
];
```

`content/education.ts`:

```ts
import "server-only";
import { type Education } from "./schema";

export const education: Education[] = [
  { id: "depaul", degree: "M.S. Computer Science", school: "DePaul University", location: "Chicago, IL", meta: "expected 2028" },
  { id: "scranton", degree: "B.S. Business Analytics, Operations Management minor", school: "University of Scranton", location: "Scranton, PA", meta: "2025 · Dean's List" },
];
```

`content/profile.ts`:

```ts
import "server-only";
import { type Profile } from "./schema";

export const profile: Profile = {
  name: "Ethan Triska",
  wordmark: "ethan triska",
  email: "ethan@triska.space",
  summary:
    "Ethan Triska turns business-analytics training into AI tools that ship. He pairs a Business Analytics background with hands-on AI engineering, with experience at Northrop Grumman Space Systems and graduate study in Computer Science at DePaul.",
  careerGoals:
    "Seeking roles across AI engineering and analysis, data engineering and analysis, and operations. Long-term: bridging complex AI logic and practical, cost-effective business applications.",
  voiceRules: [
    "Speak as an AI assistant showcasing Ethan's work. Never claim to be Ethan.",
    "Only state what is in the provided sources. If something is not there, say it is not available.",
    "Default to third person. Loosen to warm and casual only for the friend persona.",
    "No em dashes, no exclamation marks, no marketing superlatives.",
  ],
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run content/resume-content.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add content/skills.ts content/experience.ts content/education.ts content/profile.ts content/resume-content.test.ts
git commit -m "feat: resume-derived content modules"
```

### Task 1.5: Public selectors (content/index.ts)

**Files:**
- Create: `content/index.ts`
- Test: `content/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { getPublicProjects, getFeaturedPublicProjects } from "./index";

describe("public selectors", () => {
  it("never expose privateNotes", () => {
    const all = JSON.stringify(getPublicProjects());
    expect(all).not.toContain("Cost trick");
    expect(all).not.toContain("privateNotes");
  });
  it("featured selector returns only featured", () => {
    expect(getFeaturedPublicProjects().every((p) => p.status === "featured")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run content/index.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement content/index.ts**

```ts
import "server-only";
import { projects } from "./projects";
import { toPublicProjects } from "./public";
import type { PublicProject } from "./schema";

export const getPublicProjects = (): PublicProject[] => toPublicProjects(projects);
export const getFeaturedPublicProjects = (): PublicProject[] =>
  toPublicProjects(projects.filter((p) => p.status === "featured"));
export const getGatedPublicProjects = (): PublicProject[] =>
  toPublicProjects(projects.filter((p) => p.status === "gated"));
export const getPublicProjectById = (id: string): PublicProject | undefined => {
  const p = projects.find((x) => x.id === id);
  return p ? toPublicProjects([p])[0] : undefined;
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run content/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add content/index.ts content/index.test.ts
git commit -m "feat: public content selectors"
```

### Task 1.6: buildContext for the system prompt

**Files:**
- Create: `content/build-context.ts`
- Test: `content/build-context.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildContext } from "./build-context";

describe("buildContext", () => {
  const ctx = buildContext();
  it("includes public project names", () => {
    expect(ctx).toContain("Serenity Radio");
    expect(ctx).toContain("Axiom");
  });
  it("never includes private notes", () => {
    expect(ctx).not.toContain("Cost trick");
    expect(ctx.toLowerCase()).not.toContain("privatenotes");
  });
  it("includes voice rules", () => {
    expect(ctx).toContain("Never claim to be Ethan");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run content/build-context.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement content/build-context.ts**

```ts
import "server-only";
import { getPublicProjects } from "./index";
import { skills } from "./skills";
import { experience } from "./experience";
import { education } from "./education";
import { profile } from "./profile";

export function buildContext(): string {
  const lines: string[] = [];
  lines.push(`# Ethan Triska`);
  lines.push(profile.summary);
  lines.push(`Career goals: ${profile.careerGoals}`);
  lines.push(`Contact: ${profile.email}`);

  lines.push(`\n## Voice rules`);
  for (const r of profile.voiceRules) lines.push(`- ${r}`);

  lines.push(`\n## Projects`);
  for (const p of getPublicProjects()) {
    lines.push(`### ${p.name} (${p.status}) [tags: ${p.audienceTags.join(", ")}]`);
    lines.push(`${p.tagline}`);
    lines.push(`${p.description}`);
    lines.push(`Meta: ${p.tech} · ${p.year}${p.url ? ` · ${p.url}` : ""}`);
  }

  lines.push(`\n## Skills`);
  for (const s of skills) lines.push(`- ${s.label}: ${s.items.join(", ")}`);

  lines.push(`\n## Experience`);
  for (const e of experience) {
    lines.push(`- ${e.role}, ${e.org} (${e.location}, ${e.dates})`);
    for (const b of e.bullets) lines.push(`  - ${b}`);
  }

  lines.push(`\n## Education`);
  for (const e of education) lines.push(`- ${e.degree}, ${e.school} (${e.location}, ${e.meta})`);

  return lines.join("\n");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run content/build-context.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add content/build-context.ts content/build-context.test.ts
git commit -m "feat: buildContext system-prompt content (public only)"
```

### Task 1.7: Rebuild supplamental_context.md (human source of truth)

**Files:**
- Modify: `supplamental_context.md` (currently empty)

> This is the human-maintained narrative Ethan edits. The TS content modules are the machine source the app consumes; this file is the prose master they are authored from. Keep them consistent.

- [ ] **Step 1: Read the sources**

Read `axiominfo.md` in full and `resume.md`. Note the Axiom substance to keep (Section 1 Overview, 2 Design Principles, 3 System Architecture, 4 Trusted vs Untrusted, 8/9/10 Orchestrator/Sub-orchestrators/Meeseeks roles). Ignore Sections 6 (SRS format), 7 (ECOs), and any phase/status content.

- [ ] **Step 2: Write supplamental_context.md with this structure and rules**

Required sections, in order:
1. `Usage rules` — speak as an AI assistant, never as Ethan; only use these sources; if not present, say it is not available; no em dashes or superlatives.
2. `Identity & contact` — from resume.md + profile.ts (email ethan@triska.space).
3. `Career goals`.
4. `Projects` — **Axiom first and longest** (the distilled architecture write-up: budget-aware orchestration, trusted engine vs untrusted planes, disposable Meeseeks workers, orchestrator hierarchy, cost thesis; Go; agentaxiom.space). Then Serenity Radio (LLM-hosted 24/7 station, live now-playing, on-site streaming, listener messaging; underclassradio.com). Then Vox (macOS on-device speech-to-text, Whisper/Parakeet, hotkey, offline, 5 dollar one-time; voxtts.space).
5. `Gated projects (brief)` — SSTPA Tool and Satellite Simulator, two to three sentences each, tagged aerospace/security.
6. `FAQ` — carry over and update the approved answers.
7. `Fun` — music (prog rock), hobbies, The Sopranos.

Acceptance criteria (verify before commit):
- Axiom's section is the longest by a clear margin.
- No occurrence of "phase", "ECO", "in development", or status language.
- No mention of OpenClaw.
- Vox is described as speech-to-text, not text-to-speech.

- [ ] **Step 3: Commit**

```bash
git add supplamental_context.md
git commit -m "docs: rebuild supplamental_context as clean source of truth"
```

---

## Phase 2 — Design system, chrome, and the entry/persona screen

### Task 2.1: The Compose motion primitive

**Files:**
- Create: `components/motion/Composed.tsx`, `components/motion/Composed.module.css`
- Test: `components/motion/Composed.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Composed } from "./Composed";

describe("Composed", () => {
  it("renders each child as a compose line", () => {
    render(<Composed><span>one</span><span>two</span></Composed>);
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/motion/Composed.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement Composed.tsx**

The panel fades in, then children write themselves in with a stagger. Respects reduced-motion by rendering instantly.

```tsx
"use client";
import { Children, isValidElement, useEffect, useState } from "react";
import styles from "./Composed.module.css";

export function Composed({
  children,
  as: Tag = "div",
  className = "",
  startDelay = 0,
}: {
  children: React.ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  startDelay?: number;
}) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setGo(true); return; }
    const t = setTimeout(() => setGo(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  const items = Children.toArray(children);
  return (
    <Tag className={`${styles.panel} ${go ? styles.go : ""} ${className}`}>
      {items.map((child, i) => (
        <div
          key={isValidElement(child) && child.key != null ? child.key : i}
          className={styles.line}
          style={{ ["--i" as string]: i }}
        >
          {child}
        </div>
      ))}
    </Tag>
  );
}
```

- [ ] **Step 4: Implement Composed.module.css**

```css
.panel { opacity: 0; }
.panel.go { animation: panelIn 0.4s ease-out forwards; }
.line { opacity: 0; }
.go .line { animation: lineIn 0.5s ease-out forwards; animation-delay: calc(0.16s + var(--i) * 0.14s); }
@media (prefers-reduced-motion: reduce) {
  .panel, .line { opacity: 1 !important; animation: none !important; }
}
```

(`panelIn` and `lineIn` keyframes are defined globally in `app/globals.css`.)

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run components/motion/Composed.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/motion/
git commit -m "feat: Compose motion primitive"
```

### Task 2.2: Chrome (Header, Footer, Column)

**Files:**
- Create: `components/chrome/Header.tsx` + `.module.css`, `components/chrome/Footer.tsx` + `.module.css`, `components/chrome/Column.tsx` + `.module.css`

- [ ] **Step 1: Implement Column.tsx + Column.module.css**

```tsx
import styles from "./Column.module.css";
export function Column({ children }: { children: React.ReactNode }) {
  return <div className={styles.col}>{children}</div>;
}
```

```css
.col { width: 100%; max-width: var(--max-col); margin: 0 auto; padding: 0 var(--pad-x); }
```

- [ ] **Step 2: Implement Header.tsx + Header.module.css**

```tsx
import styles from "./Header.module.css";
import { profile } from "@/content/profile";
export function Header() {
  return (
    <header className={styles.header}>
      <span className={styles.mark}>{profile.wordmark}</span>
    </header>
  );
}
```

```css
.header { height: 44px; display: flex; align-items: center; max-width: var(--max-col); margin: 0 auto; padding: 0 var(--pad-x); }
.mark { font-family: var(--font-mono), monospace; font-size: 12px; letter-spacing: 0.04em; color: var(--text-tertiary); }
```

> Note: `Header` imports `profile` (which is `server-only`). Keep `Header` a server component (no `"use client"`).

- [ ] **Step 3: Implement Footer.tsx + Footer.module.css**

```tsx
import styles from "./Footer.module.css";
import { profile } from "@/content/profile";
export function Footer() {
  return (
    <footer className={styles.footer}>
      <a href={`mailto:${profile.email}`} className={styles.link}>{profile.email}</a>
    </footer>
  );
}
```

```css
.footer { padding: 40px 0 32px; max-width: var(--max-col); margin: 0 auto; padding-left: var(--pad-x); padding-right: var(--pad-x); }
.link { color: var(--ink); font-size: 13px; text-decoration: none; }
.link:hover { text-decoration: underline; }
```

- [ ] **Step 4: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/chrome/
git commit -m "feat: header, footer, narrow column chrome"
```

### Task 2.3: Persona classifier

**Files:**
- Create: `lib/persona.ts`
- Test: `lib/persona.test.ts`

> `lib/persona.ts` is client-safe (no `server-only`): the client uses `classifyPersona` to set an instant caret tint when a visitor submits free text, before the model responds. The model receives the free text too and remains authoritative for tailoring.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { classifyPersona, TINTS } from "./persona";

describe("classifyPersona", () => {
  it("routes by keyword", () => {
    expect(classifyPersona("recruiter at a space company")).toBe("recruiter");
    expect(classifyPersona("senior software engineer")).toBe("engineer");
    expect(classifyPersona("founder of a startup")).toBe("founder");
    expect(classifyPersona("just an old friend of Ethan")).toBe("friend");
  });
  it("falls back to curious", () => {
    expect(classifyPersona("hello there")).toBe("curious");
  });
  it("has a tint per role", () => {
    expect(TINTS.engineer).toMatch(/^#/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/persona.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement lib/persona.ts**

```ts
export type PersonaRole =
  | "recruiter" | "hiring" | "engineer" | "founder" | "friend" | "curious";

export const TINTS: Record<PersonaRole, string> = {
  recruiter: "#93a3f8",
  hiring: "#b0a8f0",
  engineer: "#88c9a1",
  founder: "#d8b783",
  friend: "#d49bb4",
  curious: "#8fc6cf",
};

export function classifyPersona(text: string): PersonaRole {
  const t = text.toLowerCase();
  if (/\bfriend\b|buddy|know ethan|old pal/.test(t)) return "friend";
  if (/recruit|talent|sourc|headhunt/.test(t)) return "recruiter";
  if (/hiring manager|manager hiring|lead a team|my team/.test(t)) return "hiring";
  if (/found|startup|\bceo\b|co-?found|my company/.test(t)) return "founder";
  if (/engineer|developer|\bdev\b|technical|software|\bcode\b|programmer|swe/.test(t)) return "engineer";
  return "curious";
}

export const ROLE_LABEL: Record<PersonaRole, string> = {
  recruiter: "a recruiter", hiring: "a hiring manager", engineer: "an engineer",
  founder: "a founder", friend: "a friend", curious: "just curious",
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/persona.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/persona.ts lib/persona.test.ts
git commit -m "feat: client-safe persona classifier + tints"
```

### Task 2.4: Entry screen (who's visiting + chips + describe box)

**Files:**
- Create: `components/entry/Entry.tsx` + `Entry.module.css`
- Test: `components/entry/Entry.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Entry } from "./Entry";

describe("Entry", () => {
  it("declares persona from a chip", () => {
    const onDeclare = vi.fn();
    render(<Entry onDeclare={onDeclare} />);
    fireEvent.click(screen.getByText("[ recruiter ]"));
    expect(onDeclare).toHaveBeenCalledWith({ role: "recruiter", text: null });
  });
  it("opens the describe box and submits free text", () => {
    const onDeclare = vi.fn();
    render(<Entry onDeclare={onDeclare} />);
    fireEvent.click(screen.getByText("or describe yourself →"));
    const input = screen.getByPlaceholderText(/describe/i);
    fireEvent.change(input, { target: { value: "founder building an MVP" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onDeclare).toHaveBeenCalledWith({ role: "founder", text: "founder building an MVP" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/entry/Entry.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Entry.tsx**

```tsx
"use client";
import { useState } from "react";
import styles from "./Entry.module.css";
import { classifyPersona, type PersonaRole } from "@/lib/persona";

export type Declaration = { role: PersonaRole; text: string | null };

const CHIPS: { role: PersonaRole; label: string }[] = [
  { role: "recruiter", label: "recruiter" },
  { role: "hiring", label: "hiring manager" },
  { role: "engineer", label: "engineer" },
  { role: "founder", label: "founder" },
  { role: "friend", label: "friend" },
  { role: "curious", label: "just curious" },
];

export function Entry({ onDeclare }: { onDeclare: (d: Declaration) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const submitText = () => {
    const v = text.trim();
    if (!v) return;
    onDeclare({ role: classifyPersona(v), text: v });
  };

  return (
    <div className={styles.entry}>
      <p className={styles.hook}>who&apos;s visiting?</p>
      <p className={styles.sub}>tell me, and his work assembles itself around you.</p>
      <div className={styles.chips}>
        {CHIPS.map((c) => (
          <button key={c.role} className={styles.chip}
            onClick={() => onDeclare({ role: c.role, text: null })}>
            [ {c.label} ]
          </button>
        ))}
      </div>
      <button className={styles.toggle} onClick={() => setOpen(true)}>or describe yourself →</button>
      <div className={`${styles.wrap} ${open ? styles.wrapOpen : ""}`}>
        <div className={styles.box}>
          <input
            className={styles.input}
            placeholder="e.g. recruiter at a space company, GNC team"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitText(); }}
          />
          <button className={styles.go} onClick={submitText} aria-label="submit">↵</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement Entry.module.css**

```css
.entry { padding: 80px 0 40px; }
.hook { font-size: 21px; color: var(--text); font-weight: 500; margin: 0 0 6px; }
.sub { font-size: 13px; color: var(--text-secondary); margin: 0 0 20px; }
.chips { display: flex; flex-wrap: wrap; gap: 12px; }
.chip { font-family: var(--font-mono), monospace; font-size: 13px; color: var(--ink); background: none; border: 0; padding: 0; cursor: pointer; }
.chip:hover { text-decoration: underline; }
.toggle { display: inline-block; margin-top: 18px; font-size: 12.5px; color: var(--text-tertiary); background: none; border: 0; cursor: pointer; }
.toggle:hover { color: var(--text-secondary); }
.wrap { max-height: 0; opacity: 0; overflow: hidden; transition: max-height 0.38s ease, opacity 0.32s ease, margin-top 0.38s ease; }
.wrapOpen { max-height: 70px; opacity: 1; margin-top: 14px; }
.box { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); background: var(--bg-raised); border-radius: 7px; padding: 11px 13px; }
.input { flex: 1; background: none; border: 0; outline: none; color: var(--text); font-family: var(--font-sans), sans-serif; font-size: 13px; }
.input::placeholder { color: #555; }
.go { font-family: var(--font-mono), monospace; font-size: 14px; color: var(--ink); background: none; border: 0; cursor: pointer; }
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run components/entry/Entry.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add components/entry/
git commit -m "feat: entry screen with persona chips + describe box"
```

---

## Phase 3 — AI backend skeleton with one component end to end

### Task 3.1: Protection seams (interfaces + safe defaults)

**Files:**
- Create: `lib/protection/rate-limiter.ts`, `lib/protection/verifier.ts`
- Test: `lib/protection/protection.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { InMemoryRateLimiter } from "./rate-limiter";
import { AlwaysPassVerifier } from "./verifier";

describe("protection defaults", () => {
  it("in-memory limiter blocks after the cap", async () => {
    const rl = new InMemoryRateLimiter({ max: 2, windowMs: 60_000 });
    expect((await rl.check("ip1")).ok).toBe(true);
    expect((await rl.check("ip1")).ok).toBe(true);
    expect((await rl.check("ip1")).ok).toBe(false);
    expect((await rl.check("ip2")).ok).toBe(true);
  });
  it("always-pass verifier passes", async () => {
    expect((await new AlwaysPassVerifier().verify("anything")).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/protection/protection.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the interfaces and defaults**

`lib/protection/rate-limiter.ts`:

```ts
export type RateResult = { ok: boolean; retryAfterMs?: number };
export interface RateLimiter { check(key: string): Promise<RateResult>; }

export class NoOpRateLimiter implements RateLimiter {
  async check(): Promise<RateResult> { return { ok: true }; }
}

export class InMemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private cfg: { max: number; windowMs: number }) {}
  async check(key: string): Promise<RateResult> {
    const now = Date.now();
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.cfg.windowMs);
    if (arr.length >= this.cfg.max) {
      return { ok: false, retryAfterMs: this.cfg.windowMs - (now - arr[0]) };
    }
    arr.push(now);
    this.hits.set(key, arr);
    return { ok: true };
  }
}
// Plan 6 adds RedisRateLimiter implementing RateLimiter, selected by env flag.
```

`lib/protection/verifier.ts`:

```ts
export type VerifyResult = { ok: boolean };
export interface HumanVerifier { verify(token: string): Promise<VerifyResult>; }

export class AlwaysPassVerifier implements HumanVerifier {
  async verify(): Promise<VerifyResult> { return { ok: true }; }
}
// Plan 6 adds TurnstileVerifier implementing HumanVerifier, selected by env flag.
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/protection/protection.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/protection/
git commit -m "feat: protection seams (RateLimiter + HumanVerifier interfaces)"
```

### Task 3.2: Model request builder (max_tokens + input caps always on)

**Files:**
- Create: `lib/ai/request.ts`
- Test: `lib/ai/request.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildModelParams, capMessages, MAX_OUTPUT_TOKENS, MAX_INPUT_CHARS } from "./request";

describe("request builder", () => {
  it("always sets maxOutputTokens", () => {
    expect(buildModelParams().maxOutputTokens).toBe(MAX_OUTPUT_TOKENS);
  });
  it("caps message count and truncates over-long input", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ role: "user", content: "x".repeat(5000), id: String(i) }));
    const capped = capMessages(many as never);
    expect(capped.length).toBeLessThanOrEqual(20);
    for (const m of capped) expect(JSON.stringify(m).length).toBeLessThanOrEqual(MAX_INPUT_CHARS + 200);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/ai/request.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement lib/ai/request.ts**

```ts
export const MAX_OUTPUT_TOKENS = 1024;   // hard spend cap on every request
export const MAX_INPUT_CHARS = 4000;     // per-message input cap
export const MAX_MESSAGES = 20;          // messages-per-session cap

export function buildModelParams() {
  return { maxOutputTokens: MAX_OUTPUT_TOKENS } as const;
}

type Msg = { role: string; content: unknown; id?: string };

export function capMessages<T extends Msg>(messages: T[]): T[] {
  const recent = messages.slice(-MAX_MESSAGES);
  return recent.map((m) =>
    typeof m.content === "string" && m.content.length > MAX_INPUT_CHARS
      ? ({ ...m, content: m.content.slice(0, MAX_INPUT_CHARS) } as T)
      : m
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/ai/request.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/
git commit -m "feat: model request builder with always-on caps"
```

### Task 3.3: Model provider + fallback chain

**Files:**
- Create: `lib/ai/model.ts`, `.env.example`, `.env.local`
- Test: `lib/ai/model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { MODEL_CHAIN } from "./model";

describe("model chain", () => {
  it("defaults to Kimi K2.6 then falls back", () => {
    expect(MODEL_CHAIN[0]).toBe("moonshotai/kimi-k2.6");
    expect(MODEL_CHAIN).toContain("anthropic/claude-sonnet-4.6");
    expect(MODEL_CHAIN.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/ai/model.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement lib/ai/model.ts**

```ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const MODEL_CHAIN = [
  "moonshotai/kimi-k2.6",
  "anthropic/claude-sonnet-4.6",
  "google/gemini-3-pro-preview",
] as const;

export function openrouter() {
  return createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY ?? "" });
}
// Confirm exact OpenRouter slugs at scaffold; adjust if a slug 404s.
```

`.env.example`:

```
OPENROUTER_API_KEY=
# Deferred until deploy (Plan 6):
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
# TURNSTILE_SECRET_KEY=
# ENABLE_REDIS=false
# ENABLE_TURNSTILE=false
```

Create `.env.local` with a real `OPENROUTER_API_KEY` for local dev (gitignored).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/ai/model.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/model.ts .env.example
git commit -m "feat: OpenRouter provider + Kimi-default fallback chain"
```

### Task 3.4: System prompt composer

**Files:**
- Create: `lib/ai/system-prompt.ts`
- Test: `lib/ai/system-prompt.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { composeSystemPrompt } from "./system-prompt";

describe("composeSystemPrompt", () => {
  it("embeds persona and public context, never private notes", () => {
    const sp = composeSystemPrompt({ role: "recruiter", text: "recruiter at SpaceX" });
    expect(sp).toContain("recruiter");
    expect(sp).toContain("recruiter at SpaceX");
    expect(sp).toContain("Serenity Radio");
    expect(sp).not.toContain("Cost trick");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/ai/system-prompt.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement lib/ai/system-prompt.ts**

```ts
import "server-only";
import { buildContext } from "@/content/build-context";
import { ROLE_LABEL, type PersonaRole } from "@/lib/persona";

export function composeSystemPrompt(persona: { role: PersonaRole; text: string | null }): string {
  const ctx = buildContext();
  return [
    "You are an AI assistant whose job is to showcase Ethan Triska's work to a visitor.",
    "You render answers as live components by calling tools, and you tailor everything to the visitor.",
    `The visitor is ${ROLE_LABEL[persona.role]}.`,
    persona.text ? `They described themselves as: "${persona.text}". Honor this for tailoring.` : "",
    "Rules: only state what is in the content below. If asked something not present, say it is not available. Never claim to be Ethan. Default to third person; warm and casual only for the friend persona. No em dashes, no superlatives.",
    "When you present a project, call the showProject tool rather than describing it in plain prose.",
    "End each turn by proposing the next directions for the visitor.",
    "\n--- CONTENT (everything you are allowed to say) ---\n",
    ctx,
  ].filter(Boolean).join("\n");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/ai/system-prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ai/system-prompt.ts lib/ai/system-prompt.test.ts
git commit -m "feat: persona-aware system prompt composer"
```

### Task 3.5: Tools-as-components (showProject) with public revalidation

**Files:**
- Create: `lib/ai/tools.ts`
- Test: `lib/ai/tools.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildTools } from "./tools";

describe("showProject tool", () => {
  it("returns a public project by id and never leaks private notes", async () => {
    const tools = buildTools();
    const out = await tools.showProject.execute({ id: "serenity", emphasis: [] }, { toolCallId: "t", messages: [] } as never);
    expect(out.project.name).toBe("Serenity Radio");
    expect(JSON.stringify(out)).not.toContain("Cost trick");
  });
  it("rejects an unknown id", async () => {
    const tools = buildTools();
    await expect(
      tools.showProject.execute({ id: "nope", emphasis: [] }, { toolCallId: "t", messages: [] } as never)
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement lib/ai/tools.ts**

```ts
import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { getPublicProjectById } from "@/content/index";
import { publicProjectSchema } from "@/content/schema";

export function buildTools() {
  return {
    showProject: tool({
      description: "Render a single project as a live component. Use for any project the visitor should see.",
      inputSchema: z.object({
        id: z.string().describe("project id, e.g. serenity, axiom, vox"),
        emphasis: z.array(z.string()).default([]).describe("optional keys to highlight"),
      }),
      execute: async ({ id, emphasis }) => {
        const project = getPublicProjectById(id);
        if (!project) throw new Error(`unknown project: ${id}`);
        // re-validate as public at the tool boundary
        return { project: publicProjectSchema.parse(project), emphasis };
      },
    }),
  };
}
export type Tools = ReturnType<typeof buildTools>;
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/ai/tools.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/tools.ts lib/ai/tools.test.ts
git commit -m "feat: showProject tool with public revalidation"
```

### Task 3.6: Chat route handler

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Implement the route**

```ts
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { openrouter, MODEL_CHAIN } from "@/lib/ai/model";
import { composeSystemPrompt } from "@/lib/ai/system-prompt";
import { buildTools } from "@/lib/ai/tools";
import { buildModelParams, capMessages } from "@/lib/ai/request";
import { InMemoryRateLimiter } from "@/lib/protection/rate-limiter";
import { type PersonaRole } from "@/lib/persona";

export const maxDuration = 30;
const limiter = new InMemoryRateLimiter({ max: 30, windowMs: 60_000 });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const gate = await limiter.check(ip);
  if (!gate.ok) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((gate.retryAfterMs ?? 60_000) / 1000)) },
    });
  }

  const body = (await req.json()) as {
    messages: UIMessage[];
    persona?: { role: PersonaRole; text: string | null };
  };
  const persona = body.persona ?? { role: "curious" as const, text: null };
  const messages = capMessages(body.messages);

  const result = streamText({
    model: openrouter()(MODEL_CHAIN[0]),
    system: composeSystemPrompt(persona),
    messages: convertToModelMessages(messages),
    tools: buildTools(),
    stopWhen: stepCountIs(5),
    ...buildModelParams(),
  });

  return result.toUIMessageStreamResponse();
}
// Plan 2 hardens this: provider fallback across MODEL_CHAIN, defensive tool-call repair, Turnstile gate via HumanVerifier.
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. If an AI SDK export name differs in the installed v6 (for example `convertToModelMessages` or `stopWhen`), check `node_modules/ai` types and adjust, noting it in the commit.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: streaming chat route with caps + one tool"
```

### Task 3.7: Project component (render-boundary revalidated)

**Files:**
- Create: `components/vocabulary/Project.tsx` + `Project.module.css`
- Test: `components/vocabulary/Project.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectComponent } from "./Project";

const project = {
  id: "serenity", name: "Serenity Radio", tagline: "An LLM-hosted station.",
  description: "desc", tech: "typescript", year: "2026",
  url: "https://underclassradio.com", status: "featured" as const, audienceTags: ["ai" as const],
};

describe("ProjectComponent", () => {
  it("renders name, tagline, and meta", () => {
    render(<ProjectComponent project={project} emphasis={[]} />);
    expect(screen.getByText("Serenity Radio")).toBeInTheDocument();
    expect(screen.getByText(/typescript · 2026/)).toBeInTheDocument();
  });
  it("throws on malformed (un-public) input", () => {
    // missing required fields must be rejected at the render boundary
    const bad = { id: "x" } as never;
    expect(() => render(<ProjectComponent project={bad} emphasis={[]} />)).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run components/vocabulary/Project.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Project.tsx**

The component re-validates its props with the public schema at the render boundary (never trust raw tool output). It uses the Compose primitive so it writes itself in.

```tsx
"use client";
import { z } from "zod";
import { Composed } from "@/components/motion/Composed";
import styles from "./Project.module.css";

// client-safe copy of the public shape (no server-only import in client bundle)
const renderSchema = z.object({
  id: z.string(), name: z.string(), tagline: z.string(), description: z.string(),
  tech: z.string(), year: z.string(), url: z.string().url().optional(),
  repo: z.string().url().optional(), status: z.enum(["featured", "gated"]),
  audienceTags: z.array(z.string()).default([]),
  live: z.object({ kind: z.literal("serenity") }).optional(),
});
export type RenderProject = z.infer<typeof renderSchema>;

export function ProjectComponent({ project, emphasis }: { project: RenderProject; emphasis: string[] }) {
  const p = renderSchema.parse(project); // render-boundary revalidation
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

- [ ] **Step 4: Implement Project.module.css**

```css
.card { border: 1px solid var(--border); background: var(--bg-raised); padding: 14px 16px; margin: 14px 0; }
.title { font-size: 14px; color: var(--text); font-weight: 500; }
.tagline { font-size: 12.5px; color: var(--text-secondary); margin-top: 4px; }
.desc { font-size: 13px; color: var(--text-secondary); line-height: var(--leading-prose); margin-top: 8px; }
.meta { font-family: var(--font-mono), monospace; font-size: 11px; color: var(--text-tertiary); margin-top: 10px; }
.link { color: var(--ink); text-decoration: none; }
.link:hover { text-decoration: underline; }
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run components/vocabulary/Project.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add components/vocabulary/
git commit -m "feat: Project component with render-boundary revalidation"
```

### Task 3.8: Wire the client (Chat host + input + message parts) and the page

**Files:**
- Create: `components/chat/Chat.tsx` + `Chat.module.css`, `components/chat/Input.tsx` + `Input.module.css`, `components/chat/MessagePart.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Implement MessagePart.tsx (switch on tool part)**

```tsx
"use client";
import { ProjectComponent } from "@/components/vocabulary/Project";

export function MessagePart({ part }: { part: { type: string; state?: string; output?: unknown; text?: string } }) {
  if (part.type === "text") return <p>{part.text}</p>;
  if (part.type === "tool-showProject") {
    if (part.state === "output-available" && part.output) {
      const out = part.output as { project: never; emphasis: string[] };
      return <ProjectComponent project={out.project} emphasis={out.emphasis ?? []} />;
    }
    return <div aria-label="composing" />; // skeleton; Plan 2 styles the composing state
  }
  return null;
}
```

- [ ] **Step 2: Implement Input.tsx + Input.module.css (role-tinted caret)**

```tsx
"use client";
import { useState } from "react";
import styles from "./Input.module.css";

export function Input({ onSend }: { onSend: (text: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className={styles.box}>
      <input
        className={styles.input}
        placeholder="ask anything"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onSend(v.trim()); setV(""); } }}
      />
    </div>
  );
}
```

```css
.box { display: flex; align-items: center; border: 1px solid var(--border); background: var(--bg-raised); border-radius: 7px; padding: 11px 14px; margin: 14px 0; }
.input { flex: 1; background: none; border: 0; outline: none; color: var(--text); font-size: 13px; caret-color: var(--ink); font-family: var(--font-sans), sans-serif; }
.input::placeholder { color: var(--text-tertiary); }
```

- [ ] **Step 3: Implement Chat.tsx (useChat host) + Chat.module.css**

```tsx
"use client";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Entry, type Declaration } from "@/components/entry/Entry";
import { Input } from "./Input";
import { MessagePart } from "./MessagePart";
import { TINTS } from "@/lib/persona";
import styles from "./Chat.module.css";

export function Chat() {
  const [persona, setPersona] = useState<Declaration | null>(null);
  const { messages, sendMessage } = useChat({
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

  if (!persona) return <Entry onDeclare={declare} />;

  return (
    <div className={styles.chat}>
      {messages.map((m) => (
        <div key={m.id} className={m.role === "user" ? styles.user : styles.assistant}>
          {m.parts.map((part, i) => <MessagePart key={i} part={part as never} />)}
        </div>
      ))}
      <Input onSend={(text) => sendMessage({ text }, { body: { persona } })} />
    </div>
  );
}
```

```css
.chat { padding: 24px 0 40px; }
.user { color: var(--text-tertiary); font-size: 12px; font-family: var(--font-mono), monospace; margin: 16px 0 4px; }
.assistant { color: var(--text-secondary); font-size: 14px; line-height: var(--leading-prose); }
```

> Note: passing per-message `body.persona` requires the AI SDK v6 `sendMessage` options to forward a custom body. If the installed version forwards body differently, set it once on the transport instead (`new DefaultChatTransport({ api, body: { persona } })`) and recreate the transport when persona changes. Verify against the installed `@ai-sdk/react` types.

- [ ] **Step 4: Wire app/page.tsx**

```tsx
import { Header } from "@/components/chrome/Header";
import { Footer } from "@/components/chrome/Footer";
import { Column } from "@/components/chrome/Column";
import { Chat } from "@/components/chat/Chat";

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Column>
          <Chat />
        </Column>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 5: Manual end-to-end verification**

Run: `npm run dev`, open http://localhost:3000.
Verify:
1. The resting page shows the wordmark, "who's visiting?", chips, and the describe affordance.
2. Clicking "or describe yourself →" smoothly opens the box; typing and Enter declares persona.
3. The caret tint changes to match the persona (inspect `--ink` on `<html>`).
4. An assistant turn streams in, and asking "show me Serenity Radio" renders a Project component that composes in line by line.

If the model does not call the tool reliably, note it: Plan 2 adds the provider fallback and defensive tool-call repair that make Kimi reliable. For this milestone, reliable rendering on at least one of the chain models is sufficient.

- [ ] **Step 6: Commit**

```bash
git add components/chat/ app/page.tsx
git commit -m "feat: wire entry + chat + one rendered component end to end"
```

### Task 3.9: Full test run and milestone gate

- [ ] **Step 1: Run the whole suite**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 2: Type-check and lint-build**

Run: `npx tsc --noEmit && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Bundle privacy check**

Run: `grep -ri "Cost trick" .next/static 2>/dev/null || echo "clean"`
Expected: prints `clean` (no private note in the client bundle).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: foundation milestone green (tests + build + bundle privacy)"
```

---

## Self-review (performed against the spec)

- **§3 entry/persona:** Tasks 2.3, 2.4, 3.8 (chips, describe box, classify, declaration, instant tint). Authored-opening orchestration is Plan 5. ✓ for entry/liberation basics.
- **§4 visual system:** Tasks 0.3, 2.1, 2.2 (tokens, Compose, chrome). Role tints in 2.3 / globals. ✓
- **§5 components:** Project (3.7). Serenity live, multi-project, skills/experience/education, contact, suggested directions, Markdown are Plans 2–5 (Roadmap). Partial by design.
- **§6 tailoring:** system prompt + emphasis arg + persona (3.4, 3.5). Suggested directions tool is Plan 3-of-roadmap. Partial by design.
- **§7 content/boundary:** Tasks 1.1-1.7 fully. ✓ (the spec's defining requirement is complete in this plan.)
- **§8 technical:** route, model+chain, request builder, tools, revalidation (3.2-3.8). Provider fallback + defensive repair + Serenity proxies are Plan 2 / Plan 4. Partial by design.
- **§9 protection:** seams + always-on caps (3.1, 3.2). Real Redis/Turnstile is Plan 6. ✓ (deferred exactly as specified.)
- **Placeholder scan:** the `CONFIRM` meta strings are flagged open items from the spec, not vague placeholders; all code steps contain real code. ✓
- **Type consistency:** `PersonaRole`, `Declaration`, `PublicProject`/`RenderProject`, `buildTools`, `composeSystemPrompt` names match across tasks. ✓

---

## Roadmap (Plans 2–6, written when reached)

**Plan 2 — Reliable generative UI.** Provider fallback across `MODEL_CHAIN`, defensive tool-call handling (validate tool JSON, detect tool-intent leaking into text, retry/repair), the "composing" skeleton states wired to `input-*` tool states, and an error fallback for `output-error`. Verifier gate (`HumanVerifier`) inserted in the route but using `AlwaysPassVerifier`.

**Plan 3 — Full component vocabulary.** Tools + components for multi-project overview (lead + rows, gated divider), skills (emphasis tailoring), experience, education, contact/resume (with the downloadable resume asset), and `suggestDirections` (the branching chips below the input). Each tool returns public data; each component revalidates at the render boundary.

**Plan 4 — Serenity live.** `app/api/serenity/now` (now-playing JSON proxy, short cache) and `app/api/serenity/stream` (audio stream proxy). The Serenity component variant: real current track, on-site play/pause audio player (user-gesture start to satisfy autoplay policy), on-air pulse + equalizer tied to playback, graceful static degradation when the station is down. Resolve the upstream now-playing endpoint and stream URL; confirm attribution/licensing.

**Plan 5 — The authored opening + liberation.** Orchestrate the cinematic sequence (greeting writes in, lead item composes, second item, then input + suggested directions) with tuned pacing, driven by the model's tool sequence and the Compose primitive. Free-text echo + "reading you as" assignment note. Reduced-motion path.

**Plan 6 — Markdown/diagrams + real protection + deploy.** Sanitized GFM Markdown renderer (tables, code) styled refined-quiet, plus bounded lazy-loaded diagrams. `RedisRateLimiter` (Upstash) and `TurnstileVerifier`, selected by `ENABLE_REDIS` / `ENABLE_TURNSTILE` env flags (no refactor, just wiring). Final meta-string confirmations. Vercel deploy + domain cutover for triskaspace.com.

---

## Open items carried forward

- Confirm `tech · year` for Vox, Serenity, SSTPA, Satellite (the `CONFIRM` markers in `projects.ts`).
- Confirm exact OpenRouter model slugs resolve (Kimi K2.6, Claude, Gemini).
- Confirm Serenity upstream now-playing endpoint, stream URL, and on-site playback licensing (Plan 4).
- Final bound on "small graphics" for Markdown diagrams (Plan 6).
