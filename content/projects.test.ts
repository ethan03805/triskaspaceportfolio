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
  it("lists Serenity Radio's tech as python", () => {
    const serenity = projects.find((p) => p.id === "serenity");
    expect(serenity?.tech).toBe("python");
  });
  it("keeps Serenity's year at 2026", () => {
    const serenity = projects.find((p) => p.id === "serenity");
    expect(serenity?.year).toBe("2026");
  });
});
