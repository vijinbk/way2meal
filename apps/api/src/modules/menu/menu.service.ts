import { Injectable } from '@nestjs/common';
import { Prisma, Slot } from '@prisma/client';
import {
  IsoDate,
  ResolvedMenu,
  ResolvedMenuItem,
  SLOTS,
  addDays,
  dbDateToIsoDate,
  isServiceDay,
  isoDateToDbDate,
  isoWeekday,
} from '@way2meal/shared';
import { assertRange } from '../../common/http/range';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const mealInclude = {
  items: {
    where: { menuItem: { active: true } },
    orderBy: { sortOrder: 'asc' },
    include: { menuItem: { select: { id: true, name: true, description: true, imageUrl: true } } },
  },
} satisfies Prisma.MenuTemplateInclude;

/** The fields a template and an override have in common. */
interface MealRow {
  note?: string | null;
  description: string | null;
  imageUrl: string | null;
  tagline: string | null;
  proteinG: number | null;
  kcalMin: number | null;
  kcalMax: number | null;
  items: { menuItem: ResolvedMenuItem }[];
}

/** Resolves what is served on each date: the date override if any, else the weekday template. */
@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async resolve(
    from: IsoDate,
    to: IsoDate,
    slots: readonly Slot[] = SLOTS,
  ): Promise<ResolvedMenu[]> {
    const days = assertRange(from, to);
    const range = { gte: isoDateToDbDate(from), lte: isoDateToDbDate(to) };

    const [calendar, holidays, templates, overrides] = await Promise.all([
      this.settings.getServiceCalendar(from, to),
      this.prisma.holiday.findMany({ where: { date: range } }),
      this.prisma.menuTemplate.findMany({
        where: { slot: { in: [...slots] } },
        include: mealInclude,
      }),
      this.prisma.menuOverride.findMany({
        where: { date: range, slot: { in: [...slots] } },
        include: mealInclude,
      }),
    ]);

    const templateBy = new Map(templates.map((t) => [`${t.weekday}:${t.slot}`, t]));
    const overrideBy = new Map(overrides.map((o) => [`${dbDateToIsoDate(o.date)}:${o.slot}`, o]));

    const result: ResolvedMenu[] = [];
    for (let i = 0; i < days; i++) {
      const date = addDays(from, i);
      const weekday = isoWeekday(date);
      for (const slot of slots) {
        const holiday = holidays.find(
          (h) => dbDateToIsoDate(h.date) === date && (h.slot === null || h.slot === slot),
        );
        const open = isServiceDay(date, slot, calendar);
        const override = overrideBy.get(`${date}:${slot}`);
        const template = templateBy.get(`${weekday}:${slot}`);
        const meal: MealRow | undefined = open ? (override ?? template) : undefined;
        result.push({
          date,
          slot,
          weekday,
          isServiceDay: open,
          holiday: holiday ? { reason: holiday.reason } : null,
          source: !meal ? null : meal === override ? 'OVERRIDE' : 'TEMPLATE',
          note: meal?.note ?? null,
          description: meal?.description ?? null,
          imageUrl: meal?.imageUrl ?? null,
          tagline: meal?.tagline ?? null,
          proteinG: meal?.proteinG ?? null,
          kcalMin: meal?.kcalMin ?? null,
          kcalMax: meal?.kcalMax ?? null,
          items: meal?.items.map((i): ResolvedMenuItem => i.menuItem) ?? [],
        });
      }
    }
    return result;
  }
}
