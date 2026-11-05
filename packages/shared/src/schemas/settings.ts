import { z } from 'zod';
import { hhmmSchema } from './common';

/**
 * Shape of every row in the `Setting` table (key → JSON value). Values are
 * admin-editable data seeded from docs/REQUIREMENTS.md; this file only
 * validates their shape and never supplies business defaults.
 */
export const settingSchemas = {
  cutoffs: z.object({ LUNCH: hhmmSchema, DINNER: hhmmSchema }),
  serviceWeekdays: z.array(z.number().int().min(1).max(7)).min(1),
  bookingDaysAhead: z.number().int().min(0).max(90),
  /** Max meals per slot per day; null = unlimited. */
  capacity: z.object({
    LUNCH: z.number().int().positive().nullable(),
    DINNER: z.number().int().positive().nullable(),
  }),
  upi: z.object({
    vpa: z.string(),
    payeeName: z.string(),
    qrImageUrl: z.string().nullable(),
  }),
  whatsappNumber: z.string(),
  deliveryAreas: z.array(z.object({ name: z.string().min(1), pincodes: z.array(z.string()) })),
  refundsEnabled: z.boolean(),
  carryForwardEnabled: z.boolean(),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof settingSchemas)[K]>;
export type Settings = { [K in SettingKey]: SettingValue<K> };

export const SETTING_KEYS = Object.keys(settingSchemas) as SettingKey[];
