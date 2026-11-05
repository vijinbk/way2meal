import { generateOtpCode, hashOtp, otpMatches } from './otp-code';

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
