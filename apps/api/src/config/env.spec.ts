import { hashStaticCode } from '../modules/auth/otp/otp-code';
import { parseEnv } from './env';

const base = {
  DATABASE_URL: 'postgresql://localhost/db',
  JWT_ACCESS_SECRET: 'dev-access-secret',
  OTP_HMAC_SECRET: 'dev-otp-secret-x',
};
const strong = 'a'.repeat(40);

describe('parseEnv', () => {
  it('applies policy defaults from the requirements', () => {
    const env = parseEnv(base);
    expect(env).toMatchObject({
      NODE_ENV: 'development',
      JWT_ACCESS_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
      OTP_RATE_LIMIT_COUNT: 3,
      OTP_RATE_LIMIT_WINDOW_SECONDS: 600,
      OTP_PROVIDER: 'mock',
      PAYMENT_PROVIDER: 'manual',
    });
  });

  it('refuses DEV_OTP in production', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: strong,
        OTP_HMAC_SECRET: strong,
        DEV_OTP: '123456',
      }),
    ).toThrow(/DEV_OTP must not be set in production/);
  });

  it('refuses weak secrets in production', () => {
    expect(() => parseEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      /JWT_ACCESS_SECRET must be a random string/,
    );
    expect(
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: strong,
        OTP_HMAC_SECRET: strong,
      }).NODE_ENV,
    ).toBe('production');
  });

  it('only knows the Phase 1 providers', () => {
    expect(() => parseEnv({ ...base, PAYMENT_PROVIDER: 'razorpay' })).toThrow(/PAYMENT_PROVIDER/);
    expect(() => parseEnv({ ...base, OTP_PROVIDER: 'msg91' })).toThrow(/OTP_PROVIDER/);
  });
});

describe('ADMIN_STATIC_OTP_HASH', () => {
  it('accepts a generated hash, also in production', () => {
    const hash = hashStaticCode('4815162342');
    expect(parseEnv({ ...base, ADMIN_STATIC_OTP_HASH: hash }).ADMIN_STATIC_OTP_HASH).toBe(hash);
    expect(
      parseEnv({
        ...base,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: strong,
        OTP_HMAC_SECRET: strong,
        ADMIN_STATIC_OTP_HASH: hash,
      }).ADMIN_STATIC_OTP_HASH,
    ).toBe(hash);
  });

  it('rejects a plain code pasted in by mistake', () => {
    expect(() => parseEnv({ ...base, ADMIN_STATIC_OTP_HASH: '4815162342' })).toThrow(
      /admin:login-code/,
    );
  });
});
