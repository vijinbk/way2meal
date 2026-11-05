import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

/** Six random digits. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * HMAC (keyed with a server secret) rather than a plain hash: a 6-digit space
 * is trivially brute-forced offline, so a leaked table must not reveal codes.
 */
export function hashOtp(secret: string, phone: string, code: string): string {
  return createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}

export function otpMatches(
  secret: string,
  phone: string,
  code: string,
  expectedHash: string,
): boolean {
  const actual = Buffer.from(hashOtp(secret, phone, code), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
