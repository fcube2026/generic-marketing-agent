-- Bring pharmacy_partners in line with the richer partner contract.
ALTER TABLE "pharmacy_partners"
ADD COLUMN IF NOT EXISTS "code" TEXT,
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;

UPDATE "pharmacy_partners"
SET "code" = CONCAT(
    LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(COALESCE(NULLIF("name", ''), NULLIF("displayName", ''), 'partner'), '[^a-zA-Z0-9]+', '-', 'g'))),
    '-',
    SUBSTRING("id" FROM 1 FOR 6)
)
WHERE "code" IS NULL OR "code" = '';

ALTER TABLE "pharmacy_partners"
ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_partners_code_key" ON "pharmacy_partners"("code");

-- Rename legacy pharmacy order columns when upgrading from the original migration.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'pharmacy_orders' AND column_name = 'patientId'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'pharmacy_orders' AND column_name = 'patientProfileId'
    ) THEN
        ALTER TABLE "pharmacy_orders" RENAME COLUMN "patientId" TO "patientProfileId";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'pharmacy_orders' AND column_name = 'partnerId'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'pharmacy_orders' AND column_name = 'pharmacyPartnerId'
    ) THEN
        ALTER TABLE "pharmacy_orders" RENAME COLUMN "partnerId" TO "pharmacyPartnerId";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_orders_patientId_fkey'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_orders_patientProfileId_fkey'
    ) THEN
        ALTER TABLE "pharmacy_orders"
        RENAME CONSTRAINT "pharmacy_orders_patientId_fkey" TO "pharmacy_orders_patientProfileId_fkey";
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_orders_partnerId_fkey'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_orders_pharmacyPartnerId_fkey'
    ) THEN
        ALTER TABLE "pharmacy_orders"
        RENAME CONSTRAINT "pharmacy_orders_partnerId_fkey" TO "pharmacy_orders_pharmacyPartnerId_fkey";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'pharmacy_orders_patientId_idx'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'pharmacy_orders_patientProfileId_idx'
    ) THEN
        ALTER INDEX "pharmacy_orders_patientId_idx" RENAME TO "pharmacy_orders_patientProfileId_idx";
    END IF;
END $$;

ALTER TABLE "pharmacy_orders"
ADD COLUMN IF NOT EXISTS "orderNumber" TEXT,
ADD COLUMN IF NOT EXISTS "deliveryAddressId" TEXT,
ADD COLUMN IF NOT EXISTS "prescriptionImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "subtotal" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "estimatedDeliveryAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);

UPDATE "pharmacy_orders"
SET "orderNumber" = CONCAT('PHARM-', UPPER(SUBSTRING("id" FROM 1 FOR 10)))
WHERE "orderNumber" IS NULL;

UPDATE "pharmacy_orders"
SET "subtotal" = "totalAmount"
WHERE "subtotal" IS NULL;

UPDATE "pharmacy_orders" AS po
SET "deliveryAddressId" = b."addressId"
FROM "bookings" AS b
WHERE po."bookingId" = b."id"
  AND po."deliveryAddressId" IS NULL
  AND b."addressId" IS NOT NULL;

UPDATE "pharmacy_orders" AS po
SET "deliveryAddressId" = resolved."id"
FROM (
    SELECT pp."id" AS "patientProfileId", addr."id"
    FROM "patient_profiles" AS pp
    JOIN LATERAL (
        SELECT a."id"
        FROM "addresses" AS a
        WHERE a."userId" = pp."userId"
        ORDER BY a."isDefault" DESC, a."createdAt" ASC
        LIMIT 1
    ) AS addr ON TRUE
) AS resolved
WHERE po."patientProfileId" = resolved."patientProfileId"
  AND po."deliveryAddressId" IS NULL;

ALTER TABLE "pharmacy_orders"
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "orderNumber" SET NOT NULL,
ALTER COLUMN "subtotal" SET NOT NULL,
ALTER COLUMN "deliveryAddressId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_orders_orderNumber_key" ON "pharmacy_orders"("orderNumber");
CREATE INDEX IF NOT EXISTS "pharmacy_orders_pharmacyPartnerId_idx" ON "pharmacy_orders"("pharmacyPartnerId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pharmacy_orders_deliveryAddressId_fkey'
    ) THEN
        ALTER TABLE "pharmacy_orders"
        ADD CONSTRAINT "pharmacy_orders_deliveryAddressId_fkey"
        FOREIGN KEY ("deliveryAddressId") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "pharmacy_orders"
DROP COLUMN IF EXISTS "deliveryAddress";

-- Upgrade order item structure to the current contract.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'pharmacy_order_items' AND column_name = 'orderId'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'pharmacy_order_items' AND column_name = 'pharmacyOrderId'
    ) THEN
        ALTER TABLE "pharmacy_order_items" RENAME COLUMN "orderId" TO "pharmacyOrderId";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'pharmacy_order_items' AND column_name = 'medicineId'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'pharmacy_order_items' AND column_name = 'medicineCode'
    ) THEN
        ALTER TABLE "pharmacy_order_items" RENAME COLUMN "medicineId" TO "medicineCode";
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_order_items_orderId_fkey'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_order_items_pharmacyOrderId_fkey'
    ) THEN
        ALTER TABLE "pharmacy_order_items"
        RENAME CONSTRAINT "pharmacy_order_items_orderId_fkey" TO "pharmacy_order_items_pharmacyOrderId_fkey";
    END IF;
END $$;

ALTER TABLE "pharmacy_order_items"
ADD COLUMN IF NOT EXISTS "dosage" TEXT,
ADD COLUMN IF NOT EXISTS "instructions" TEXT,
ADD COLUMN IF NOT EXISTS "isSubstitute" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "pharmacy_order_items"
ALTER COLUMN "medicineCode" DROP NOT NULL;