import { Injectable, Logger } from '@nestjs/common';
import { Clock } from '../../../common/clock/clock';
import { AppConfig } from '../../../config/env';
import { OtpOutbox } from './otp-outbox';
import { OtpProvider } from './otp-provider';

/** Phase 1 OTP "delivery": shows the code in the admin panel; logs it outside production. */
@Injectable()
export class MockOtpProvider implements OtpProvider {
  private readonly logger = new Logger(MockOtpProvider.name);

  constructor(
    private readonly outbox: OtpOutbox,
    private readonly clock: Clock,
    private readonly config: AppConfig,
  ) {}

  async send(phone: string, code: string): Promise<void> {
    this.outbox.add({ phone, code, sentAt: this.clock.now() });
    if (!this.config.isProduction) {
      this.logger.log(`OTP for ${phone}: ${code}`);
    }
  }
}
