import "server-only";
import { type Project } from "./schema";

export const projects: Project[] = [
  {
    id: "serenity",
    name: "Serenity Radio",
    tagline: "An LLM-hosted 24/7 internet radio station.",
    description:
      "Serenity Radio is an autonomous internet radio station with no human staff. A language model selects tracks from a curated library, schedules shows, and replies to listener messages in real time. Listeners can send short notes and hear the AI host respond on air.",
    tech: "typescript",
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
    tech: "go",
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
    tech: "python",
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
    tech: "c++",
    year: "2025",
    status: "gated",
    audienceTags: ["aerospace"],
  },
];
