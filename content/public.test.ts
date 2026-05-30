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
