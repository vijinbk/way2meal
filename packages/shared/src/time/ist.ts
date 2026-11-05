/**
 * Calendar helpers for the business timezone.
 *
 * Rules: instants are stored in UTC (JS Date); service days are calendar dates
 * in Asia/Kolkata, represented as ISO strings "YYYY-MM-DD" (type IsoDate).
 * Asia/Kolkata has had a fixed +05:30 offset with no DST since 1945, which
 * ist.spec.ts cross-checks against the platform tz database.
 */
export const BUSINESS_TIME_ZONE = 'Asia/Kolkata';
export const IST_OFFSET_MINUTES = 330;

/** A calendar date in IST, "YYYY-MM-DD". */
export type IsoDate = string;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MS = 86_400_000;

export function isIsoDate(value: string): value is IsoDate {
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function assertIsoDate(value: string): void {
  if (!isIsoDate(value)) throw new RangeError(`Invalid ISO date: "${value}"`);
}

/** The IST calendar date that a UTC instant falls on. */
export function istDateOf(instant: Date): IsoDate {
  return new Date(instant.getTime() + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/** ISO weekday of an IST date: Monday = 1 … Sunday = 7. */
export function isoWeekday(date: IsoDate): number {
  assertIsoDate(date);
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  assertIsoDate(date);
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Negative if a < b, 0 if equal, positive if a > b. ISO strings sort lexically. */
export function compareDates(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  assertIsoDate(from);
  assertIsoDate(to);
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function isHhMm(value: string): boolean {
  return HHMM_RE.test(value);
}

/** The UTC instant for a wall-clock time ("HH:mm") on an IST date. */
export function istDateTimeToUtc(date: IsoDate, hhmm: string): Date {
  assertIsoDate(date);
  const m = HHMM_RE.exec(hhmm);
  if (!m) throw new RangeError(`Invalid time "${hhmm}", expected HH:mm`);
  const localMs = Date.parse(`${date}T${m[1]}:${m[2]}:00Z`);
  return new Date(localMs - IST_OFFSET_MINUTES * 60_000);
}

/**
 * Converts between IsoDate and the JS Date Prisma uses for `@db.Date` columns
 * (midnight UTC of that calendar date — no timezone shift is applied).
 */
export function isoDateToDbDate(date: IsoDate): Date {
  assertIsoDate(date);
  return new Date(`${date}T00:00:00Z`);
}

export function dbDateToIsoDate(value: Date): IsoDate {
  return value.toISOString().slice(0, 10);
}
