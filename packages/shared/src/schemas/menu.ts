import { z } from 'zod';
import type { Slot } from '../enums';
import type { SlotCutoffs } from '../time/cutoff';
import type { IsoDate } from '../time/ist';
import { isoDateSchema, slotSchema } from './common';

export const menuQuerySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
  slot: slotSchema.optional(),
});

export interface ResolvedMenuItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

/** The meal served on one date + slot, as GET /menu returns it. */
export interface ResolvedMenu {
  date: IsoDate;
  slot: Slot;
  /** ISO weekday, Mon = 1 … Sun = 7 */
  weekday: number;
  isServiceDay: boolean;
  holiday: { reason: string } | null;
  /** OVERRIDE = date special, TEMPLATE = weekday menu, null = closed / nothing configured */
  source: 'OVERRIDE' | 'TEMPLATE' | null;
  note: string | null;
  description: string | null;
  imageUrl: string | null;
  tagline: string | null;
  proteinG: number | null;
  kcalMin: number | null;
  kcalMax: number | null;
  items: ResolvedMenuItem[];
}

/** Non-sensitive settings the apps need (GET /config). */
export interface PublicConfig {
  timeZone: string;
  cutoffs: SlotCutoffs;
  serviceWeekdays: number[];
  bookingDaysAhead: number;
  whatsappNumber: string;
}

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(80).optional(),
  email: z.email().max(200).nullable().optional(),
  dietaryNote: z.string().trim().max(500).nullable().optional(),
  defaultFlavourId: z.string().min(1).nullable().optional(),
});
export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;
