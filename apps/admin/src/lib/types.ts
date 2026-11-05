import type { PlanKind, Slot } from '@way2meal/shared';

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  proteinG: number | null;
  kcalMin: number | null;
  kcalMax: number | null;
  active: boolean;
}

export interface MealItemLink {
  id: string;
  menuItemId: string;
  sortOrder: number;
  menuItem: MenuItem;
}

export interface MealFields {
  description: string | null;
  imageUrl: string | null;
  tagline: string | null;
  proteinG: number | null;
  kcalMin: number | null;
  kcalMax: number | null;
  items: MealItemLink[];
}

export interface MenuTemplate extends MealFields {
  id: string;
  weekday: number;
  slot: Slot;
}

export interface MenuOverride extends MealFields {
  id: string;
  date: string;
  slot: Slot;
  note: string | null;
}

export interface Plan {
  id: string;
  name: string;
  kind: PlanKind;
  slot: Slot;
  mealCount: number;
  pricePaise: number;
  maxSkips: number;
  validityDays: number;
  oncePerUser: boolean;
  active: boolean;
  sortOrder: number;
}

export interface AddOn {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricePaise: number;
  slots: Slot[];
  dailyStock: number | null;
  active: boolean;
}

export interface Flavour {
  id: string;
  name: string;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
}

export interface Holiday {
  id: string;
  date: string;
  slot: Slot | null;
  reason: string;
}

export const WEEKDAY_NAMES = [
  '',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
export const SLOT_LABEL: Record<Slot, string> = { LUNCH: 'Lunch', DINNER: 'Dinner' };
