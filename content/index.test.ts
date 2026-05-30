import { describe, it, expect } from "vitest";
import { getPublicProjects, getFeaturedPublicProjects } from "./index";

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
