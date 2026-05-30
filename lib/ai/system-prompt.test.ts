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
});
