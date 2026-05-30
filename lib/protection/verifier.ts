export type VerifyResult = { ok: boolean };
export interface HumanVerifier { verify(token: string): Promise<VerifyResult>; }

export class AlwaysPassVerifier implements HumanVerifier {
  async verify(_token: string): Promise<VerifyResult> { return { ok: true }; }
}
// Plan 6 adds TurnstileVerifier implementing HumanVerifier, selected by env flag.

/**
 * Returns the active human verifier.
 * Plan 6 adds: if (process.env.ENABLE_TURNSTILE === "true") return new TurnstileVerifier(...).
 * Until then this is inert (always passes) so the route gate is wired but never blocks dev.
 */
export function getVerifier(): HumanVerifier {
  return new AlwaysPassVerifier();
}
