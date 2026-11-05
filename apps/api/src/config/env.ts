import { z } from 'zod';
import { STATIC_HASH_PATTERN } from '../modules/auth/otp/otp-code';

const bool = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1),

    JWT_ACCESS_SECRET: z.string().min(12),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    OTP_HMAC_SECRET: z.string().min(12),

    OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    OTP_RATE_LIMIT_COUNT: z.coerce.number().int().positive().default(3),
    OTP_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(600),
    AUTH_IP_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(30),
    DEV_OTP: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),

    /**
     * Phase 1 only (mock OTP): scrypt hash of an 8–12 digit code that ADMIN
     * accounts can enter instead of the sent code. Generate with
     * `pnpm --filter @way2meal/api admin:login-code`.
     */
    ADMIN_STATIC_OTP_HASH: z
      .string()
      .regex(STATIC_HASH_PATTERN, 'Expected the output of the admin:login-code script')
      .optional(),

    OTP_PROVIDER: z.enum(['mock']).default('mock'),
    PAYMENT_PROVIDER: z.enum(['manual']).default('manual'),

    SWAGGER_ENABLED: bool,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    if (env.DEV_OTP) {
      ctx.addIssue({
        code: 'custom',
        path: ['DEV_OTP'],
        message: 'DEV_OTP must not be set in production',
      });
    }
    for (const key of ['JWT_ACCESS_SECRET', 'OTP_HMAC_SECRET'] as const) {
      if (env[key].length < 32 || env[key].startsWith('change-me')) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} must be a random string of 32+ chars in production`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

/** Typed, validated configuration. Injected instead of reading process.env directly. */
export class AppConfig {
  constructor(readonly env: Env) {}

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }
}
