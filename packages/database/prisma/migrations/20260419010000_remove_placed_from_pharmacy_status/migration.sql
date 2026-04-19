-- Normalize legacy pharmacy rows before removing the deprecated enum value.
UPDATE "pharmacy_orders"
SET "status" = 'PENDING'
WHERE "status" = 'PLACED';

ALTER TYPE "PharmacyOrderStatus" RENAME TO "PharmacyOrderStatus_old";

CREATE TYPE "PharmacyOrderStatus" AS ENUM (
  'PENDING',
  'PRESCRIPTION_REVIEW',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED'
);

ALTER TABLE "pharmacy_orders"
ALTER COLUMN "status" TYPE "PharmacyOrderStatus"
USING ("status"::text::"PharmacyOrderStatus");

ALTER TABLE "pharmacy_orders"
ALTER COLUMN "status" SET DEFAULT 'PENDING';

DROP TYPE "PharmacyOrderStatus_old";