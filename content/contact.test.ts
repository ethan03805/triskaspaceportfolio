import { describe, it, expect } from "vitest";
import { RESUME_URL, publicContactSchema } from "./contact";

describe("contact module", () => {
  it("exposes a resume URL pointing at a static asset", () => {
    expect(RESUME_URL).toBe("/ethan-triska-resume.pdf");
  });
  it("validates a contact object", () => {
    const ok = publicContactSchema.parse({
      email: "ethan@triska.space",
      resumeUrl: RESUME_URL,
      links: [{ label: "Axiom", url: "https://agentaxiom.space" }],
    });
    expect(ok.links[0].label).toBe("Axiom");
  });
});
