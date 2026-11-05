import { formatDuration } from './duration';

describe('formatDuration', () => {
  it.each([
    [-5, '0m'],
    [0, '0m'],
    [30_000, '<1m'],
    [45 * 60_000, '45m'],
    [2 * 3_600_000, '2h'],
    [2 * 3_600_000 + 15 * 60_000 + 59_000, '2h 15m'],
    [26 * 3_600_000, '1d 2h'],
    [48 * 3_600_000, '2d'],
  ])('%d ms → %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});
