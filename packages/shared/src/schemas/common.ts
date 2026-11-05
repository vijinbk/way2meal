import { z } from 'zod';
import { PLAN_KINDS, ROLES, SLOTS } from '../enums';
import { isHhMm, isIsoDate } from '../time/ist';

export const slotSchema = z.enum(SLOTS);
export const roleSchema = z.enum(ROLES);
export const planKindSchema = z.enum(PLAN_KINDS);

export const isoDateSchema = z.string().refine(isIsoDate, 'Expected a date as YYYY-MM-DD');
export const hhmmSchema = z.string().refine(isHhMm, 'Expected a time as HH:mm (24h)');
export const paiseSchema = z.number().int().nonnegative();

/**
 * Indian mobile number, normalised to E.164 (+91XXXXXXXXXX).
 * Accepts "9876543210", "09876543210", "919876543210", "+91 98765 43210".
 */
export const phoneSchema = z
  .string()
  .transform((raw) => raw.replace(/[\s-]/g, ''))
  .transform((s) => s.replace(/^(?:\+91|91|0)(?=\d{10}$)/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'))
  .transform((digits) => `+91${digits}`);

export const otpCodeSchema = z.string().regex(/^\d{6}$/, 'OTP must be 6 digits');
