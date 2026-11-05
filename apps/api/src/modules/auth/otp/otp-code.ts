import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

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

// ── Admin login code (Phase 1 only) ──
// The mock OTP provider shows codes on the admin panel, which the admin can't
// open before signing in. ADMIN accounts may instead enter a long static code
// whose scrypt hash lives in ADMIN_STATIC_OTP_HASH. It still goes through the
// normal OTP request (rate limit, attempts, expiry).

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 32;
export const STATIC_HASH_PATTERN = /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/;
/** 8–12 digits: long enough that the per-phone rate limit makes guessing hopeless. */
export const STATIC_CODE_PATTERN = /^\d{8,12}$/;

export function hashStaticCode(code: string): string {
  if (!STATIC_CODE_PATTERN.test(code)) throw new Error('Admin login code must be 8–12 digits');
  const salt = randomBytes(16);
  const key = scryptSync(code, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return ['scrypt', salt.toString('hex'), key.toString('hex')].join('$');
}

export function staticCodeMatches(code: string, stored: string): boolean {
  if (!STATIC_CODE_PATTERN.test(code) || !STATIC_HASH_PATTERN.test(stored)) return false;
  const [, saltHex, keyHex] = stored.split('$');
  const expected = Buffer.from(keyHex!, 'hex');
  const actual = scryptSync(code, Buffer.from(saltHex!, 'hex'), KEY_LENGTH, SCRYPT_PARAMS);
  return timingSafeEqual(actual, expected);
}
