import {
  STATIC_HASH_PATTERN,
  generateOtpCode,
  hashOtp,
  hashStaticCode,
  otpMatches,
  staticCodeMatches,
} from './otp-code';

describe('otp-code', () => {
  it('generates 6-digit codes', () => {
    for (let i = 0; i < 200; i++) expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });

  it('hashes are keyed by secret and phone', () => {
    const h = hashOtp('secret', '+919876543210', '123456');
    expect(h).not.toBe(hashOtp('other', '+919876543210', '123456'));
    expect(h).not.toBe(hashOtp('secret', '+919800000000', '123456'));
    expect(otpMatches('secret', '+919876543210', '123456', h)).toBe(true);
    expect(otpMatches('secret', '+919876543210', '654321', h)).toBe(false);
  });
});

describe('admin login code', () => {
  it('hashes with a random salt and verifies only the right code', () => {
    const a = hashStaticCode('4815162342');
    const b = hashStaticCode('4815162342');
    expect(a).toMatch(STATIC_HASH_PATTERN);
    expect(a).not.toBe(b);
    expect(a).not.toContain('4815162342');
    expect(staticCodeMatches('4815162342', a)).toBe(true);
    expect(staticCodeMatches('4815162343', a)).toBe(false);
  });

  it('refuses short codes and malformed hashes', () => {
    expect(() => hashStaticCode('123456')).toThrow(/8–12 digits/);
    expect(staticCodeMatches('123456', hashStaticCode('12345678'))).toBe(false);
    expect(staticCodeMatches('12345678', 'not-a-hash')).toBe(false);
  });
});
