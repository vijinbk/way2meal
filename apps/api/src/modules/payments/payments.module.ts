import { Module } from '@nestjs/common';
import { AppConfig } from '../../config/env';
import { ManualPaymentProvider } from './manual-payment.provider';
import { PAYMENT_PROVIDER } from './payment-provider';

@Module({
  providers: [
    ManualPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [AppConfig, ManualPaymentProvider],
      // Phase 2: add RazorpayPaymentProvider here, selected by PAYMENT_PROVIDER.
      useFactory: (config: AppConfig, manual: ManualPaymentProvider) => {
        switch (config.env.PAYMENT_PROVIDER) {
          case 'manual':
            return manual;
        }
      },
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentsModule {}
