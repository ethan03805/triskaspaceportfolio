import { describe, it, expect } from "vitest";
import {
  getPublicProjects,
  getFeaturedPublicProjects,
  getPublicSkills,
  getPublicExperience,
  getPublicEducation,
  getPublicContact,
} from "./index";

describe("public selectors", () => {
  it("never expose privateNotes", () => {
    const all = JSON.stringify(getPublicProjects());
    expect(all).not.toContain("Cost trick");
    expect(all).not.toContain("privateNotes");
  });
  it("featured selector returns only featured", () => {
    expect(getFeaturedPublicProjects().every((p) => p.status === "featured")).toBe(true);
  });
});

describe("non-project public selectors", () => {
  it("returns validated skills, experience, education", () => {
    expect(getPublicSkills().map((s) => s.id)).toContain("ai-ml");
    expect(getPublicExperience().map((e) => e.org)).toContain("Northrop Grumman Space Systems");
    expect(getPublicEducation().map((e) => e.school)).toContain("DePaul University");
  });
  it("builds a contact object from profile + public project links + resume", () => {
    const c = getPublicContact();
    expect(c.email).toBe("ethan@triska.space");
    expect(c.resumeUrl).toBe("/ethan-triska-resume.pdf");
    expect(c.links.map((l) => l.label)).toContain("Axiom");
    // every link has an absolute url; gated projects without urls do not crash it
    for (const l of c.links) expect(l.url).toMatch(/^https?:\/\//);
  });
  it("never leaks private notes through the new selectors", () => {
    const blob = JSON.stringify([
      getPublicSkills(), getPublicExperience(), getPublicEducation(), getPublicContact(),
    ]);
    expect(blob).not.toContain("Cost trick");
    expect(blob).not.toContain("privateNotes");
  });
});
