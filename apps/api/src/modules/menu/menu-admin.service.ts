import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Slot } from '@prisma/client';
import {
  IsoDate,
  MenuItemInput,
  MenuOverrideInput,
  MenuTemplateInput,
  dbDateToIsoDate,
  isoDateToDbDate,
} from '@way2meal/shared';
import { assertRange } from '../../common/http/range';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { audited } from '../audit/audited';

const itemsInclude = {
  items: { orderBy: { sortOrder: 'asc' }, include: { menuItem: true } },
} satisfies Prisma.MenuTemplateInclude;

/** Admin editing of menu items, weekday templates and date overrides. */
@Injectable()
export class MenuAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Menu items (deactivate, never delete: templates and history reference them) ──
  listItems() {
    return this.prisma.menuItem.findMany({ orderBy: { name: 'asc' } });
  }

  createItem(input: MenuItemInput, actorId: string) {
    return audited(
      this.prisma,
      this.audit,
      { actorId, action: 'menuItem.create', entity: 'MenuItem' },
      async (tx) => {
        const after = await tx.menuItem.create({ data: input });
        return { entityId: after.id, after };
      },
    );
  }

  updateItem(id: string, input: Partial<MenuItemInput>, actorId: string) {
    return audited(
      this.prisma,
      this.audit,
      { actorId, action: 'menuItem.update', entity: 'MenuItem' },
      async (tx) => {
        const before = await tx.menuItem.findUniqueOrThrow({ where: { id } });
        const merged = { ...before, ...input };
        if (merged.kcalMin != null && merged.kcalMax != null && merged.kcalMin > merged.kcalMax) {
          throw new BadRequestException('kcal min must not exceed kcal max');
        }
        const after = await tx.menuItem.update({ where: { id }, data: input });
        return { entityId: id, before, after };
      },
    );
  }

  // ── Weekday templates ──
  listTemplates() {
    return this.prisma.menuTemplate.findMany({
      orderBy: [{ weekday: 'asc' }, { slot: 'asc' }],
      include: itemsInclude,
    });
  }

  upsertTemplate(weekday: number, slot: Slot, input: MenuTemplateInput, actorId: string) {
    const { itemIds, ...fields } = input;
    return audited(
      this.prisma,
      this.audit,
      { actorId, action: 'menuTemplate.upsert', entity: 'MenuTemplate' },
      async (tx) => {
        await this.assertItemsUsable(tx, itemIds);
        const before = await tx.menuTemplate.findUnique({
          where: { weekday_slot: { weekday, slot } },
          include: itemsInclude,
        });
        const items = {
          create: itemIds.map((menuItemId, sortOrder) => ({ menuItemId, sortOrder })),
        };
        const after = before
          ? await tx.menuTemplate.update({
              where: { id: before.id },
              data: { ...fields, items: { deleteMany: {}, ...items } },
              include: itemsInclude,
            })
          : await tx.menuTemplate.create({
              data: { weekday, slot, ...fields, items },
              include: itemsInclude,
            });
        return { entityId: after.id, before, after };
      },
    );
  }

  // ── Date overrides ──
  async listOverrides(from: IsoDate, to: IsoDate) {
    assertRange(from, to, 366);
    const rows = await this.prisma.menuOverride.findMany({
      where: { date: { gte: isoDateToDbDate(from), lte: isoDateToDbDate(to) } },
      orderBy: [{ date: 'asc' }, { slot: 'asc' }],
      include: itemsInclude,
    });
    return rows.map((r) => ({ ...r, date: dbDateToIsoDate(r.date) }));
  }

  async upsertOverride(date: IsoDate, slot: Slot, input: MenuOverrideInput, actorId: string) {
    const { itemIds, ...fields } = input;
    const dbDate = isoDateToDbDate(date);
    const row = await audited(
      this.prisma,
      this.audit,
      { actorId, action: 'menuOverride.upsert', entity: 'MenuOverride' },
      async (tx) => {
        await this.assertItemsUsable(tx, itemIds);
        const before = await tx.menuOverride.findUnique({
          where: { date_slot: { date: dbDate, slot } },
          include: itemsInclude,
        });
        const items = {
          create: itemIds.map((menuItemId, sortOrder) => ({ menuItemId, sortOrder })),
        };
        const after = before
          ? await tx.menuOverride.update({
              where: { id: before.id },
              data: { ...fields, items: { deleteMany: {}, ...items } },
              include: itemsInclude,
            })
          : await tx.menuOverride.create({
              data: { date: dbDate, slot, ...fields, items },
              include: itemsInclude,
            });
        return { entityId: after.id, before, after };
      },
    );
    return { ...row, date };
  }

  async deleteOverride(date: IsoDate, slot: Slot, actorId: string): Promise<void> {
    const dbDate = isoDateToDbDate(date);
    await audited(
      this.prisma,
      this.audit,
      { actorId, action: 'menuOverride.delete', entity: 'MenuOverride' },
      async (tx) => {
        const before = await tx.menuOverride.findUnique({
          where: { date_slot: { date: dbDate, slot } },
          include: itemsInclude,
        });
        if (!before) throw new NotFoundException(`No override for ${slot} on ${date}`);
        await tx.menuOverride.delete({ where: { id: before.id } });
        return { entityId: before.id, before, after: null };
      },
    );
  }

  private async assertItemsUsable(tx: Prisma.TransactionClient, itemIds: string[]): Promise<void> {
    const found = await tx.menuItem.findMany({
      where: { id: { in: itemIds }, active: true },
      select: { id: true },
    });
    if (found.length !== itemIds.length) {
      const ok = new Set(found.map((f) => f.id));
      throw new BadRequestException(
        `Unknown or inactive menu items: ${itemIds.filter((id) => !ok.has(id)).join(', ')}`,
      );
    }
  }
}
