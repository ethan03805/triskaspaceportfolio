import { describe, it, expect } from "vitest";
import { sanitizeSchema } from "./sanitize-schema";

describe("sanitizeSchema", () => {
  it("allows GFM table and code elements", () => {
    const tags = sanitizeSchema.tagNames ?? [];
    for (const t of ["table", "thead", "tbody", "tr", "th", "td", "code", "pre", "blockquote", "a"]) {
      expect(tags).toContain(t);
    }
  });
  it("disallows raw images and scripts", () => {
    const tags = sanitizeSchema.tagNames ?? [];
    expect(tags).not.toContain("img");
    expect(tags).not.toContain("script");
    expect(tags).not.toContain("iframe");
  });
});
