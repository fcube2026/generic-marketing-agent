-- Add Surepass eAadhaar validation fields to patient_verifications.
-- surepassEaadhaarRaw: raw JSON response from Surepass API (audit only).
-- eAadhaarValidatedAt: timestamp when Surepass confirmed the PDF as authentic.

ALTER TABLE "patient_verifications"
  ADD COLUMN "surepassEaadhaarRaw" JSONB,
  ADD COLUMN "eAadhaarValidatedAt" TIMESTAMP(3);
