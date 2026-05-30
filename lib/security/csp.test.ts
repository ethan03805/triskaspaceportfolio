import { describe, it, expect } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./csp";

describe("contentSecurityPolicy", () => {
  it("allows the Serenity stream as a media source", () => {
    expect(contentSecurityPolicy()).toContain("media-src 'self' https://stream.underclassradio.com");
  });
  it("keeps connect and font same-origin", () => {
    const csp = contentSecurityPolicy();
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("font-src 'self'");
  });
  it("is strict in production (no unsafe-eval)", () => {
    expect(contentSecurityPolicy({ dev: false })).not.toContain("'unsafe-eval'");
  });
  it("permits unsafe-eval in development so next dev works", () => {
    expect(contentSecurityPolicy({ dev: true })).toContain("'unsafe-eval'");
  });
});

describe("securityHeaders", () => {
  it("includes CSP plus standard hardening headers", () => {
    const keys = securityHeaders().map((h) => h.key);
    expect(keys).toContain("Content-Security-Policy");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("X-Content-Type-Options");
  });
});
