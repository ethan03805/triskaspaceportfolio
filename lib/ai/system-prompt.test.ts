import { describe, it, expect } from "vitest";
import { composeSystemPrompt } from "./system-prompt";

describe("composeSystemPrompt", () => {
  it("embeds persona and public context, never private notes", () => {
    const sp = composeSystemPrompt({ role: "recruiter", text: "recruiter at SpaceX" });
    expect(sp).toContain("recruiter");
    expect(sp).toContain("recruiter at SpaceX");
    expect(sp).toContain("Serenity Radio");
    expect(sp).not.toContain("Cost trick");
  });

  it("teaches the full tool vocabulary and the gating rule", () => {
    const sp = composeSystemPrompt({ role: "engineer", text: null });
    expect(sp).toContain("showProjects");
    expect(sp).toContain("showSkills");
    expect(sp).toContain("showExperience");
    expect(sp).toContain("showEducation");
    expect(sp).toContain("showContact");
    expect(sp).toContain("suggestDirections");
    expect(sp).toMatch(/aerospace|security/i);
    expect(sp).not.toContain("Cost trick");
  });
});
