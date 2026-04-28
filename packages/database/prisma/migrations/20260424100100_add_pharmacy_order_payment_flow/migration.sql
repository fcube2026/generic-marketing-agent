-- Backward-compatible additions for the prescription-only / approval-payment flow.
-- All new columns are nullable or have safe defaults so existing rows are unaffected.

-- 1. New enum: payment status
DO $$ BEGIN
  CREATE TYPE "PharmacyOrderPaymentStatus" AS ENUM ('UNPAID', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. pharmacy_orders: relax NOT NULL on partner + pricing for prescription-only orders
ALTER TABLE "pharmacy_orders"
  ALTER COLUMN "pharmacyPartnerId" DROP NOT NULL,
  ALTER COLUMN "subtotal" DROP NOT NULL,
  ALTER COLUMN "deliveryFee" DROP NOT NULL,
  ALTER COLUMN "totalAmount" DROP NOT NULL;

-- 3. pharmacy_orders: drop existing default on deliveryFee since column is now nullable
ALTER TABLE "pharmacy_orders"
  ALTER COLUMN "deliveryFee" DROP DEFAULT;

-- 4. New columns
ALTER TABLE "pharmacy_orders"
  ADD COLUMN IF NOT EXISTS "prescriptionUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentStatus" "PharmacyOrderPaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- 5. Backfill existing rows: legacy orders are considered PAID
-- (they were created via the original synchronous payment flow).
UPDATE "pharmacy_orders"
SET "paymentStatus" = 'PAID'
WHERE "paymentStatus" = 'UNPAID'
  AND "totalAmount" IS NOT NULL
  AND "totalAmount" > 0;
