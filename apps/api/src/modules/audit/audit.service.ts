import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AuditEntry {
  actorId: string | null;
  /** e.g. "plan.update", "payment.approve", "subscription.grant-credit" */
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

type Db = PrismaService | Prisma.TransactionClient;

const toJson = (value: unknown) =>
  value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);

/** Records every admin change to menus, prices, credits and payments. Pass `tx` to log atomically with the change. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, tx: Db = this.prisma): Promise<void> {
    await tx.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: toJson(entry.before),
        after: toJson(entry.after),
      },
    });
  }
}
