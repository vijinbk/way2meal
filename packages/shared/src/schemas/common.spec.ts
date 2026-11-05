import { isoDateSchema, otpCodeSchema, phoneSchema } from './common';
import { settingSchemas } from './settings';

describe('schemas', () => {
  it.each(['9876543210', '09876543210', '919876543210', '+91 98765 43210', '+91-98765-43210'])(
    'normalises phone %s to E.164',
    (input) => {
      expect(phoneSchema.parse(input)).toBe('+919876543210');
    },
  );

  it.each(['12345', '5876543210', '+1 415 555 0100', 'abcdefghij'])('rejects phone %s', (input) => {
    expect(phoneSchema.safeParse(input).success).toBe(false);
  });

  it('validates OTP codes and dates', () => {
    expect(otpCodeSchema.safeParse('123456').success).toBe(true);
    expect(otpCodeSchema.safeParse('12345').success).toBe(false);
    expect(otpCodeSchema.safeParse('1234567890').success).toBe(true);
    expect(otpCodeSchema.safeParse('1234567890123').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false);
  });

  it('validates cutoff settings', () => {
    expect(settingSchemas.cutoffs.safeParse({ LUNCH: '10:00', DINNER: '14:00' }).success).toBe(
      true,
    );
    expect(settingSchemas.cutoffs.safeParse({ LUNCH: '10am', DINNER: '14:00' }).success).toBe(
      false,
    );
  });
});
