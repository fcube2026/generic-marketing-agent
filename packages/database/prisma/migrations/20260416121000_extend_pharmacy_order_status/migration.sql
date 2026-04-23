-- Extend PharmacyOrderStatus in its own migration so later migrations can use
-- the new enum values safely on PostgreSQL/Supabase.
ALTER TYPE "PharmacyOrderStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "PharmacyOrderStatus" ADD VALUE IF NOT EXISTS 'PRESCRIPTION_REVIEW';
ALTER TYPE "PharmacyOrderStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY';
ALTER TYPE "PharmacyOrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';