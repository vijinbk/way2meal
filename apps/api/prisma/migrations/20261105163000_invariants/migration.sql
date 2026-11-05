-- Invariants Prisma's schema language can't express (see docs/REQUIREMENTS.md → "Key invariants").

-- A delivery belongs to exactly one of a subscription or an order.
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_exactly_one_source"
  CHECK (num_nonnulls("subscriptionId", "orderId") = 1);

-- At most one non-cancelled delivery per subscription per date
-- (a subscription already fixes user + slot).
CREATE UNIQUE INDEX "Delivery_subscription_date_active_key"
  ON "Delivery" ("subscriptionId", "date")
  WHERE "subscriptionId" IS NOT NULL AND "status" <> 'CANCELLED';

-- A payment settles exactly one subscription or order.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_exactly_one_target"
  CHECK (num_nonnulls("subscriptionId", "orderId") = 1);

-- Money is non-negative integer paise; counts are sane.
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_values_check"
  CHECK ("pricePaise" >= 0 AND "mealCount" > 0 AND "maxSkips" >= 0 AND "validityDays" > 0);
ALTER TABLE "AddOn" ADD CONSTRAINT "AddOn_values_check"
  CHECK ("pricePaise" >= 0 AND ("dailyStock" IS NULL OR "dailyStock" >= 0));
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_values_check"
  CHECK ("pricePaise" >= 0 AND "mealsTotal" > 0 AND "skipsUsed" >= 0 AND "extraCredits" >= 0
         AND ("endDate" IS NULL OR "endDate" >= "startDate"));
ALTER TABLE "DeliveryAddOn" ADD CONSTRAINT "DeliveryAddOn_values_check"
  CHECK ("pricePaise" >= 0 AND "qty" > 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_values_check" CHECK ("totalPaise" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_values_check" CHECK ("amountPaise" >= 0);
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_values_check" CHECK ("amountPaise" > 0);

-- Menu weekday is ISO (Mon = 1 … Sun = 7).
ALTER TABLE "MenuTemplate" ADD CONSTRAINT "MenuTemplate_weekday_check" CHECK ("weekday" BETWEEN 1 AND 7);
