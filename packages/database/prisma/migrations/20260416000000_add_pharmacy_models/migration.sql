-- Create PharmacyOrderStatus enum
CREATE TYPE "PharmacyOrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- Create pharmacy_partners table
CREATE TABLE "pharmacy_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "apiBaseUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_partners_pkey" PRIMARY KEY ("id")
);

-- Create unique index on pharmacy_partners.name
CREATE UNIQUE INDEX "pharmacy_partners_name_key" ON "pharmacy_partners"("name");

-- Create pharmacy_orders table
CREATE TABLE "pharmacy_orders" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bookingId" TEXT,
    "prescriptionId" TEXT,
    "partnerId" TEXT NOT NULL,
    "partnerOrderId" TEXT,
    "status" "PharmacyOrderStatus" NOT NULL DEFAULT 'PLACED',
    "deliveryAddress" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_orders_pkey" PRIMARY KEY ("id")
);

-- Create indexes on pharmacy_orders
CREATE INDEX "pharmacy_orders_patientId_idx" ON "pharmacy_orders"("patientId");
CREATE INDEX "pharmacy_orders_status_idx" ON "pharmacy_orders"("status");
CREATE INDEX "pharmacy_orders_createdAt_idx" ON "pharmacy_orders"("createdAt");

-- Create pharmacy_order_items table
CREATE TABLE "pharmacy_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "pharmacy_order_items_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints for pharmacy_orders
ALTER TABLE "pharmacy_orders" ADD CONSTRAINT "pharmacy_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pharmacy_orders" ADD CONSTRAINT "pharmacy_orders_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pharmacy_orders" ADD CONSTRAINT "pharmacy_orders_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pharmacy_orders" ADD CONSTRAINT "pharmacy_orders_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "pharmacy_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign key constraint for pharmacy_order_items
ALTER TABLE "pharmacy_order_items" ADD CONSTRAINT "pharmacy_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pharmacy_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
