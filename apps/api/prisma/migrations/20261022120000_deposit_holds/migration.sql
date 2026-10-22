-- Deposit holds (MVP): the customer pays through the owner's own payment link,
-- the booking waits as pending, and the owner confirms when the money arrives.
-- BookPage stores amounts and deadlines only; no payment data passes through it.

ALTER TABLE "services" ADD COLUMN "deposit_minor" INTEGER;

ALTER TABLE "booking_rules"
  ADD COLUMN "deposit_url" TEXT,
  ADD COLUMN "deposit_hold_min" INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN "deposit_refund_hours" INTEGER NOT NULL DEFAULT 24;

ALTER TABLE "bookings"
  ADD COLUMN "deposit_minor" INTEGER,
  ADD COLUMN "deposit_due_at" TIMESTAMPTZ(3),
  ADD COLUMN "deposit_paid_at" TIMESTAMPTZ(3);

CREATE INDEX "bookings_status_deposit_due_at_idx" ON "bookings"("status", "deposit_due_at");

-- ─── Hand-written: rules Prisma can't express ──────────────────────────────

ALTER TABLE "services"
  ADD CONSTRAINT "services_deposit_valid"
  CHECK ("deposit_minor" IS NULL OR ("deposit_minor" > 0 AND ("price_minor" IS NULL OR "deposit_minor" <= "price_minor")));

ALTER TABLE "booking_rules"
  ADD CONSTRAINT "booking_rules_deposit_valid"
  CHECK ("deposit_hold_min" BETWEEN 15 AND 2880 AND "deposit_refund_hours" BETWEEN 0 AND 168
         AND ("deposit_url" IS NULL OR "deposit_url" ~ '^https://'));

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_deposit_valid"
  CHECK ("deposit_minor" IS NULL OR ("deposit_minor" > 0 AND "deposit_due_at" IS NOT NULL));
