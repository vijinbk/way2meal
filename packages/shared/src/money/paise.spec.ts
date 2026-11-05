import { formatPaise, rupeesToPaise } from './paise';

describe('paise', () => {
  it('converts rupees to integer paise without float drift', () => {
    expect(rupeesToPaise(4159)).toBe(415_900);
    expect(rupeesToPaise('0.29')).toBe(29);
    expect(rupeesToPaise('41.5')).toBe(4150);
    expect(() => rupeesToPaise('1.234')).toThrow(RangeError);
    expect(() => rupeesToPaise(-1)).toThrow(RangeError);
  });

  it('formats with Indian grouping', () => {
    expect(formatPaise(415_900)).toBe('₹4,159');
    expect(formatPaise(10_000_000)).toBe('₹1,00,000');
    expect(formatPaise(4150)).toBe('₹41.50');
  });
});
