import {
  addOnCreateSchema,
  holidayCreateSchema,
  menuItemUpdateSchema,
  menuTemplateUpsertSchema,
  planCreateSchema,
  planUpdateSchema,
} from './catalogue';

const plan = {
  name: 'Lunch Weekly',
  kind: 'WEEKLY',
  slot: 'LUNCH',
  mealCount: 6,
  pricePaise: 99_000,
  maxSkips: 2,
  validityDays: 14,
};

describe('catalogue schemas', () => {
  it('accepts a valid plan and rejects rupee floats', () => {
    expect(planCreateSchema.safeParse(plan).success).toBe(true);
    expect(planCreateSchema.safeParse({ ...plan, pricePaise: 990.5 }).success).toBe(false);
  });

  it('one-off plans must be 1 meal with no skips', () => {
    expect(
      planCreateSchema.safeParse({ ...plan, kind: 'TRIAL', mealCount: 1, maxSkips: 0 }).success,
    ).toBe(true);
    expect(
      planCreateSchema.safeParse({ ...plan, kind: 'TRIAL', mealCount: 6, maxSkips: 0 }).success,
    ).toBe(false);
    expect(
      planCreateSchema.safeParse({ ...plan, kind: 'DAILY', mealCount: 1, maxSkips: 1 }).success,
    ).toBe(false);
  });

  it('plan kind and slot cannot be changed by an update', () => {
    const parsed = planUpdateSchema.parse({ kind: 'MONTHLY', slot: 'DINNER', pricePaise: 100 });
    expect(parsed).toEqual({ pricePaise: 100 });
  });

  it('checks kcal ranges on partial updates too', () => {
    expect(menuItemUpdateSchema.safeParse({ kcalMin: 450, kcalMax: 350 }).success).toBe(false);
    expect(menuItemUpdateSchema.safeParse({ kcalMin: 450 }).success).toBe(true);
  });

  it('menus need at least one unique item', () => {
    expect(menuTemplateUpsertSchema.safeParse({ itemIds: [] }).success).toBe(false);
    expect(menuTemplateUpsertSchema.safeParse({ itemIds: ['a', 'a'] }).success).toBe(false);
    expect(menuTemplateUpsertSchema.safeParse({ itemIds: ['a', 'b'] }).success).toBe(true);
  });

  it('add-ons need integer paise and at least one slot', () => {
    const addOn = { name: 'Extra Yogurt', pricePaise: 3000, slots: ['LUNCH'] };
    expect(addOnCreateSchema.safeParse(addOn).success).toBe(true);
    expect(addOnCreateSchema.safeParse({ ...addOn, slots: [] }).success).toBe(false);
    expect(addOnCreateSchema.safeParse({ ...addOn, pricePaise: -1 }).success).toBe(false);
  });

  it('holidays take a date and an optional slot', () => {
    expect(
      holidayCreateSchema.safeParse({ date: '2026-12-25', slot: null, reason: 'Christmas' })
        .success,
    ).toBe(true);
    expect(
      holidayCreateSchema.safeParse({ date: '2026-12-32', slot: null, reason: 'x' }).success,
    ).toBe(false);
  });
});
