import { describe, it, expect } from "vitest";
import { repairShowProjectArgs } from "./repair";

describe("repairShowProjectArgs", () => {
  it("parses a JSON string of args", () => {
    expect(repairShowProjectArgs('{"id":"serenity"}')).toEqual({ id: "serenity", emphasis: [] });
  });
  it("maps alternate id keys (project/projectId/name)", () => {
    expect(repairShowProjectArgs({ project: "axiom" })).toEqual({ id: "axiom", emphasis: [] });
    expect(repairShowProjectArgs({ projectId: "vox" })).toEqual({ id: "vox", emphasis: [] });
  });
  it("keeps a valid object and string-filters emphasis", () => {
    expect(repairShowProjectArgs({ id: "vox", emphasis: ["live", 3] as unknown as string[] }))
      .toEqual({ id: "vox", emphasis: ["live"] });
  });
  it("treats a bare string as the id", () => {
    expect(repairShowProjectArgs("serenity")).toEqual({ id: "serenity", emphasis: [] });
  });
  it("returns null for unrepairable input", () => {
    expect(repairShowProjectArgs({ foo: "bar" })).toBeNull();
    expect(repairShowProjectArgs(42)).toBeNull();
    expect(repairShowProjectArgs("")).toBeNull();
  });
});
