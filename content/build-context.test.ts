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
