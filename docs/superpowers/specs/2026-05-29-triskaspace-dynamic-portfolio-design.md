# triskaspace — dynamic AI portfolio (design spec / SRS)

Date: 2026-05-29
Author: Ethan Triska (with Claude)
Status: Approved for planning
Supersedes: the prior draft (oldsrs.md), which is being deleted to avoid confusion.

---

## 1. Goal

Rebuild triskaspace.com as a dynamic, AI-driven portfolio. A visitor declares who they are, the site delivers a short authored "cinematic" opening tailored to them, and then hands them full agency to explore through conversation. An AI concierge that knows Ethan's work answers questions and renders live, interactive components (projects, skills, experience, education) so each visitor sees the most relevant version of Ethan for their reason for visiting.

The defining feeling is **refined quiet that is deceptively alive**: the resting page is austere and still, and the impact comes from how components compose themselves into being and how sharply the content is tailored. The site replaces the current triskaspace.com.

This rebuild exists because the prior version had two problems: (1) the static aesthetic, taken straight from styleguide.md, read as barebones and clunky rather than intentional, and (2) Redis plus Cloudflare Turnstile made local testing painful. This spec reworks the experience and defers abuse protection behind clean seams.

## 2. Core principles

1. **Refined quiet, deceptively alive.** At rest the site is a quiet, dark, narrow-column personal site. The wow does not come from glow, gradients, or drama. It comes from motion (components that compose themselves in, line by line) and from tailoring. The contrast between the still page and the precise, alive components is the product.
2. **Guided, then liberated.** The visitor is led with a short authored opening (the cinematic moment), then given full agency: free chat plus branching suggested directions. We lead once, then get out of the way.
3. **Tailored to the visitor.** Ordering, emphasis, the lead project, the copy, and the accent tint all adapt to the visitor's declared role, their free-text self-description, and the conversation so far.
4. **Honest by construction.** The AI can only say what is in its sources. Private notes are structurally prevented from ever reaching the model or the browser.
5. **Defer protection, design for it.** Redis rate limiting and Turnstile are wanted for real deployment but are deferred so they do not slow local testing. The build uses clean interfaces so they drop in later via config, not a refactor.

The styleguide.md aesthetic is a **starting reference and palette, not a constraint**. Where its austerity made the page feel barebones, we elevate type, spacing, depth, and motion to make the minimalism read as deliberate.

## 3. Experience flow

### 3.1 Entry

On load the page is nearly empty: the lowercase wordmark `ethan triska`, the line "who's visiting?", a short prompt, the role chips, and a quiet "or describe yourself →" affordance. There is no chat box yet. The emptiness is intentional and creates intrigue.

Persona is composed of two optional inputs, at least one of which is required to proceed:

- **Role chip** (clickable): recruiter, hiring manager, engineer, founder, friend, just curious.
- **Free-text self-description.** Clicking "or describe yourself →" smoothly expands a single inline text input (a height plus opacity transition, roughly 0.35s). The visitor types who they are (for example "recruiter at a space company, GNC team") and submits with Enter or the inline control. The free text is captured as persona context and sent to the model verbatim.

Rules:
- If the visitor picks a chip, that is the explicit role.
- If the visitor only describes themselves (no chip), the AI **classifies the free text into a role family** for the tint and tailoring defaults, and proceeds. The opening acknowledges this (echoes their words back and shows a small "reading you as a recruiter" note).
- If the visitor provides both, the chip is the explicit role and the free text adds nuance for sharper tailoring.

Declaring a persona triggers the reveal: the resting prompt steps aside (fade plus a small upward translate) and the authored opening begins in the same column.

### 3.2 The authored opening (the cinematic moment)

Driven by the model and rendered with the Compose motion (Section 4.3), the opening plays as an orchestrated sequence, each block landing a beat after the previous one:

1. A tailored greeting writes itself in (tone and content vary by persona).
2. The **lead project** composes in. Which project leads depends on the persona (a recruiter may lead with Serenity Radio; an engineer may lead with Axiom).
3. A second relevant item composes in.
4. The experience **liberates**: a persistent input (with a role-tinted caret) and a row of suggested-direction chips compose in.

Pacing target: greeting at roughly 0.3s after reveal, lead item near 0.95s, second item near 1.9s, liberation near 2.9s, each block taking about 0.5s to compose with a small internal stagger. Pacing is tunable and should feel deliberate, not slow.

### 3.3 Liberation (free exploration)

After the opening, the visitor drives. A persistent terminal-style input sits at the bottom with the role-tinted caret. Below it, suggested-direction chips (bracketed monospace links) adapt every turn to the role, the free text, and what has already been asked. The visitor can type anything or tap a direction. Conversations are ephemeral (no accounts, no cross-session persistence).

