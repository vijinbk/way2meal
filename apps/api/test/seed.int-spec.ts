import { PrismaClient } from '@prisma/client';
import { SETTING_KEYS, settingSchemas } from '@way2meal/shared';
import { seed } from '../prisma/seed';
import { resetDb } from './setup/test-app';

describe('seed', () => {
  const prisma = new PrismaClient();

  beforeAll(async () => {
    await resetDb(prisma);
    await seed(prisma, { adminPhone: '99999 99999' });
  });
  afterAll(() => prisma.$disconnect());

  it('loads Mon–Sat lunch and dinner templates tagged 35 g / 350–450 kcal', async () => {
    const templates = await prisma.menuTemplate.findMany({
      include: { items: { include: { menuItem: true }, orderBy: { sortOrder: 'asc' } } },
    });
    expect(templates).toHaveLength(12);
    expect(new Set(templates.map((t) => t.weekday))).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(
      templates.every((t) => t.proteinG === 35 && t.kcalMin === 350 && t.kcalMax === 450),
    ).toBe(true);

    const satLunch = templates.find((t) => t.weekday === 6 && t.slot === 'LUNCH')!;
    expect(satLunch.items.map((i) => i.menuItem.name)).toEqual([
      'Brown Rice',
      'Chicken Breast Curry',
      'Thoran',
      'Curd',
    ]);
  });

  it('stores plan prices in paise', async () => {
    const plans = await prisma.plan.findMany();
    const price = (name: string) => plans.find((p) => p.name === name)?.pricePaise;
    expect(price('Lunch Monthly')).toBe(415_900);
    expect(price('Dinner Weekly')).toBe(96_000);
    expect(plans.filter((p) => p.kind === 'TRIAL').every((p) => p.oncePerUser)).toBe(true);
  });

  it('seeds 6 flavours, inactive TBD add-ons, valid settings and the admin', async () => {
    expect(await prisma.flavour.count()).toBe(6);
    expect(await prisma.addOn.count({ where: { active: true } })).toBe(0);

    const settings = await prisma.setting.findMany();
    expect(settings.map((s) => s.key).sort()).toEqual([...SETTING_KEYS].sort());
    for (const s of settings) {
      expect(settingSchemas[s.key as keyof typeof settingSchemas].safeParse(s.value).success).toBe(
        true,
      );
    }
    expect(settings.find((s) => s.key === 'cutoffs')?.value).toEqual({
      LUNCH: '10:00',
      DINNER: '10:00',
    });

    const admin = await prisma.user.findUnique({ where: { phone: '+919999999999' } });
    expect(admin?.role).toBe('ADMIN');
  });

  it('is idempotent and never overwrites admin edits', async () => {
    await prisma.plan.updateMany({
      where: { name: 'Lunch Weekly' },
      data: { pricePaise: 105_000 },
    });
    await seed(prisma);
    expect(await prisma.menuTemplate.count()).toBe(12);
    expect(await prisma.menuItem.count()).toBe(20);
    const weekly = await prisma.plan.findFirstOrThrow({ where: { name: 'Lunch Weekly' } });
    expect(weekly.pricePaise).toBe(105_000);
  });
});
