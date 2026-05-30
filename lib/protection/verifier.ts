export type VerifyResult = { ok: boolean };
export interface HumanVerifier { verify(token: string): Promise<VerifyResult>; }

export class AlwaysPassVerifier implements HumanVerifier {
  async verify(_token: string): Promise<VerifyResult> { return { ok: true }; }
}
// Plan 6 adds TurnstileVerifier implementing HumanVerifier, selected by env flag.
