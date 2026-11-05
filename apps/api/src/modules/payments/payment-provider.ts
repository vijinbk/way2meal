import { Paise } from '@way2meal/shared';

export type PaymentRefType = 'SUBSCRIPTION' | 'ORDER';
export type PaymentVerification = 'PAID' | 'FAILED' | 'PENDING';

export interface CreateIntentInput {
  amountPaise: Paise;
  refType: PaymentRefType;
  refId: string;
}

export interface PaymentIntent {
  providerRef?: string;
  /** What the client needs to collect payment (UPI details now; Razorpay order in Phase 2). */
  instructions: object;
}

/**
 * The only seam for money movement. Phase 1: ManualPaymentProvider (customer
 * pays by UPI/cash outside the app, admin approves). Phase 2:
 * RazorpayPaymentProvider (orders, webhooks, API refunds). Callers never branch
 * on the concrete provider.
 */
export interface PaymentProvider {
  createIntent(input: CreateIntentInput): Promise<PaymentIntent>;
  verify(paymentId: string, data: unknown): Promise<PaymentVerification>;
  refund(paymentId: string, amountPaise: Paise): Promise<void>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