### 3.4 Assistant voice

Third-person AI concierge by default ("Ethan built Serenity Radio..."). It never claims to be Ethan; it presents as an assistant showcasing Ethan's work. When the visitor is a friend, the register loosens to warmer and more casual. It refuses politely and says so when information is not in its sources. It may answer in Markdown, including tables and small diagrams, when that helps explain something (Section 5.7), used sparingly.

## 4. Visual system

### 4.1 Palette and surfaces

Dark only, muted, elevated from styleguide.md. Base background near `#0e0e0e`, raised surfaces near `#151515`, hairline borders near `#2a2a2a`. Primary text `#d4d4d4`, secondary `#888`, tertiary `#666`. No light mode. Depth comes from hairline borders and slightly lifted surfaces, not shadows or gradients on the chrome. Components may use a hair more depth than the chrome, but stay within the muted family.

### 4.2 Typography and layout

Self-hosted Inter (body and headings) and JetBrains Mono (monospace markers, meta, chips, code) via next/font. Single narrow centered column as the default. Unlike the strict 600px rule, components may widen modestly when content needs it (for example a multi-project overview), while text-heavy reading stays narrow. Generous line height on prose.

### 4.3 Motion (the signature)

Motion is the primary source of "wow" and is reserved for components, not the chrome.

- **Compose** is the signature entrance: a panel arrives essentially empty, then fills line by line, as if being written in real time. Used for the opening sequence and for newly summoned components. This is the motion that reads as "intelligent."
- **Fade-up** (a calm opacity plus small translate, roughly 0.5s) is used for minor or subsequent elements where Compose would be too much.
- Continuous micro-motion is allowed only for genuinely live status (the Serenity "on air" equalizer).

Motion should respect `prefers-reduced-motion`: when set, components appear with a minimal fade and no staggered composition.

### 4.4 Role tints

The input caret and the functional accent inside components take a desaturated tint tied to the persona. Tints double as the component accent palette so components never introduce new colors.

| Role | Hex |
| --- | --- |
| recruiter | `#93a3f8` |
| hiring manager | `#b0a8f0` |
| engineer | `#88c9a1` |
| founder | `#d8b783` |
| friend | `#d49bb4` |
| just curious | `#8fc6cf` |

Engineer green (`#88c9a1`) doubles as the live "on air" color so live components reuse the role family.

## 5. Component vocabulary (generative UI)

Each component reads clearly as a modern element against the quiet text. Strictly muted palette, no gradients, accent only from the role tint. Bottom meta on project components is two items: `tech · year`.

### 5.1 Project (single)

Name, tagline, description, two-item meta, links. Composes in line by line.

### 5.2 Serenity Radio (live variant)

The flagship live component. Serenity Radio (underclassradio.com) is an LLM-hosted 24/7 AI radio station: the AI selects tracks, schedules shows, and answers listener messages. The component must:

- Show the **actual current track** (track, artist, show) pulled live.
- Provide an **on-site audio player** that streams the live station so the visitor can listen without leaving the site. Play and pause control.
- Show an "on air" pulse and an animated equalizer that reflects playback state.
- Degrade gracefully to static project info if the station is unreachable.

Both the now-playing data and the audio stream are served through a server-side proxy (Section 8.4) because the station's API and stream restrict cross-origin access.

### 5.3 Multi-project overview

Triggered by questions like "what has Ethan built?". The most relevant project renders as a lead mini-panel; the rest render as compact, generously spaced rows (name, one-liner, two-item meta, link). Audience-gated projects appear under a quiet "usually hidden, surfaced for you" divider only when relevant.

### 5.4 Skills

Grouped lists (languages, AI/ML, data/analytics, tooling) as clean text, no pills. Tailoring is emphasis: relevant skills render in primary text color, the rest recede to secondary.

### 5.5 Experience

Entries: role plus org, mono meta (location and dates), one or two bullets. Ordering and bullet emphasis adapt to the visitor. Sourced from resume.md.

### 5.6 Education

Compact entries: degree plus school, mono meta (location, year, honors). Sourced from resume.md.

### 5.7 Rich prose (Markdown and small graphics)

The assistant can answer in Markdown when it aids explanation: headings, lists, GFM **tables**, inline code, blockquotes, and small diagrams. Rendering is through a sanitized Markdown renderer styled in the refined-quiet system (tables use hairline borders, code uses the raised surface). "Small graphics" is bounded to lightweight client-rendered diagrams (Mermaid-style flowcharts or simple bespoke bar or sparkline visuals), lazy-loaded and sanitized. The model is instructed to use these sparingly, only when they genuinely clarify.

### 5.8 Contact and resume

