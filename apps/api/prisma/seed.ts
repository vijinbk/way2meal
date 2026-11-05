import { PrismaClient, Role } from '@prisma/client';
import { SETTING_KEYS, phoneSchema, settingSchemas } from '@way2meal/shared';
import {
  ADD_ONS,
  FLAVOURS,
  MEAL_TAGS,
  MENU_ITEM_DESCRIPTIONS,
  PLANS,
  SETTINGS,
  WEEKLY_MENU,
} from './seed-data';

/**
 * Idempotent and non-destructive: rows are created only if missing, so
 * re-running never overwrites what the admin has edited since.
 */
export async function seed(
  prisma: PrismaClient,
  opts: { adminPhone?: string } = {},
): Promise<void> {
  for (const key of SETTING_KEYS) {
    const value = settingSchemas[key].parse(SETTINGS[key]);
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  const itemNames = [
    ...new Set(Object.values(WEEKLY_MENU).flatMap((d) => [...d.LUNCH, ...d.DINNER])),
  ];
  const itemIds = new Map<string, string>();
  for (const name of itemNames) {
    const item = await prisma.menuItem.upsert({
      where: { name },
      create: { name, description: MENU_ITEM_DESCRIPTIONS[name] },
      update: {},
    });
    itemIds.set(name, item.id);
  }

  for (const [weekdayText, slots] of Object.entries(WEEKLY_MENU)) {
    const weekday = Number(weekdayText);
    for (const slot of ['LUNCH', 'DINNER'] as const) {
      const exists = await prisma.menuTemplate.findUnique({
        where: { weekday_slot: { weekday, slot } },
      });
      if (exists) continue;
      await prisma.menuTemplate.create({
        data: {
          weekday,
          slot,
          ...MEAL_TAGS,
          items: {
            create: slots[slot].map((name, i) => ({
              menuItemId: itemIds.get(name)!,
              sortOrder: i,
            })),
          },
        },
      });
    }
  }

  for (const [i, name] of FLAVOURS.entries()) {
    await prisma.flavour.upsert({
      where: { name },
      create: { name, sortOrder: i + 1 },
      update: {},
    });
  }

  for (const addOn of ADD_ONS) {
    await prisma.addOn.upsert({
      where: { name: addOn.name },
      create: { ...addOn, pricePaise: 0, active: false },
      update: {},
    });
  }

  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { kind_slot_name: { kind: plan.kind, slot: plan.slot, name: plan.name } },
      create: plan,
      update: {},
    });
  }

  if (opts.adminPhone) {
    const phone = phoneSchema.parse(opts.adminPhone);
    await prisma.user.upsert({
      where: { phone },
      create: { phone, name: 'Admin', role: Role.ADMIN },
      update: { role: Role.ADMIN },
    });
  }
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seed(prisma, { adminPhone: process.env.SEED_ADMIN_PHONE })
    .then(() => console.warn('Seed complete'))
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => void prisma.$disconnect());
}
