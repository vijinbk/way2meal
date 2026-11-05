import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthTokens } from '@way2meal/shared';
import { Clock } from '../../common/clock/clock';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfig } from '../../config/env';
import {
  STATIC_CODE_PATTERN,
  generateOtpCode,
  hashOtp,
  otpMatches,
  staticCodeMatches,
} from './otp/otp-code';
import { OTP_PROVIDER, OtpProvider } from './otp/otp-provider';
import { TokenService } from './token.service';

export interface VerifyResult {
  tokens: AuthTokens;
  user: { id: string; phone: string; name: string | null; role: Role };
  /** True when this verify created the account. */
  isNewUser: boolean;
  /** False until onboarding has collected the customer's name. */
  profileComplete: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
  ) {}

  /** @param phone E.164, already normalised by the request schema. */
  async requestOtp(phone: string): Promise<{ expiresAt: string }> {
    const { env } = this.config;
    const now = this.clock.now();
    const code = this.newCode();
    const expiresAt = new Date(now.getTime() + env.OTP_TTL_SECONDS * 1000);

    await this.prisma.$transaction(async (tx) => {
      // Serialise requests per phone so concurrent calls can't slip past the limit.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'otp:' + phone}))`;
      const windowStart = new Date(now.getTime() - env.OTP_RATE_LIMIT_WINDOW_SECONDS * 1000);
      const recent = await tx.otpRequest.count({
        where: { phone, createdAt: { gt: windowStart } },
      });
      if (recent >= env.OTP_RATE_LIMIT_COUNT) {
        const minutes = Math.round(env.OTP_RATE_LIMIT_WINDOW_SECONDS / 60);
        throw new HttpException(
          `Too many OTP requests. You can request ${env.OTP_RATE_LIMIT_COUNT} codes every ${minutes} minutes.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      await tx.otpRequest.create({
        data: {
          phone,
          codeHash: hashOtp(env.OTP_HMAC_SECRET, phone, code),
          expiresAt,
          createdAt: now,
        },
      });
    });

    await this.otpProvider.send(phone, code);
    return { expiresAt: expiresAt.toISOString() };
  }

  async verifyOtp(phone: string, code: string): Promise<VerifyResult> {
    const { env } = this.config;
    const now = this.clock.now();

    const otp = await this.prisma.otpRequest.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.expiresAt <= now) {
      throw new UnauthorizedException('OTP expired or not found. Please request a new code.');
    }
    if (otp.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many incorrect attempts. Please request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const matches =
      otpMatches(env.OTP_HMAC_SECRET, phone, code, otp.codeHash) ||
      (await this.isAdminStaticCode(phone, code));
    if (!matches) {
      const updated = await this.prisma.otpRequest.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      const left = Math.max(0, env.OTP_MAX_ATTEMPTS - updated.attempts);
      throw new UnauthorizedException(
        `Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} left.`,
      );
    }

    // Consume exactly once even under concurrent verifies.
    const { count } = await this.prisma.otpRequest.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (count === 0)
      throw new UnauthorizedException('OTP already used. Please request a new code.');

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    const user = existing
      ? existing.deletedAt
        ? await this.prisma.user.update({ where: { id: existing.id }, data: { deletedAt: null } })
        : existing
      : await this.prisma.user.create({ data: { phone, role: Role.CUSTOMER, createdAt: now } });

    return {
      tokens: await this.tokens.issue(user),
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
      isNewUser: !existing,
      profileComplete: Boolean(user.name),
    };
  }

  refresh(refreshToken: string): Promise<AuthTokens> {
    return this.tokens.rotate(refreshToken);
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokens.revoke(refreshToken);
  }

  /**
   * Phase 1 admin bootstrap: the admin can't read their own code from the
   * admin panel before signing in, so ADMIN accounts may use a long static
   * code (hash in ADMIN_STATIC_OTP_HASH). Only with the mock provider — it
   * stops working once a real SMS provider is configured.
   */
  private async isAdminStaticCode(phone: string, code: string): Promise<boolean> {
    const { ADMIN_STATIC_OTP_HASH, OTP_PROVIDER } = this.config.env;
    if (!ADMIN_STATIC_OTP_HASH || OTP_PROVIDER !== 'mock' || !STATIC_CODE_PATTERN.test(code)) {
      return false;
    }
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: { role: true, deletedAt: true },
    });
    if (!user || user.role !== Role.ADMIN || user.deletedAt) return false;
    return staticCodeMatches(code, ADMIN_STATIC_OTP_HASH);
  }

  /** DEV_OTP (non-production only; env validation enforces this) makes local testing painless. */
  private newCode(): string {
    if (!this.config.isProduction && this.config.env.DEV_OTP) return this.config.env.DEV_OTP;
    return generateOtpCode();
  }
}
