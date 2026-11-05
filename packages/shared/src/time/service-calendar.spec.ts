import {
  type ServiceCalendar,
  earliestStartDate,
  firstServiceDayOnOrAfter,
  isServiceDay,
  nextServiceDayAfter,
  nextServiceDays,
} from './service-calendar';
import { isoWeekday } from './ist';

const monSat: ServiceCalendar = { serviceWeekdays: [1, 2, 3, 4, 5, 6], holidays: [] };
const cutoffs = { LUNCH: '10:00', DINNER: '10:00' };

describe('service calendar', () => {
  it('Sunday is not a service day; Mon–Sat are', () => {
    expect(isServiceDay('2026-11-15', 'LUNCH', monSat)).toBe(false); // Sun
    expect(isServiceDay('2026-11-14', 'LUNCH', monSat)).toBe(true); // Sat
  });

  it('holidays can close one slot or both', () => {
    const cal: ServiceCalendar = {
      ...monSat,
      holidays: [
        { date: '2026-11-10', slot: null },
        { date: '2026-11-11', slot: 'DINNER' },
      ],
    };
    expect(isServiceDay('2026-11-10', 'LUNCH', cal)).toBe(false);
    expect(isServiceDay('2026-11-10', 'DINNER', cal)).toBe(false);
    expect(isServiceDay('2026-11-11', 'LUNCH', cal)).toBe(true);
    expect(isServiceDay('2026-11-11', 'DINNER', cal)).toBe(false);
  });

  it('skips Sunday when finding the next service day', () => {
    expect(nextServiceDayAfter('2026-11-14', 'LUNCH', monSat)).toBe('2026-11-16');
    expect(firstServiceDayOnOrAfter('2026-11-15', 'LUNCH', monSat)).toBe('2026-11-16');
  });

  it('26 service days from a Tuesday land on Mon–Sat only and skip holidays', () => {
    const cal: ServiceCalendar = { ...monSat, holidays: [{ date: '2026-11-19', slot: null }] };
    const days = nextServiceDays('2026-11-10', 26, 'LUNCH', cal);
    expect(days).toHaveLength(26);
    expect(new Set(days).size).toBe(26);
    expect(days.every((d) => isoWeekday(d) !== 7)).toBe(true);
    expect(days).not.toContain('2026-11-19');
    expect(days[0]).toBe('2026-11-10');
    expect(days.at(-1)).toBe('2026-12-10');
  });

  it('honours an admin-configured weekday set', () => {
    const weekdaysOnly: ServiceCalendar = { serviceWeekdays: [1, 2, 3, 4, 5], holidays: [] };
    expect(nextServiceDayAfter('2026-11-13', 'LUNCH', weekdaysOnly)).toBe('2026-11-16');
  });

  it('rejects an empty weekday set instead of looping', () => {
    expect(() =>
      firstServiceDayOnOrAfter('2026-11-10', 'LUNCH', { serviceWeekdays: [], holidays: [] }),
    ).toThrow(/no service weekdays/);
  });

  describe('earliestStartDate', () => {
    it('is today when before cutoff', () => {
      expect(
        earliestStartDate(new Date('2026-11-09T09:30:00+05:30'), 'LUNCH', cutoffs, monSat),
      ).toBe('2026-11-09');
    });
    it('is tomorrow once cutoff has passed', () => {
      expect(
        earliestStartDate(new Date('2026-11-09T10:00:00+05:30'), 'LUNCH', cutoffs, monSat),
      ).toBe('2026-11-10');
    });
    it('rolls past Sunday', () => {
      expect(
        earliestStartDate(new Date('2026-11-14T11:00:00+05:30'), 'LUNCH', cutoffs, monSat),
      ).toBe('2026-11-16');
    });
  });
});
