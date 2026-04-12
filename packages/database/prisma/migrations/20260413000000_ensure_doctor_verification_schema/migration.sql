-- Idempotent migration to ensure the doctor-verification schema changes are applied.
-- Uses IF NOT EXISTS throughout so this is safe to run even if the previous migration
-- (20260412000000_add_doctor_verification) was partially applied or left in a failed
-- state in _prisma_migrations.

-- Ensure NMC verification tracking fields exist on provider_licenses
ALTER TABLE "provider_licenses" ADD COLUMN IF NOT EXISTS "nmcRegistrationNumber" TEXT;
ALTER TABLE "provider_licenses" ADD COLUMN IF NOT EXISTS "stateCouncil" TEXT;
ALTER TABLE "provider_licenses" ADD COLUMN IF NOT EXISTS "yearOfAdmission" TEXT;
ALTER TABLE "provider_licenses" ADD COLUMN IF NOT EXISTS "verificationSource" TEXT;
-- Add verificationAttempts as nullable first to avoid issues with existing rows,
-- then backfill and enforce NOT NULL.
ALTER TABLE "provider_licenses" ADD COLUMN IF NOT EXISTS "verificationAttempts" INTEGER DEFAULT 0;
UPDATE "provider_licenses" SET "verificationAttempts" = 0 WHERE "verificationAttempts" IS NULL;
DO $$ BEGIN
    ALTER TABLE "provider_licenses" ALTER COLUMN "verificationAttempts" SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;
ALTER TABLE "provider_licenses" ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3);
ALTER TABLE "provider_licenses" ADD COLUMN IF NOT EXISTS "nextReverificationDue" TIMESTAMP(3);

-- Ensure audit-log table exists
CREATE TABLE IF NOT EXISTS "doctor_verification_logs" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "licenseId" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "stateCouncil" TEXT NOT NULL,
    "verificationSource" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rawRequest" JSONB,
    "rawResponse" JSONB,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_verification_logs_pkey" PRIMARY KEY ("id")
);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS "doctor_verification_logs_providerId_idx" ON "doctor_verification_logs"("providerId");
CREATE INDEX IF NOT EXISTS "doctor_verification_logs_createdAt_idx" ON "doctor_verification_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "doctor_verification_logs_providerId_createdAt_idx" ON "doctor_verification_logs"("providerId", "createdAt");

-- Ensure foreign keys exist (exception-safe via DO blocks)
DO $$ BEGIN
    ALTER TABLE "doctor_verification_logs" ADD CONSTRAINT "doctor_verification_logs_providerId_fkey"
        FOREIGN KEY ("providerId") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "doctor_verification_logs" ADD CONSTRAINT "doctor_verification_logs_licenseId_fkey"
        FOREIGN KEY ("licenseId") REFERENCES "provider_licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
