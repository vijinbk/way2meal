import { cutoffInstant, isBeforeCutoff } from './cutoff';
import { istDateTimeToUtc } from './ist';

const cutoffs = { LUNCH: '10:00', DINNER: '14:00' };
const at = (hhmmss: string) => new Date(`2026-11-09T${hhmmss}+05:30`);

describe('cutoff', () => {
  it('computes the cutoff instant per slot', () => {
    expect(cutoffInstant('2026-11-09', 'LUNCH', cutoffs)).toEqual(
      istDateTimeToUtc('2026-11-09', '10:00'),
    );
    expect(cutoffInstant('2026-11-09', 'DINNER', cutoffs)).toEqual(
      istDateTimeToUtc('2026-11-09', '14:00'),
    );
  });

  it('is open before 10:00 IST and locked from 10:00 IST', () => {
    expect(isBeforeCutoff(at('09:59:59'), '2026-11-09', 'LUNCH', cutoffs)).toBe(true);
    expect(isBeforeCutoff(at('10:00:00'), '2026-11-09', 'LUNCH', cutoffs)).toBe(false);
    expect(isBeforeCutoff(at('10:01:00'), '2026-11-09', 'LUNCH', cutoffs)).toBe(false);
  });

  it('uses the slot-specific cutoff', () => {
    expect(isBeforeCutoff(at('13:59:00'), '2026-11-09', 'DINNER', cutoffs)).toBe(true);
    expect(isBeforeCutoff(at('14:00:00'), '2026-11-09', 'DINNER', cutoffs)).toBe(false);
  });

  it('future dates are open, past dates are locked', () => {
    expect(isBeforeCutoff(at('23:00:00'), '2026-11-10', 'LUNCH', cutoffs)).toBe(true);
    expect(isBeforeCutoff(at('08:00:00'), '2026-11-08', 'LUNCH', cutoffs)).toBe(false);
  });
});
