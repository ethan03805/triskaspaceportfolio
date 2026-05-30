import { describe, it, expect } from "vitest";
import type { InferToolOutput } from "ai";
import { buildTools, type Tools } from "./tools";

describe("showProject tool", () => {
  it("returns a public project by id and never leaks private notes", async () => {
    const tools = buildTools();
    const out = (await tools.showProject.execute!(
      { id: "serenity", emphasis: [] },
      { toolCallId: "t", messages: [] } as never
    )) as InferToolOutput<Tools["showProject"]>;
    expect(out.project.name).toBe("Serenity Radio");
    expect(JSON.stringify(out)).not.toContain("Cost trick");
  });
  it("rejects an unknown id", async () => {
    const tools = buildTools();
    await expect(
      tools.showProject.execute!({ id: "nope", emphasis: [] }, { toolCallId: "t", messages: [] } as never)
    ).rejects.toThrow();
  });
});

describe("showProjects tool", () => {
  it("leads with the requested project and excludes it from the rows", async () => {
    const tools = buildTools();
    const out = (await tools.showProjects.execute!(
      { lead: "axiom", includeGated: false, emphasis: [] },
      { toolCallId: "t", messages: [] } as never,
    )) as InferToolOutput<Tools["showProjects"]>;
    expect(out.lead.id).toBe("axiom");
    expect(out.others.map((p: { id: string }) => p.id)).not.toContain("axiom");
    expect(out.others.every((p: { status: string }) => p.status === "featured")).toBe(true);
  });
  it("hides gated projects unless includeGated is true", async () => {
    const tools = buildTools();
    const hidden = (await tools.showProjects.execute!(
      { includeGated: false, emphasis: [] },
      { toolCallId: "t", messages: [] } as never,
    )) as InferToolOutput<Tools["showProjects"]>;
    expect(hidden.gated).toHaveLength(0);
    const shown = (await tools.showProjects.execute!(
      { includeGated: true, emphasis: [] },
      { toolCallId: "t", messages: [] } as never,
    )) as InferToolOutput<Tools["showProjects"]>;
    expect(shown.gated.map((p: { id: string }) => p.id)).toEqual(
      expect.arrayContaining(["sstpa", "satellite"]),
    );
  });
  it("never leaks private notes", async () => {
    const tools = buildTools();
    const out = (await tools.showProjects.execute!(
      { includeGated: true, emphasis: [] },
      { toolCallId: "t", messages: [] } as never,
    )) as InferToolOutput<Tools["showProjects"]>;
    expect(JSON.stringify(out)).not.toContain("Cost trick");
  });
});

describe("showSkills tool", () => {
  it("returns all skill groups and passes emphasis through", async () => {
    const tools = buildTools();
    const out = (await tools.showSkills.execute!(
      { emphasis: ["ai"] },
      { toolCallId: "t", messages: [] } as never,
    )) as InferToolOutput<Tools["showSkills"]>;
    expect(out.groups.map((g) => g.id)).toContain("ai-ml");
    expect(out.emphasis).toEqual(["ai"]);
  });
});

describe("showExperience tool", () => {
  it("returns experience entries and passes emphasis through", async () => {
    const tools = buildTools();
    const out = (await tools.showExperience.execute!(
      { emphasis: ["aerospace"] },
      { toolCallId: "t", messages: [] },
    )) as InferToolOutput<Tools["showExperience"]>;
    expect(out.entries.map((e) => e.id)).toContain("ng");
    expect(out.emphasis).toEqual(["aerospace"]);
  });
});

describe("showEducation tool", () => {
  it("returns education entries", async () => {
    const tools = buildTools();
    const out = (await tools.showEducation.execute!(
      {},
      { toolCallId: "t", messages: [] },
    )) as InferToolOutput<Tools["showEducation"]>;
    expect(out.entries.map((e) => e.school)).toContain("DePaul University");
  });
});

describe("showContact tool", () => {
  it("returns email, resume url, and project links", async () => {
    const tools = buildTools();
    const out = (await tools.showContact.execute!(
      {},
      { toolCallId: "t", messages: [] },
    )) as InferToolOutput<Tools["showContact"]>;
    expect(out.email).toBe("ethan@triska.space");
    expect(out.resumeUrl).toBe("/ethan-triska-resume.pdf");
    expect(out.links.map((l) => l.label)).toContain("Axiom");
  });
});
