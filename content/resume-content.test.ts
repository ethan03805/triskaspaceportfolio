import { describe, it, expect } from "vitest";
import { skills } from "./skills";
import { experience } from "./experience";
import { education } from "./education";
import { profile } from "./profile";
import { skillGroupSchema, experienceSchema, educationSchema, profileSchema } from "./schema";

describe("resume-derived content", () => {
  it("validates", () => {
    skills.forEach((s) => expect(() => skillGroupSchema.parse(s)).not.toThrow());
    experience.forEach((e) => expect(() => experienceSchema.parse(e)).not.toThrow());
    education.forEach((e) => expect(() => educationSchema.parse(e)).not.toThrow());
    expect(() => profileSchema.parse(profile)).not.toThrow();
  });
  it("includes Northrop Grumman and DePaul", () => {
    expect(experience.map((e) => e.org)).toContain("Northrop Grumman Space Systems");
    expect(education.map((e) => e.school)).toContain("DePaul University");
  });
  it("profile email is ethan@triska.space", () => {
    expect(profile.email).toBe("ethan@triska.space");
  });
});
