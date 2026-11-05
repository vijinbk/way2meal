// Mirrors the Prisma enums so clients (mobile/admin) don't depend on @prisma/client.
export const SLOTS = ['LUNCH', 'DINNER'] as const;
export type Slot = (typeof SLOTS)[number];

export const ROLES = ['CUSTOMER', 'ADMIN', 'KITCHEN', 'DELIVERY'] as const;
export type Role = (typeof ROLES)[number];

export const PLAN_KINDS = ['TRIAL', 'DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

export const SUB_STATUSES = [
  'PENDING_PAYMENT',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
] as const;
export type SubStatus = (typeof SUB_STATUSES)[number];

export const DELIVERY_STATUSES = [
  'SCHEDULED',
  'SKIPPED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'MISSED',
  'CANCELLED',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/** Deliveries that consume a meal credit (see invariant in docs/REQUIREMENTS.md). */
export const CREDIT_CONSUMING_STATUSES: readonly DeliveryStatus[] = [
  'SCHEDULED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'MISSED',
];

export const PAYMENT_STATUSES = ['PENDING', 'SUBMITTED', 'PAID', 'REJECTED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
