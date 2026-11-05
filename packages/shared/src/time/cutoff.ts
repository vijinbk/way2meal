import type { Slot } from '../enums';
import { type IsoDate, istDateTimeToUtc } from './ist';

/** Per-slot cutoff wall-clock times in IST, e.g. { LUNCH: "10:00", DINNER: "14:00" }. */
export type SlotCutoffs = Record<Slot, string>;

/** The UTC instant after which a customer can no longer change this date/slot. */
export function cutoffInstant(date: IsoDate, slot: Slot, cutoffs: SlotCutoffs): Date {
  return istDateTimeToUtc(date, cutoffs[slot]);
}

/**
 * True while customers may still change the delivery. The cutoff minute itself
 * is locked: with a 10:00 cutoff, 09:59:59 is open and 10:00:00 is closed.
 */
export function isBeforeCutoff(
  now: Date,
  date: IsoDate,
  slot: Slot,
  cutoffs: SlotCutoffs,
): boolean {
  return now.getTime() < cutoffInstant(date, slot, cutoffs).getTime();
}
