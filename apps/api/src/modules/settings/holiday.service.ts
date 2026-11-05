import { ConflictException, Injectable } from '@nestjs/common';
import { HolidayInput, IsoDate, dbDateToIsoDate, isoDateToDbDate } from '@way2meal/shared';
import { assertRange } from '../../common/http/range';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { audited } from '../audit/audited';

const toDto = <T extends { date: Date }>(h: T) => ({ ...h, date: dbDateToIsoDate(h.date) });

/**
 * Admin-declared closures. M3 hooks rescheduling in here: adding a holiday
 * moves affected subscription deliveries to the end of their plans.
 */
@Injectable()
export class HolidayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(from: IsoDate, to: IsoDate) {
    assertRange(from, to, 366);
    const rows = await this.prisma.holiday.findMany({
      where: { date: { gte: isoDateToDbDate(from), lte: isoDateToDbDate(to) } },
      orderBy: { date: 'asc' },
    });
    return rows.map(toDto);
  }

  async create(input: HolidayInput, actorId: string) {
    const date = isoDateToDbDate(input.date);
    const row = await audited(
      this.prisma,
      this.audit,
      { actorId, action: 'holiday.create', entity: 'Holiday' },
      async (tx) => {
        // A whole-day holiday overlaps every slot; a slot holiday overlaps whole-day ones.
        const clash = await tx.holiday.findFirst({
          where: { date, ...(input.slot ? { OR: [{ slot: null }, { slot: input.slot }] } : {}) },
        });
        if (clash) {
          throw new ConflictException(
            `${input.date} is already a holiday${clash.slot ? ` for ${clash.slot.toLowerCase()}` : ''}: ${clash.reason}`,
          );
        }
        const after = await tx.holiday.create({
          data: { date, slot: input.slot, reason: input.reason },
        });
        return { entityId: after.id, after };
      },
    );
    return toDto(row);
  }

  async remove(id: string, actorId: string): Promise<void> {
    await audited(
      this.prisma,
      this.audit,
      { actorId, action: 'holiday.delete', entity: 'Holiday' },
      async (tx) => {
        const before = await tx.holiday.findUniqueOrThrow({ where: { id } });
        await tx.holiday.delete({ where: { id } });
        return { entityId: id, before, after: null };
      },
    );
  }
}