Surfaced on request: `mailto:ethan@triska.space`, links to live project sites, and a downloadable resume served as a static asset.

### 5.9 Suggested directions

The assistant ends each turn by proposing 2 to 3 short directions, rendered as bracketed monospace chips below the input. They adapt to role, free text, and history.

## 6. Tailoring engine

The assistant tailors along five axes, driven by the system prompt (which receives the persona plus the full public content) and the model's tool calls:

1. **Role assignment.** When the visitor only describes themselves, the model classifies the free text into a role family, which sets the tint and tailoring defaults.
2. **Ordering.** Most relevant items first (lead-and-highlight in overviews and the opening).
3. **Emphasis.** Relevant skills and bullets render in primary color; others recede. Components accept an optional emphasis list passed by the model.
4. **Gating.** Each content entry carries relevance metadata (audience tags, featured versus gated). Gated entries surface only when the persona or question makes them relevant. The model decides relevance; the tool layer enforces that only public, allowed entries can ever return.
5. **Suggested directions.** The model proposes the next 2 to 3 directions each turn.

## 7. Content model and source of truth

### 7.1 Approach

Typed TypeScript modules validated by Zod, not a CMS or MDX. Each module is `import 'server-only'` so accidental client import fails the build.

```
content/projects.ts      — const projects = [...] satisfies Project[]
content/skills.ts
content/experience.ts
content/education.ts
content/profile.ts        — identity, contact, career goals, voice rules
```

### 7.2 Source documents

