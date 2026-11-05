import { FixedClock } from './clock';

describe('FixedClock', () => {
  it('can be set to an IST time and advanced', () => {
    const clock = new FixedClock('2026-11-09T09:59:00+05:30');
    expect(clock.now().toISOString()).toBe('2026-11-09T04:29:00.000Z');
    clock.advance(2 * 60_000);
    expect(clock.now().toISOString()).toBe('2026-11-09T04:31:00.000Z');
  });

  it('returns copies so callers cannot mutate it', () => {
    const clock = new FixedClock('2026-11-09T00:00:00Z');
    clock.now().setFullYear(2000);
    expect(clock.now().getUTCFullYear()).toBe(2026);
  });
});
