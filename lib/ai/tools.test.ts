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
