import {
  BUSINESS_TIME_ZONE,
  IST_OFFSET_MINUTES,
  addDays,
  daysBetween,
  dbDateToIsoDate,
  isIsoDate,
  isoDateToDbDate,
  isoWeekday,
  istDateOf,
  istDateTimeToUtc,
} from './ist';

describe('IST date helpers', () => {
  it('fixed +05:30 offset matches the tz database for Asia/Kolkata', () => {
    const samples = ['2026-01-15T12:00:00Z', '2026-07-01T00:00:00Z', '2030-03-30T20:00:00Z'];
    for (const s of samples) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: BUSINESS_TIME_ZONE,
        timeZoneName: 'longOffset',
      }).formatToParts(new Date(s));
      expect(parts.find((p) => p.type === 'timeZoneName')?.value).toBe('GMT+05:30');
    }
    expect(IST_OFFSET_MINUTES).toBe(330);
  });

  it('istDateOf rolls over at 18:30 UTC (midnight IST)', () => {
    expect(istDateOf(new Date('2026-11-05T18:29:59Z'))).toBe('2026-11-05');
    expect(istDateOf(new Date('2026-11-05T18:30:00Z'))).toBe('2026-11-06');
  });

  it('istDateTimeToUtc converts IST wall clock to UTC', () => {
    expect(istDateTimeToUtc('2026-11-09', '10:00').toISOString()).toBe('2026-11-09T04:30:00.000Z');
    expect(istDateTimeToUtc('2026-11-09', '00:15').toISOString()).toBe('2026-11-08T18:45:00.000Z');
    expect(() => istDateTimeToUtc('2026-11-09', '24:00')).toThrow(RangeError);
  });

  it('isoWeekday is Monday=1 … Sunday=7', () => {
    expect(isoWeekday('2026-11-09')).toBe(1); // Monday
    expect(isoWeekday('2026-11-14')).toBe(6); // Saturday
    expect(isoWeekday('2026-11-15')).toBe(7); // Sunday
  });

  it('addDays / daysBetween handle month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-11-05', '2026-12-05')).toBe(30);
  });

  it('validates ISO dates strictly', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-1-05')).toBe(false);
    expect(() => addDays('nope', 1)).toThrow(RangeError);
  });

  it('round-trips @db.Date values without shifting the day', () => {
    expect(dbDateToIsoDate(isoDateToDbDate('2026-11-05'))).toBe('2026-11-05');
  });
});
