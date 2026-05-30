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
