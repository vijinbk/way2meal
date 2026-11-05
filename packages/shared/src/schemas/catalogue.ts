import { z } from 'zod';
import { SLOTS } from '../enums';
import { isoDateSchema, paiseSchema, planKindSchema, slotSchema } from './common';

/**
 * Admin input schemas, shared by the API (validation) and the admin panel (forms).
 * Each entity has a `*CreateSchema` and a partial `*UpdateSchema`; cross-field
 * rules are applied to both, checking only fields that are present.
 */

const name = z.string().trim().min(1, 'Required').max(120);
const optionalText = z.string().trim().max(500).nullable().optional();
const imageUrl = z.url().max(1000).nullable().optional();
const nonNegInt = z.number().int().nonnegative();
const uniqueIds = z
  .array(z.string().min(1))
  .min(1, 'Pick at least one item')
  .refine((ids) => new Set(ids).size === ids.length, 'Items must be unique');

type KcalRange = { kcalMin?: number | null; kcalMax?: number | null };
const kcalRangeOk = (v: KcalRange) =>
  v.kcalMin == null || v.kcalMax == null || v.kcalMin <= v.kcalMax;
const kcalMessage = { message: 'kcal min must not exceed kcal max', path: ['kcalMax'] };

const nutrition = {
  proteinG: nonNegInt.nullable().optional(),
  kcalMin: nonNegInt.nullable().optional(),
  kcalMax: nonNegInt.nullable().optional(),
};

// ── Menu items ──
const menuItemBase = z.object({
  name,
  description: optionalText,
  imageUrl,
  ...nutrition,
  active: z.boolean().optional(),
});
export const menuItemCreateSchema = menuItemBase.refine(kcalRangeOk, kcalMessage);
export const menuItemUpdateSchema = menuItemBase.partial().refine(kcalRangeOk, kcalMessage);
export type MenuItemInput = z.input<typeof menuItemCreateSchema>;

// ── Menu (weekday template + date override share their meal fields) ──
const mealFields = {
  description: optionalText,
  imageUrl,
  tagline: z.string().trim().max(80).nullable().optional(),
  ...nutrition,
  itemIds: uniqueIds,
};
export const menuTemplateUpsertSchema = z.object(mealFields).refine(kcalRangeOk, kcalMessage);
export type MenuTemplateInput = z.input<typeof menuTemplateUpsertSchema>;

export const menuOverrideUpsertSchema = z
  .object({ ...mealFields, note: optionalText })
  .refine(kcalRangeOk, kcalMessage);
export type MenuOverrideInput = z.input<typeof menuOverrideUpsertSchema>;

export const weekdaySchema = z.coerce.number().int().min(1).max(7);

// ── Flavours ──
const flavourBase = z.object({
  name,
  imageUrl,
  active: z.boolean().optional(),
  sortOrder: nonNegInt.optional(),
});
export const flavourCreateSchema = flavourBase;
export const flavourUpdateSchema = flavourBase.partial();
export type FlavourInput = z.input<typeof flavourCreateSchema>;

// ── Add-ons ──
const addOnBase = z.object({
  name,
  description: optionalText,
  imageUrl,
  pricePaise: paiseSchema,
  slots: z
    .array(slotSchema)
    .min(1, 'Pick at least one slot')
    .refine((s) => new Set(s).size === s.length, 'Slots must be unique'),
  /** null = unlimited */
  dailyStock: nonNegInt.nullable().optional(),
  active: z.boolean().optional(),
});
export const addOnCreateSchema = addOnBase;
export const addOnUpdateSchema = addOnBase.partial();
export type AddOnInput = z.input<typeof addOnCreateSchema>;

// ── Plans ──
type PlanShape = { kind?: string; mealCount?: number; maxSkips?: number };
/** One-off plans are a single meal and can't be skipped (they're cancelled instead). */
const oneOffPlanOk = (p: PlanShape) =>
  !(p.kind === 'TRIAL' || p.kind === 'DAILY') ||
  ((p.mealCount === undefined || p.mealCount === 1) &&
    (p.maxSkips === undefined || p.maxSkips === 0));
const oneOffMessage = {
  message: 'Trial and daily plans must have 1 meal and 0 skips',
  path: ['kind'],
};

const planBase = z.object({
  name,
  kind: planKindSchema,
  slot: slotSchema,
  mealCount: z.number().int().positive().max(366),
  pricePaise: paiseSchema,
  maxSkips: nonNegInt.max(366),
  validityDays: z.number().int().positive().max(730),
  oncePerUser: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: nonNegInt.optional(),
});
export const planCreateSchema = planBase.refine(oneOffPlanOk, oneOffMessage);
/** kind and slot are fixed after creation: existing subscriptions depend on them. */
export const planUpdateSchema = planBase.omit({ kind: true, slot: true }).partial();
export type PlanInput = z.input<typeof planCreateSchema>;

// ── Holidays ──
export const holidayCreateSchema = z.object({
  date: isoDateSchema,
  /** null = kitchen closed for both slots */
  slot: z.enum(SLOTS).nullable(),
  reason: z.string().trim().min(1, 'Required').max(200),
});
export type HolidayInput = z.input<typeof holidayCreateSchema>;

// ── Date range queries ──
export const MAX_RANGE_DAYS = 62;
export const dateRangeQuerySchema = z.object({ from: isoDateSchema, to: isoDateSchema });
