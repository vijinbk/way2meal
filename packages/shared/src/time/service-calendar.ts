import type { Slot } from '../enums';
import { type SlotCutoffs, isBeforeCutoff } from './cutoff';
import { type IsoDate, addDays, isoWeekday, istDateOf } from './ist';

export interface HolidayEntry {
  date: IsoDate;
  /** null = the kitchen is closed for both slots. */
  slot: Slot | null;
}

/** Everything needed to decide whether a date is a service day. Loaded from settings + holidays. */
export interface ServiceCalendar {
  /** ISO weekdays the kitchen serves (Mon = 1 … Sun = 7). */
  serviceWeekdays: readonly number[];
  holidays: readonly HolidayEntry[];
}

export function isHoliday(date: IsoDate, slot: Slot, calendar: ServiceCalendar): boolean {
  return calendar.holidays.some((h) => h.date === date && (h.slot === null || h.slot === slot));
}

export function isServiceDay(date: IsoDate, slot: Slot, calendar: ServiceCalendar): boolean {
  return calendar.serviceWeekdays.includes(isoWeekday(date)) && !isHoliday(date, slot, calendar);
}

/** Guards against misconfiguration (e.g. no service weekdays) looping forever. */
const MAX_SCAN_DAYS = 3660;

/** First service day on or after `from`. */
export function firstServiceDayOnOrAfter(
  from: IsoDate,
  slot: Slot,
  calendar: ServiceCalendar,
): IsoDate {
  if (calendar.serviceWeekdays.length === 0) {
    throw new Error('Service calendar has no service weekdays configured');
  }
  let date = from;
  for (let i = 0; i < MAX_SCAN_DAYS; i++) {
    if (isServiceDay(date, slot, calendar)) return date;
    date = addDays(date, 1);
  }
  throw new Error(`No service day within ${MAX_SCAN_DAYS} days of ${from}`);
}

/** First service day strictly after `date`. */
export function nextServiceDayAfter(date: IsoDate, slot: Slot, calendar: ServiceCalendar): IsoDate {
  return firstServiceDayOnOrAfter(addDays(date, 1), slot, calendar);
}

/** `count` consecutive service days starting on or after `from`. */
export function nextServiceDays(
  from: IsoDate,
  count: number,
  slot: Slot,
  calendar: ServiceCalendar,
): IsoDate[] {
  const days: IsoDate[] = [];
  let date = firstServiceDayOnOrAfter(from, slot, calendar);
  while (days.length < count) {
    days.push(date);
    date = nextServiceDayAfter(date, slot, calendar);
  }
  return days;
}

/**
 * Earliest date a new subscription/booking can start: today if `now` is before
 * today's cutoff for the slot, else tomorrow — rolled forward to a service day.
 */
export function earliestStartDate(
  now: Date,
  slot: Slot,
  cutoffs: SlotCutoffs,
  calendar: ServiceCalendar,
): IsoDate {
  const today = istDateOf(now);
  const candidate = isBeforeCutoff(now, today, slot, cutoffs) ? today : addDays(today, 1);
  return firstServiceDayOnOrAfter(candidate, slot, calendar);
}
