import { FixedClock } from '../../../common/clock/clock';
import { AppConfig, parseEnv } from '../../../config/env';
import { MockOtpProvider } from './mock-otp.provider';
import { OtpOutbox } from './otp-outbox';

describe('MockOtpProvider', () => {
  it('puts sent codes in the outbox for the admin panel, newest first', async () => {
    const outbox = new OtpOutbox();
    const config = new AppConfig(
      parseEnv({
        DATABASE_URL: 'x',
        JWT_ACCESS_SECRET: 'x'.repeat(16),
        OTP_HMAC_SECRET: 'y'.repeat(16),
      }),
    );
    const provider = new MockOtpProvider(
      outbox,
      new FixedClock('2026-11-09T08:00:00+05:30'),
      config,
    );

    await provider.send('+919876543210', '111111');
    await provider.send('+919800000000', '222222');

    expect(outbox.latest().map((e) => e.code)).toEqual(['222222', '111111']);
    expect(outbox.latest()[0]?.sentAt.toISOString()).toBe('2026-11-09T02:30:00.000Z');
  });
});
