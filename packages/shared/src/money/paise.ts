/** All money is integer paise (₹1 = 100 paise), INR only. */
export type Paise = number;

export function assertPaise(value: number): asserts value is Paise {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`Invalid paise amount: ${value}`);
  }
}

/** Converts a rupee amount (as typed by an admin, e.g. 990 or "41.50") to paise without float drift. */
export function rupeesToPaise(rupees: number | string): Paise {
  const text = typeof rupees === 'number' ? rupees.toString() : rupees.trim();
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!m) throw new RangeError(`Invalid rupee amount: "${rupees}"`);
  const paise = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  assertPaise(paise);
  return paise;
}

/** "₹4,159" or "₹41.50" (Indian digit grouping). */
export function formatPaise(paise: Paise): string {
  assertPaise(paise);
  const hasFraction = paise % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
