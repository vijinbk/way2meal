import { Role } from '@prisma/client';
import request from 'supertest';
import { seed } from '../prisma/seed';
import { userWithRole } from './setup/auth-helpers';
import { type TestApp, createTestApp, resetDb } from './setup/test-app';

describe('Catalogue, settings and profile', () => {
  let t: TestApp;
  let admin: { id: string; auth: string };
  const http = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  beforeEach(async () => {
    await resetDb(t.prisma);
    await seed(t.prisma);
    admin = await userWithRole(t, Role.ADMIN);
  });

  const weekly = {
    name: 'Lunch Weekly Plus',
    kind: 'WEEKLY',
    slot: 'LUNCH',
    mealCount: 6,
    pricePaise: 120_000,
    maxSkips: 2,
    validityDays: 14,
  };

  it('admin catalogue routes are ADMIN-only', async () => {
    const kitchen = await userWithRole(t, Role.KITCHEN);
    const customer = await userWithRole(t, Role.CUSTOMER);
    for (const path of [
      '/v1/admin/plans',
      '/v1/admin/addons',
      '/v1/admin/flavours',
      '/v1/admin/menu-items',
      '/v1/admin/settings',
    ]) {
      await http().get(path).expect(401);
      await http().get(path).set('Authorization', customer.auth).expect(403);
      await http().get(path).set('Authorization', kitchen.auth).expect(403);
      await http().get(path).set('Authorization', admin.auth).expect(200);
    }
    await http()
      .post('/v1/admin/plans')
      .set('Authorization', customer.auth)
      .send(weekly)
      .expect(403);
  });

  it('public /plans lists active plans only, with prices in paise', async () => {
    const plans = (await http().get('/v1/plans').expect(200)).body as {
      name: string;
      pricePaise: number;
    }[];
    expect(plans.map((p) => p.name)).toEqual([
      'Lunch Trial',
      'Lunch Weekly',
      'Lunch Monthly',
      'Dinner Trial',
      'Dinner Weekly',
      'Dinner Monthly',
    ]);
    expect(plans.find((p) => p.name === 'Lunch Monthly')?.pricePaise).toBe(415_900);
  });

  it('creates, edits and deactivates a plan, with an audit trail', async () => {
    const created = await http()
      .post('/v1/admin/plans')
      .set('Authorization', admin.auth)
      .send(weekly)
      .expect(201);
    expect((await http().get('/v1/plans')).body.map((p: { name: string }) => p.name)).toContain(
      'Lunch Weekly Plus',
    );

    await http()
      .patch(`/v1/admin/plans/${created.body.id}`)
      .set('Authorization', admin.auth)
      .send({ pricePaise: 125_000 })
      .expect(200);
    await http()
      .patch(`/v1/admin/plans/${created.body.id}`)
      .set('Authorization', admin.auth)
      .send({ active: false })
      .expect(200);
    expect((await http().get('/v1/plans')).body.map((p: { name: string }) => p.name)).not.toContain(
      'Lunch Weekly Plus',
    );

    const logs = await t.prisma.auditLog.findMany({
      where: { entityId: created.body.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(logs.map((l) => l.action)).toEqual(['plan.create', 'plan.update', 'plan.update']);
    expect(logs[1]).toMatchObject({
      actorId: admin.id,
      before: { pricePaise: 120_000 },
      after: { pricePaise: 125_000 },
    });
  });

  it('validates plans, including rules that depend on the stored kind', async () => {
    await http()
      .post('/v1/admin/plans')
      .set('Authorization', admin.auth)
      .send({ ...weekly, pricePaise: 990.5 })
      .expect(400);
    await http()
      .post('/v1/admin/plans')
      .set('Authorization', admin.auth)
      .send({ ...weekly, kind: 'TRIAL' })
      .expect(400);

    const trial = await t.prisma.plan.findFirstOrThrow({ where: { name: 'Lunch Trial' } });
    await http()
      .patch(`/v1/admin/plans/${trial.id}`)
      .set('Authorization', admin.auth)
      .send({ mealCount: 6 })
      .expect(400);
    await http()
      .patch('/v1/admin/plans/does-not-exist')
      .set('Authorization', admin.auth)
      .send({ pricePaise: 1 })
      .expect(404);
  });

  it('rejects duplicate names with 409', async () => {
    await http()
      .post('/v1/admin/plans')
      .set('Authorization', admin.auth)
      .send({ ...weekly, name: 'Lunch Weekly' })
      .expect(409);
    await http()
      .post('/v1/admin/flavours')
      .set('Authorization', admin.auth)
      .send({ name: 'Flavour 1' })
      .expect(409);
  });

  it('add-ons: admin sets a price and activates; customers see only active ones', async () => {
    expect((await http().get('/v1/addons').expect(200)).body).toEqual([]);
    const all = (await http().get('/v1/admin/addons').set('Authorization', admin.auth)).body as {
      id: string;
      name: string;
    }[];
    const yogurt = all.find((a) => a.name === 'Extra Yogurt/Curd')!;

    await http()
      .patch(`/v1/admin/addons/${yogurt.id}`)
      .set('Authorization', admin.auth)
      .send({ pricePaise: 3000, active: true })
      .expect(200);
    const visible = (await http().get('/v1/addons')).body;
    expect(visible).toEqual([
      expect.objectContaining({
        name: 'Extra Yogurt/Curd',
        pricePaise: 3000,
        slots: ['LUNCH', 'DINNER'],
      }),
    ]);

    await http()
      .post('/v1/admin/addons')
      .set('Authorization', admin.auth)
      .send({ name: 'Boiled Eggs (2)', pricePaise: 4000, slots: ['LUNCH'], dailyStock: 20 })
      .expect(201);
  });

  it('flavours: rename and deactivate', async () => {
    const all = (await http().get('/v1/admin/flavours').set('Authorization', admin.auth)).body as {
      id: string;
      name: string;
    }[];
    await http()
      .patch(`/v1/admin/flavours/${all[0]!.id}`)
      .set('Authorization', admin.auth)
      .send({ name: 'Pepper' })
      .expect(200);
    await http()
      .patch(`/v1/admin/flavours/${all[1]!.id}`)
      .set('Authorization', admin.auth)
      .send({ active: false })
      .expect(200);
    const visible = (await http().get('/v1/flavours')).body.map((f: { name: string }) => f.name);
    expect(visible).toEqual(['Pepper', 'Flavour 3', 'Flavour 4', 'Flavour 5', 'Flavour 6']);
  });

  it('settings: per-slot cutoff change shows in /config; bad values and keys are rejected', async () => {
    await http()
      .put('/v1/admin/settings/cutoffs')
      .set('Authorization', admin.auth)
      .send({ value: { LUNCH: '10:00', DINNER: '14:00' } })
      .expect(200);
    const config = (await http().get('/v1/config').expect(200)).body;
    expect(config).toMatchObject({
      timeZone: 'Asia/Kolkata',
      cutoffs: { LUNCH: '10:00', DINNER: '14:00' },
      bookingDaysAhead: 7,
    });
    expect(config).not.toHaveProperty('upi');

    await http()
      .put('/v1/admin/settings/cutoffs')
      .set('Authorization', admin.auth)
      .send({ value: { LUNCH: '10am' } })
      .expect(400);
    await http()
      .put('/v1/admin/settings/bookingDaysAhead')
      .set('Authorization', admin.auth)
      .send({ value: -1 })
      .expect(400);
    await http()
      .put('/v1/admin/settings/secretKey')
      .set('Authorization', admin.auth)
      .send({ value: 1 })
      .expect(404);

    const log = await t.prisma.auditLog.findFirstOrThrow({
      where: { entity: 'Setting', entityId: 'cutoffs' },
    });
    expect(log.after).toEqual({ LUNCH: '10:00', DINNER: '14:00' });
  });

  it('PATCH /me saves onboarding details and checks the flavour', async () => {
    const customer = await userWithRole(t, Role.CUSTOMER);
    const flavour = await t.prisma.flavour.findFirstOrThrow({ where: { name: 'Flavour 2' } });
    const res = await http()
      .patch('/v1/me')
      .set('Authorization', customer.auth)
      .send({
        name: 'Asha',
        email: 'asha@example.com',
        dietaryNote: 'No peanuts',
        defaultFlavourId: flavour.id,
      })
      .expect(200);
    expect(res.body).toMatchObject({
      name: 'Asha',
      dietaryNote: 'No peanuts',
      defaultFlavourId: flavour.id,
    });

    await http()
      .patch('/v1/me')
      .set('Authorization', customer.auth)
      .send({ defaultFlavourId: 'nope' })
      .expect(400);
    await http()
      .patch('/v1/me')
      .set('Authorization', customer.auth)
      .send({ email: 'not-an-email' })
      .expect(400);
    await http()
      .patch('/v1/me')
      .set('Authorization', customer.auth)
      .send({ role: 'ADMIN' })
      .expect(200);
    expect((await t.prisma.user.findUniqueOrThrow({ where: { id: customer.id } })).role).toBe(
      'CUSTOMER',
    );
  });
});
