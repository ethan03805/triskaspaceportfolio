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
