import { Role } from '@prisma/client';
import type { ResolvedMenu } from '@way2meal/shared';
import request from 'supertest';
import { seed } from '../prisma/seed';
import { userWithRole } from './setup/auth-helpers';
import { type TestApp, createTestApp, resetDb } from './setup/test-app';

// Mon 9 Nov 2026 … Sun 15 Nov 2026
const MON = '2026-11-09';
const WED = '2026-11-11';
const THU = '2026-11-12';
const SUN = '2026-11-15';

describe('Menu', () => {
  let t: TestApp;
  let admin: string;
  const http = () => request(t.app.getHttpServer());
  const menu = async (from: string, to: string, slot?: string) =>
    (
      await http()
        .get('/v1/menu')
        .query({ from, to, ...(slot ? { slot } : {}) })
        .expect(200)
    ).body as ResolvedMenu[];
  const find = (rows: ResolvedMenu[], date: string, slot: string) =>
    rows.find((r) => r.date === date && r.slot === slot)!;
  const names = (m: ResolvedMenu) => m.items.map((i) => i.name);

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  beforeEach(async () => {
    await resetDb(t.prisma);
    await seed(t.prisma);
    admin = (await userWithRole(t, Role.ADMIN)).auth;
  });

  it('resolves the weekday templates for a week, with Sunday closed', async () => {
    const week = await menu(MON, SUN);
    expect(week).toHaveLength(14);

    const monLunch = find(week, MON, 'LUNCH');
    expect(monLunch).toMatchObject({
      source: 'TEMPLATE',
      isServiceDay: true,
      weekday: 1,
      proteinG: 35,
      kcalMin: 350,
      kcalMax: 450,
    });
    expect(names(monLunch)).toEqual([
      'Smart Ghee Rice',
      'Herbal Chicken Breast',
      'Veg Salad',
      'Yogurt',
    ]);
    expect(names(find(week, THU, 'DINNER'))).toEqual([
      'Wheat Upma',
      '100 g Chicken Breast (cooked)',
      'Fruits',
    ]);

    expect(find(week, SUN, 'LUNCH')).toMatchObject({
      isServiceDay: false,
      source: null,
      items: [],
    });
  });

  it('ACCEPTANCE: an admin override for a date shows instead of the template', async () => {
    const items = (await http().get('/v1/admin/menu-items').set('Authorization', admin).expect(200))
      .body as {
      id: string;
      name: string;
    }[];
    const id = (n: string) => items.find((i) => i.name === n)!.id;

    await http()
      .put(`/v1/admin/menu-overrides/${WED}/LUNCH`)
      .set('Authorization', admin)
      .send({
        itemIds: [id('Smart Biriyani'), id('Chicken Breast Curry')],
        note: 'Onam special',
        tagline: 'Festival meal',
      })
      .expect(200);

    const week = await menu(MON, SUN);
    const wedLunch = find(week, WED, 'LUNCH');
    expect(wedLunch).toMatchObject({
      source: 'OVERRIDE',
      note: 'Onam special',
      tagline: 'Festival meal',
    });
    expect(names(wedLunch)).toEqual(['Smart Biriyani', 'Chicken Breast Curry']);
    // Only that date + slot changes.
    expect(find(week, WED, 'DINNER').source).toBe('TEMPLATE');
    expect(find(week, '2026-11-18', 'LUNCH')).toBeUndefined();
    const nextWed = await menu('2026-11-18', '2026-11-18', 'LUNCH');
    expect(names(nextWed[0]!)).toEqual([
      'Tomato Rice',
      'Steamed Chicken Breast',
      'Veg Salad',
      'Yogurt',
    ]);

    // Removing the override restores the template.
    await http()
      .delete(`/v1/admin/menu-overrides/${WED}/LUNCH`)
      .set('Authorization', admin)
      .expect(204);
    expect(find(await menu(WED, WED), WED, 'LUNCH').source).toBe('TEMPLATE');
  });

  it('flags holidays, for one slot or both', async () => {
    await http()
      .post('/v1/admin/holidays')
      .set('Authorization', admin)
      .send({ date: THU, slot: null, reason: 'Diwali' })
      .expect(201);
    await http()
      .post('/v1/admin/holidays')
      .set('Authorization', admin)
      .send({ date: WED, slot: 'DINNER', reason: 'Staff event' })
      .expect(201);

    const week = await menu(MON, SUN);
    expect(find(week, THU, 'LUNCH')).toMatchObject({
      isServiceDay: false,
      holiday: { reason: 'Diwali' },
      items: [],
    });
    expect(find(week, THU, 'DINNER').isServiceDay).toBe(false);
    expect(find(week, WED, 'DINNER')).toMatchObject({
      isServiceDay: false,
      holiday: { reason: 'Staff event' },
    });
    expect(find(week, WED, 'LUNCH')).toMatchObject({
      isServiceDay: true,
      holiday: null,
      source: 'TEMPLATE',
    });
  });

  it('rejects overlapping holidays', async () => {
    const post = (body: object) =>
      http().post('/v1/admin/holidays').set('Authorization', admin).send(body);
    await post({ date: THU, slot: null, reason: 'Diwali' }).expect(201);
    const res = await post({ date: THU, slot: 'LUNCH', reason: 'Again' }).expect(409);
    expect(res.body.message).toContain('Diwali');
  });

  it('hides deactivated menu items', async () => {
    await t.prisma.menuItem.update({ where: { name: 'Yogurt' }, data: { active: false } });
    expect(names(find(await menu(MON, MON), MON, 'LUNCH'))).not.toContain('Yogurt');
  });

  it('follows the service weekday setting', async () => {
    await http()
      .put('/v1/admin/settings/serviceWeekdays')
      .set('Authorization', admin)
      .send({ value: [1, 2, 3, 4, 5, 6, 7] })
      .expect(200);
    // Sunday is now open but has no template configured.
    expect(find(await menu(SUN, SUN), SUN, 'LUNCH')).toMatchObject({
      isServiceDay: true,
      source: null,
      items: [],
    });
  });

  it('filters by slot and validates the range', async () => {
    const lunch = await menu(MON, SUN, 'LUNCH');
    expect(lunch).toHaveLength(7);
    expect(lunch.every((m) => m.slot === 'LUNCH')).toBe(true);

    await http().get('/v1/menu').query({ from: SUN, to: MON }).expect(400);
    await http().get('/v1/menu').query({ from: '2026-11-01', to: '2027-01-15' }).expect(400);
    await http().get('/v1/menu').query({ from: '2026-11-31', to: '2026-12-01' }).expect(400);
    await http().get('/v1/menu').query({ from: MON }).expect(400);
  });

  it('template edits replace the items in the given order and reject inactive items', async () => {
    const items = (await http().get('/v1/admin/menu-items').set('Authorization', admin)).body as {
      id: string;
      name: string;
    }[];
    const id = (n: string) => items.find((i) => i.name === n)!.id;

    const res = await http()
      .put('/v1/admin/menu-templates/1/LUNCH')
      .set('Authorization', admin)
      .send({ itemIds: [id('Yogurt'), id('Brown Rice')], proteinG: 40, kcalMin: 380, kcalMax: 420 })
      .expect(200);
    expect(res.body.items.map((i: { menuItem: { name: string } }) => i.menuItem.name)).toEqual([
      'Yogurt',
      'Brown Rice',
    ]);
    expect(find(await menu(MON, MON), MON, 'LUNCH')).toMatchObject({ proteinG: 40, kcalMin: 380 });

    await t.prisma.menuItem.update({ where: { name: 'Thoran' }, data: { active: false } });
    await http()
      .put('/v1/admin/menu-templates/1/LUNCH')
      .set('Authorization', admin)
      .send({ itemIds: [id('Thoran')] })
      .expect(400);
    await http()
      .put('/v1/admin/menu-templates/8/LUNCH')
      .set('Authorization', admin)
      .send({ itemIds: [id('Yogurt')] })
      .expect(400);
    await http()
      .put('/v1/admin/menu-templates/1/BRUNCH')
      .set('Authorization', admin)
      .send({ itemIds: [id('Yogurt')] })
      .expect(400);
  });

  it('records an audit log entry with before/after for menu changes', async () => {
    const items = (await http().get('/v1/admin/menu-items').set('Authorization', admin)).body as {
      id: string;
      name: string;
    }[];
    const yogurt = items.find((i) => i.name === 'Yogurt')!;
    await http()
      .patch(`/v1/admin/menu-items/${yogurt.id}`)
      .set('Authorization', admin)
      .send({ name: 'Greek Yogurt' })
      .expect(200);

    const log = await t.prisma.auditLog.findFirstOrThrow({
      where: { entity: 'MenuItem', entityId: yogurt.id },
    });
    expect(log.action).toBe('menuItem.update');
    expect(log.before).toMatchObject({ name: 'Yogurt' });
    expect(log.after).toMatchObject({ name: 'Greek Yogurt' });
  });
});
