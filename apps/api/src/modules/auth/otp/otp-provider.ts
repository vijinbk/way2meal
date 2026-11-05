/**
 * Delivers an OTP to a phone. Phase 1 ships MockOtpProvider only; Phase 2 adds
 * a real SMS provider (MSG91/Twilio with a DLT template) behind this interface.
 * Code generation, hashing, expiry and rate limits live in AuthService, never here.
 */
export interface OtpProvider {
  send(phone: string, code: string): Promise<void>;
}

export const OTP_PROVIDER = Symbol('OTP_PROVIDER');
