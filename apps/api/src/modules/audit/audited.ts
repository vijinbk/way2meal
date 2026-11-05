import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from './audit.service';

export interface AuditedChange<T> {
  entityId: string;
  before?: unknown;
  after: T;
}

/** Runs a write and its audit-log entry in one transaction. */
export function audited<T>(
  prisma: PrismaService,
  audit: AuditService,
  meta: { actorId: string; action: string; entity: string },
  change: (tx: Prisma.TransactionClient) => Promise<AuditedChange<T>>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const { entityId, before, after } = await change(tx);
    await audit.record({ ...meta, entityId, before, after }, tx);
    return after;
  });
}
