import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

declare global {
  var __PG_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

/** Starts a throwaway Postgres 16, applies migrations, and exposes it to test workers via env. */
export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  globalThis.__PG_CONTAINER__ = container;

  const env: Record<string, string> = {
    NODE_ENV: 'test',
    DATABASE_URL: container.getConnectionUri(),
    JWT_ACCESS_SECRET: 'test-access-secret-0123456789',
    OTP_HMAC_SECRET: 'test-otp-secret-0123456789',
    AUTH_IP_RATE_LIMIT_PER_MINUTE: '10000',
  };
  Object.assign(process.env, env);
  delete process.env.DEV_OTP;

  execFileSync(
    path.join(__dirname, '../../node_modules/.bin/prisma'),
    ['migrate', 'deploy', '--schema', path.join(__dirname, '../../prisma/schema.prisma')],
    { env: { ...process.env, ...env }, stdio: 'pipe' },
  );
}
