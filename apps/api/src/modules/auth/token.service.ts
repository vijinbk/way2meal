import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AuthTokens } from '@way2meal/shared';
import { createHash, randomBytes } from 'node:crypto';
import { Clock } from '../../common/clock/clock';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfig } from '../../config/env';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** Short-lived JWT access tokens + rotating, revocable opaque refresh tokens. */
@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly clock: Clock,
  ) {}

  async issue(user: { id: string; role: Role }): Promise<AuthTokens> {
    const now = this.clock.now();
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(
      now.getTime() + this.config.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: refreshExpiresAt,
        createdAt: now,
      },
    });
    return {
      ...this.signAccess(user, now),
      refreshToken,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
    };
  }

  /**
   * Exchanges a refresh token for a new pair. Presenting an already-rotated
   * token is treated as theft: every session for that user is revoked.
   */
  async rotate(refreshToken: string): Promise<AuthTokens> {
    const now = this.clock.now();
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: { select: { id: true, role: true, deletedAt: true } } },
    });
    if (!existing) throw new UnauthorizedException('Invalid refresh token');

    if (existing.revokedAt) {
      await this.revokeAllForUser(existing.userId, now);
      throw new UnauthorizedException('Refresh token already used; please log in again');
    }
    if (existing.expiresAt <= now || existing.user.deletedAt) {
      throw new UnauthorizedException('Refresh token expired; please log in again');
    }

    const nextToken = randomBytes(32).toString('base64url');
    const nextExpiresAt = new Date(
      now.getTime() + this.config.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
    );
    await this.prisma.$transaction(async (tx) => {
      const next = await tx.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: sha256(nextToken),
          expiresAt: nextExpiresAt,
          createdAt: now,
        },
      });
      // Conditional update: a concurrent rotation of the same token loses the race.
      const { count } = await tx.refreshToken.updateMany({
        where: { id: existing.id, revokedAt: null },
        data: { revokedAt: now, replacedById: next.id },
      });
      if (count === 0)
        throw new UnauthorizedException('Refresh token already used; please log in again');
    });

    return {
      ...this.signAccess(existing.user, now),
      refreshToken: nextToken,
      refreshTokenExpiresAt: nextExpiresAt.toISOString(),
    };
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: this.clock.now() },
    });
  }

  private async revokeAllForUser(userId: string, now: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  private signAccess(user: { id: string; role: Role }, now: Date) {
    const iat = Math.floor(now.getTime() / 1000);
    const exp = iat + this.config.env.JWT_ACCESS_TTL_SECONDS;
    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role, iat, exp },
      { secret: this.config.env.JWT_ACCESS_SECRET, algorithm: 'HS256' },
    );
    return { accessToken, accessTokenExpiresAt: new Date(exp * 1000).toISOString() };
  }
}
