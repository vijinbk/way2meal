/**
 * Initial business data from docs/REQUIREMENTS.md → "Seed data from current menus".
 * This is the ONLY place these values appear in code; at runtime everything is
 * read from the database and is admin-editable. Items marked TBD are open
 * questions for the kitchen and are seeded inactive.
 */
import type { PlanKind, Slot } from '@prisma/client';
import type { Settings } from '@way2meal/shared';
import { rupeesToPaise } from '@way2meal/shared';

export const MEAL_TAGS = { proteinG: 35, kcalMin: 350, kcalMax: 450, tagline: 'Balanced meal' };

export const MENU_ITEM_DESCRIPTIONS: Record<string, string> = {
  'Veg Salad': 'Broccoli, lettuce, red cabbage, cucumber, carrot',
};

/** ISO weekday (Mon = 1) → slot → ordered item names. */
export const WEEKLY_MENU: Record<number, Record<Slot, string[]>> = {
  1: {
    LUNCH: ['Smart Ghee Rice', 'Herbal Chicken Breast', 'Veg Salad', 'Yogurt'],
    DINNER: ['Wheat Macaroni', '100 g Chicken Breast (cooked)', 'Fruits'],
  },
  2: {
    LUNCH: ['Smart Mandi', 'Steamed Chicken Breast', 'Veg Salad', 'Yogurt'],
    DINNER: ['Oats Upma', '100 g Chicken Breast (cooked)', 'Fruits'],
  },
  3: {
    LUNCH: ['Tomato Rice', 'Steamed Chicken Breast', 'Veg Salad', 'Yogurt'],
    DINNER: ['Wheat Pasta', '100 g Chicken Breast (cooked)', 'Fruits'],
  },
  4: {
    LUNCH: ['Smart Biriyani', 'Steamed Chicken Breast', 'Veg Salad', 'Yogurt'],
    DINNER: ['Wheat Upma', '100 g Chicken Breast (cooked)', 'Fruits'],
  },
  5: {
    LUNCH: ['Smart Fried Rice', 'Steamed Chicken Breast', 'Veg Salad', 'Yogurt'],
    DINNER: ['Wheat Noodles', '100 g Chicken Breast (cooked)', 'Fruits'],
  },
  6: {
    LUNCH: ['Brown Rice', 'Chicken Breast Curry', 'Thoran', 'Curd'],
    DINNER: ['Wheat Macaroni', '100 g Chicken Breast (cooked)', 'Fruits'],
  },
};

/** Placeholder names until the kitchen supplies real ones. */
export const FLAVOURS = [
  'Flavour 1',
  'Flavour 2',
  'Flavour 3',
  'Flavour 4',
  'Flavour 5',
  'Flavour 6',
];

/** Prices TBD → seeded at ₹0 and inactive so they can't be sold by accident. */
export const ADD_ONS: { name: string; description?: string; slots: Slot[] }[] = [
  {
    name: 'Premium Protein Veg Salad (300 g)',
    description: '100 g chicken breast + 200 g veg salad',
    slots: ['LUNCH', 'DINNER'],
  },
  { name: 'Extra Chicken Breast (100 g)', slots: ['LUNCH', 'DINNER'] },
  { name: 'Extra Fruit Bowl', slots: ['LUNCH', 'DINNER'] },
  { name: 'Extra Yogurt/Curd', slots: ['LUNCH', 'DINNER'] },
];

export interface PlanSeed {
  name: string;
  kind: PlanKind;
  slot: Slot;
  mealCount: number;
  pricePaise: number;
  maxSkips: number;
  /** Carry-forward validity: 2× the plan's normal calendar length. */
  validityDays: number;
  oncePerUser: boolean;
  active: boolean;
  sortOrder: number;
}

export const PLANS: PlanSeed[] = [
  {
    name: 'Lunch Trial',
    kind: 'TRIAL',
    slot: 'LUNCH',
    mealCount: 1,
    pricePaise: rupeesToPaise(169),
    maxSkips: 0,
    validityDays: 1,
    oncePerUser: true,
    active: true,
    sortOrder: 1,
  },
  {
    name: 'Lunch Weekly',
    kind: 'WEEKLY',
    slot: 'LUNCH',
    mealCount: 6,
    pricePaise: rupeesToPaise(990),
    maxSkips: 2,
    validityDays: 14,
    oncePerUser: false,
    active: true,
    sortOrder: 2,
  },
  {
    name: 'Lunch Monthly',
    kind: 'MONTHLY',
    slot: 'LUNCH',
    mealCount: 26,
    pricePaise: rupeesToPaise(4159),
    maxSkips: 8,
    validityDays: 60,
    oncePerUser: false,
    active: true,
    sortOrder: 3,
  },
  // Daily price TBD by the kitchen; seeded at the trial price but inactive.
  {
    name: 'Lunch Daily',
    kind: 'DAILY',
    slot: 'LUNCH',
    mealCount: 1,
    pricePaise: rupeesToPaise(169),
    maxSkips: 0,
    validityDays: 1,
    oncePerUser: false,
    active: false,
    sortOrder: 4,
  },
  {
    name: 'Dinner Trial',
    kind: 'TRIAL',
    slot: 'DINNER',
    mealCount: 1,
    pricePaise: rupeesToPaise(169),
    maxSkips: 0,
    validityDays: 1,
    oncePerUser: true,
    active: true,
    sortOrder: 5,
  },
  {
    name: 'Dinner Weekly',
    kind: 'WEEKLY',
    slot: 'DINNER',
    mealCount: 6,
    pricePaise: rupeesToPaise(960),
    maxSkips: 2,
    validityDays: 14,
    oncePerUser: false,
    active: true,
    sortOrder: 6,
  },
  {
    name: 'Dinner Monthly',
    kind: 'MONTHLY',
    slot: 'DINNER',
    mealCount: 26,
    pricePaise: rupeesToPaise(4160),
    maxSkips: 8,
    validityDays: 60,
    oncePerUser: false,
    active: true,
    sortOrder: 7,
  },
  {
    name: 'Dinner Daily',
    kind: 'DAILY',
    slot: 'DINNER',
    mealCount: 1,
    pricePaise: rupeesToPaise(169),
    maxSkips: 0,
    validityDays: 1,
    oncePerUser: false,
    active: false,
    sortOrder: 8,
  },
];

export const SETTINGS: Settings = {
  cutoffs: { LUNCH: '10:00', DINNER: '10:00' },
  serviceWeekdays: [1, 2, 3, 4, 5, 6],
  bookingDaysAhead: 7,
  // Capacity TBD by the kitchen; null = unlimited until set.
  capacity: { LUNCH: null, DINNER: null },
  // Kitchen fills these in from the admin panel; payments are blocked until vpa is set.
  upi: { vpa: '', payeeName: 'Way2meal', qrImageUrl: null },
  whatsappNumber: '',
  deliveryAreas: [],
  refundsEnabled: true,
  carryForwardEnabled: true,
};
