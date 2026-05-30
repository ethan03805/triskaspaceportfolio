export type RateResult = { ok: boolean; retryAfterMs?: number };
export interface RateLimiter { check(key: string): Promise<RateResult>; }

export class NoOpRateLimiter implements RateLimiter {
  async check(): Promise<RateResult> { return { ok: true }; }
}

export class InMemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private cfg: { max: number; windowMs: number }) {}
  async check(key: string): Promise<RateResult> {
    const now = Date.now();
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.cfg.windowMs);
    if (arr.length >= this.cfg.max) {
      return { ok: false, retryAfterMs: this.cfg.windowMs - (now - arr[0]) };
    }
    arr.push(now);
    this.hits.set(key, arr);
    return { ok: true };
  }
}
// Plan 6 adds RedisRateLimiter implementing RateLimiter, selected by env flag.