- `resume.md` is current and is the definitive source for education, experience, and skills.
- `supplamental_context.md` is currently empty and will be **rebuilt** (Section 7.5) as the source of truth for project portfolio detail, career goals, FAQ answers, fun facts, and voice rules.
- Project sites are sanctioned sources, used once at authoring time to ground descriptions (not fetched live, except Serenity's now-playing and stream).
- `axiominfo.md` is the Axiom architecture document and the basis for Axiom's featured write-up.

### 7.3 Public / private boundary (structural)

A single choke point strips private fields. A public schema is derived by omitting private keys (for example `privateNotes`), and `.parse()` on that schema narrows the type. Everything downstream consumes the public type only:

- `buildContext(projects: PublicProject[]): string` derives the model's system-prompt context. Passing a raw entry is a compile error, so private data cannot reach the model.
- Tool `execute()` returns public objects, which become component props.
- Client components receive public objects only; private values never ship in the JS bundle.

A unit test asserts the public projection contains no private key. A build-time check asserts no known-private value appears in the client bundle. Serenity's cost trick (context-management) lives in `privateNotes` only.

### 7.4 Per-entry metadata

Each entry carries: stable id, display fields, `featured | gated`, `audienceTags` (for example aerospace, ai, security), optional `liveSource` (Serenity), and `privateNotes` (never public).

### 7.5 supplamental_context.md rebuild (early deliverable)

Rebuild the file as a clean, current source of truth:

- **Axiom is featured** and takes the large majority of project content, distilled from `axiominfo.md`. Keep the substance (budget-aware orchestration, the trusted-engine-versus-untrusted-planes model, disposable "Meeseeks" workers, orchestrator to sub-orchestrators to workers, the cost-minimization thesis). **Remove all development-status, phase, and ECO scaffolding** and anything about where it sits in development; none of that is relevant to the model or the visitor. Axiom is written in Go.
- **SSTPA Tool and Satellite Simulator stay gated**, so their descriptions are **trimmed to short summaries** to save space.
- **OpenClaw is removed** entirely.
- **Vox** is described as a macOS local speech-to-text (dictation) app: $5 one-time, on-device Whisper and Parakeet models, system-wide hotkey, file transcription, fully offline after model download. (Confirm the prior "text-to-speech" label is dropped.)
- **Serenity Radio** is described as an LLM-hosted 24/7 AI radio station with live now-playing, on-site streaming, and a listener messaging system.
- Career goals, FAQ answers, and fun facts are carried over and updated to match resume.md.

### 7.6 Project roster and meta

Featured (2026 flagships):
- Serenity Radio — underclassradio.com (live now-playing and on-site streaming)
- Axiom — agentaxiom.space — `go · 2026`
- Vox — voxtts.space (macOS speech-to-text)

Gated (surfaced for aerospace or security visitors):
- SSTPA Tool — `python · 2025`
- Satellite Simulator — C++ orbital mechanics

Open content item: confirm the exact `tech · year` meta strings for Vox, Serenity, SSTPA, and Satellite Simulator during the build.

## 8. Technical architecture

### 8.1 Stack

Next.js (App Router) on Vercel. AI SDK for generative UI (UI streaming, not RSC). Zod for validation. Self-hosted Inter and JetBrains Mono. Exact versions pinned at scaffold.

### 8.2 Generative-UI mechanism

- A route handler streams the model with a tools object and a step limit, then returns a UI message stream so the model can emit a closing text answer after a tool returns.
- **Tools are components.** One tool (description, input schema, execute) per renderable component (showProject, showProjects, showSerenity, showSkills, showExperience, showEducation, showContact, suggestDirections, and a bounded diagram tool). `execute` returns validated public data plus an optional emphasis list; that return value is the component's props. A single tools object bounds what the model can summon.
- The client renders message parts, switching on the tool part type and state (input states show the composing skeleton, output-available shows the component, output-error shows a graceful fallback). Tool output is re-validated with the public Zod schema at the render boundary before being spread as props.

### 8.3 Model and reliability

Default `moonshotai/kimi-k2.6` via OpenRouter (chosen for cost, in keeping with Ethan's cost-minimization focus). Fallback chain on tool-call failure: Claude, then Gemini. Because a failed tool call is a visibly broken "wow" moment, defensive handling is required: validate tool JSON, detect tool intent leaking into text, retry or repair, and pin or exclude unreliable upstream providers. Keep the stable system prompt and tool schemas at the front of the message array for cache hits. `max_tokens` is set on every request (see Section 9).

### 8.4 Serenity live proxy

Server-side routes proxy both the now-playing JSON and the audio stream from the Serenity backend (the station restricts cross-origin access). Now-playing uses a short cache (roughly 15 to 20s). The audio player streams through the proxy. If the station is down, the component degrades to static project info. The exact upstream now-playing endpoint and stream URL are resolved at build.

### 8.5 Markdown and diagram rendering

A sanitized GFM Markdown renderer in the transcript, styled refined-quiet. Diagrams (Mermaid-style or simple bespoke charts) are lazy-loaded and sanitized, and are off the critical render path.

## 9. Abuse and cost protection (deferred, seamed)

Protection is deferred so it does not slow local testing, but the architecture is built so it drops in via env config rather than a refactor.

1. **Interfaces with safe defaults.** Define a `RateLimiter` and a `HumanVerifier` interface. Ship no-op or in-memory implementations now. Wire Redis (rate limiting) and Turnstile (verification) implementations later, selected by env flags.
2. **Always-on cheap guards.** `max_tokens` is set explicitly on every model request (omitting it risks large overcharges). Input length and messages-per-session caps are enforced now. These require no external services.
3. **Injection and leak defense.** Private context never enters the model (Section 7.3). Treat the system prompt as public. Enumerated refusal rules, delimiter-wrapped user input, capped input length.

When deploying to triskaspace.com, switch the env flags to enable the Redis and Turnstile implementations. Redis becomes the source of truth for counters.

## 10. Page structure

Single centered narrow column at all widths, with components allowed to widen modestly.

1. Fixed header: wordmark `ethan triska` only.
2. Entry (staged) to authored opening to liberation (transcript plus persistent input plus adaptive suggested directions).
3. Footer: single `mailto:ethan@triska.space`.

## 11. Risks and open items

- AI SDK and OpenRouter version churn: pin exact versions, verify API names against the installed version.
- Kimi tool-calling is provider-dependent: test with real routing, keep the fallback wired and tested.
- `max_tokens` budget trap: make it non-optional in the request builder, with a test that fails if missing.
- Private-field leakage via two paths (model and bundle): enforce the public choke point plus `server-only`, regression-check the bundle.
- Untrusted tool output as props: re-validate at the render boundary.
- Serenity audio: confirm the upstream stream URL and licensing or attribution requirements for on-site playback; handle autoplay policies (require a user gesture to start).
- Compose motion at scale: ensure long sequences stay smooth and respect reduced-motion.
- Open content items: exact `tech · year` meta strings; final bound on "small graphics."

## 12. Out of scope (YAGNI)

Accounts and auth, conversation persistence or history, multi-language, light mode, a traditional browsable portfolio, analytics dashboards, a CMS. None are built unless a later need is proven.

## 13. Success criteria

- A visitor declares a persona (chip or free text) and, within the authored opening, sees tailored, accurate components compose into being.
- The resting page reads as deliberate, quiet minimalism; components produce a clear "wow" on first compose.
- A free-text-only visitor is always assigned a sensible role family.
- Serenity's component shows the true current track and lets the visitor play the live station on-site, degrading gracefully when the station is down.
- Editing one content file updates both the AI's answers and the on-page component; no private note can reach the model or the browser.
- The site runs locally with no Redis and no Turnstile, and protection can be enabled later by flipping env flags.
- A public visitor cannot run up a meaningful model bill (max_tokens plus input caps on by default).
