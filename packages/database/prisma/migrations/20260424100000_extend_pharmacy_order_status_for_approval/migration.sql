-- Extend PharmacyOrderStatus with approval/payment lifecycle values.
-- Must be its own migration so later migrations can reference these enum
-- values safely on PostgreSQL.
ALTER TYPE "PharmacyOrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "PharmacyOrderStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "PharmacyOrderStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "PharmacyOrderStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "PharmacyOrderStatus" ADD VALUE IF NOT EXISTS 'DISPATCHED';
