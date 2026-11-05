import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Paise, assertPaise } from '@way2meal/shared';
import { z } from 'zod';
import { SettingsService } from '../settings/settings.service';
import {
  CreateIntentInput,
  PaymentIntent,
  PaymentProvider,
  PaymentVerification,
} from './payment-provider';

/** What the admin submits when reviewing a manual payment. */
export const manualVerificationSchema = z.object({ decision: z.enum(['APPROVE', 'REJECT']) });

export interface ManualPaymentInstructions {
  method: 'UPI_MANUAL';
  amountPaise: Paise;
  vpa: string;
  payeeName: string;
  qrImageUrl: string | null;
  /** upi://pay deep link so the app can open the customer's UPI app with the amount filled in. */
  upiUri: string;
  /** Short reference the customer should put in the UPI note. */
  reference: string;
}

/**
 * Phase 1 payments: show the kitchen's UPI details from settings; the admin's
 * approval *is* the verification; refunds are paid outside the app and
 * recorded by the admin, so `refund` has nothing to call.
 */
@Injectable()
export class ManualPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(ManualPaymentProvider.name);

  constructor(private readonly settings: SettingsService) {}

  async createIntent({ amountPaise, refType, refId }: CreateIntentInput): Promise<PaymentIntent> {
    assertPaise(amountPaise);
    const upi = await this.settings.get('upi');
    if (!upi.vpa) {
      throw new ServiceUnavailableException(
        'UPI payment details are not configured yet. Please contact the kitchen.',
      );
    }
    const reference = `W2M-${refType === 'SUBSCRIPTION' ? 'S' : 'O'}-${refId.slice(-8).toUpperCase()}`;
    const params = new URLSearchParams({
      pa: upi.vpa,
      pn: upi.payeeName,
      am: (amountPaise / 100).toFixed(2),
      cu: 'INR',
      tn: reference,
    });
    const instructions: ManualPaymentInstructions = {
      method: 'UPI_MANUAL',
      amountPaise,
      vpa: upi.vpa,
      payeeName: upi.payeeName,
      qrImageUrl: upi.qrImageUrl,
      upiUri: `upi://pay?${params.toString()}`,
      reference,
    };
    return { instructions };
  }

  async verify(_paymentId: string, data: unknown): Promise<PaymentVerification> {
    const parsed = manualVerificationSchema.safeParse(data);
    if (!parsed.success)
      throw new BadRequestException('Manual verification needs { decision: APPROVE | REJECT }');
    return parsed.data.decision === 'APPROVE' ? 'PAID' : 'FAILED';
  }

  async refund(paymentId: string, amountPaise: Paise): Promise<void> {
    assertPaise(amountPaise);
    this.logger.log(
      `Manual refund of ${amountPaise} paise for payment ${paymentId} — settled outside the app`,
    );
  }
}
