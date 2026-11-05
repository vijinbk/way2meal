import { type DeliveryStatus, PrismaClient } from '@prisma/client';
import { isoDateToDbDate } from '@way2meal/shared';
import { resetDb } from './setup/test-app';

/** Database-level guards from the migrations, independent of service code. */
describe('database invariants', () => {
  const prisma = new PrismaClient();
  let ids: { userId: string; addressId: string; subscriptionId: string; orderId: string };
  const date = isoDateToDbDate('2026-11-10');

  beforeAll(async () => {
    await resetDb(prisma);
    const user = await prisma.user.create({ data: { phone: '+919876543210' } });
    const address = await prisma.address.create({
      data: {
        userId: user.id,
        label: 'Home',
        line1: '1 MG Road',
        area: 'Kakkanad',
        pincode: '682030',
      },
    });
    const plan = await prisma.plan.create({
      data: {
        name: 'Lunch Weekly',
        kind: 'WEEKLY',
        slot: 'LUNCH',
        mealCount: 6,
        pricePaise: 99_000,
        maxSkips: 2,
        validityDays: 14,
      },
    });
    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        slot: 'LUNCH',
        startDate: date,
        mealsTotal: 6,
        maxSkips: 2,
        validityDays: 14,
        pricePaise: 99_000,
        addressId: address.id,
      },
    });
    const order = await prisma.order.create({
      data: { userId: user.id, kind: 'TRIAL', totalPaise: 16_900 },
    });
    ids = { userId: user.id, addressId: address.id, subscriptionId: sub.id, orderId: order.id };
  });
  beforeEach(() => prisma.delivery.deleteMany());
  afterAll(() => prisma.$disconnect());

  const delivery = (
    over: { subscriptionId?: string | null; orderId?: string | null; status?: DeliveryStatus } = {},
  ) =>
    prisma.delivery.create({
      data: {
        userId: ids.userId,
        addressId: ids.addressId,
        slot: 'LUNCH',
        date,
        subscriptionId: ids.subscriptionId,
        orderId: null,
        ...over,
      },
    });

  it('allows only one non-cancelled delivery per subscription per date', async () => {
    await delivery();
    await expect(delivery()).rejects.toThrow(/Unique constraint/);
    await expect(delivery({ status: 'SKIPPED' })).rejects.toThrow(/Unique constraint/);
  });

  it('a cancelled row does not block a replacement on the same date', async () => {
    await delivery({ status: 'CANCELLED' });
    await expect(delivery()).resolves.toBeDefined();
  });

  it('requires exactly one of subscription or order', async () => {
    await expect(delivery({ orderId: ids.orderId })).rejects.toThrow(/Delivery_exactly_one_source/);
    await expect(delivery({ subscriptionId: null })).rejects.toThrow(/Delivery_exactly_one_source/);
    await expect(delivery({ subscriptionId: null, orderId: ids.orderId })).resolves.toBeDefined();
  });

  it('rejects negative money', async () => {
    await expect(
      prisma.order.create({ data: { userId: ids.userId, kind: 'DAILY', totalPaise: -1 } }),
    ).rejects.toThrow(/Order_values_check/);
  });
});
