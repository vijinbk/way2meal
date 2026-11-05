import { Test } from '@nestjs/testing';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { type PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { Clock, FixedClock } from '../../src/common/clock/clock';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { AppConfig, parseEnv } from '../../src/config/env';
import { OtpOutbox } from '../../src/modules/auth/otp/otp-outbox';

export interface TestApp {
  app: NestExpressApplication;
  prisma: PrismaService;
  clock: FixedClock;
  outbox: OtpOutbox;
  close(): Promise<void>;
}

/** Boots the real AppModule against the test database with a controllable clock. */
export async function createTestApp(
  opts: { now?: string; env?: Record<string, string> } = {},
): Promise<TestApp> {
  const clock = new FixedClock(opts.now ?? '2026-11-09T08:00:00+05:30');
  const config = new AppConfig(parseEnv({ ...process.env, ...opts.env }));
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(clock)
    .overrideProvider(AppConfig)
    .useValue(config)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app);
  await app.init();
  return {
    app,
    clock,
    prisma: app.get(PrismaService),
    outbox: app.get(OtpOutbox),
    close: () => app.close(),
  };
}

/** Empties every table (keeps the migration history). */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}
