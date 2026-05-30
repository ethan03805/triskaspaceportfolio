import { describe, it, expect } from "vitest";
import { classifyPersona, TINTS } from "./persona";

describe("classifyPersona", () => {
  it("routes by keyword", () => {
    expect(classifyPersona("recruiter at a space company")).toBe("recruiter");
    expect(classifyPersona("senior software engineer")).toBe("engineer");
    expect(classifyPersona("founder of a startup")).toBe("founder");
    expect(classifyPersona("just an old friend of Ethan")).toBe("friend");
  });
  it("falls back to curious", () => {
    expect(classifyPersona("hello there")).toBe("curious");
  });
  it("has a tint per role", () => {
    expect(TINTS.engineer).toMatch(/^#/);
  });
});
