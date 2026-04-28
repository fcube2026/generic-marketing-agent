-- Patient KYC ML pipeline (apps/kyc-ml) — additive, backward-compatible columns
-- on patient_verifications. These were declared in schema.prisma when the
-- Python sidecar was introduced (PR #337) but the corresponding migration was
-- never generated, so production / staging databases were missing the columns.
-- Every Prisma SELECT against patient_verifications failed with
-- `column "aadhaarLast4" does not exist`, surfacing as a 500 on the patient
-- Identity Verification screen.
--
-- All columns are nullable so existing rows are unaffected. IF NOT EXISTS
-- keeps the migration idempotent in case any environment was previously
-- patched manually via `prisma db push`.
ALTER TABLE "patient_verifications"
  ADD COLUMN IF NOT EXISTS "aadhaarLast4" TEXT,
  ADD COLUMN IF NOT EXISTS "aadhaarFaceStoragePath" TEXT,
  ADD COLUMN IF NOT EXISTS "identityVerifiedAt" TIMESTAMP(3);
