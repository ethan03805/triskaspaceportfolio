import { describe, it, expect } from "vitest";
import { InMemoryRateLimiter } from "./rate-limiter";
import { AlwaysPassVerifier } from "./verifier";

describe("protection defaults", () => {
  it("in-memory limiter blocks after the cap", async () => {
    const rl = new InMemoryRateLimiter({ max: 2, windowMs: 60_000 });
    expect((await rl.check("ip1")).ok).toBe(true);
    expect((await rl.check("ip1")).ok).toBe(true);
    expect((await rl.check("ip1")).ok).toBe(false);
    expect((await rl.check("ip2")).ok).toBe(true);
  });
  it("always-pass verifier passes", async () => {
    expect((await new AlwaysPassVerifier().verify("anything")).ok).toBe(true);
  });
});
