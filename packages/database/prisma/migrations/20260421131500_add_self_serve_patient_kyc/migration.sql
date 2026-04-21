-- Self-serve patient KYC: extend patient_verifications with personal /
-- address / selfie / guardian fields collected by the new profile-launched
-- wizard.
ALTER TABLE "patient_verifications"
  ADD COLUMN "guardianAadhaarLast4" TEXT,
  ADD COLUMN "fullName" TEXT,
  ADD COLUMN "dateOfBirth" TIMESTAMP(3),
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "addressLine" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "pincode" TEXT,
  ADD COLUMN "addressLat" DOUBLE PRECISION,
  ADD COLUMN "addressLng" DOUBLE PRECISION,
  ADD COLUMN "addressSource" TEXT,
  ADD COLUMN "selfieStoragePath" TEXT,
  ADD COLUMN "faceMatchPassed" BOOLEAN,
  ADD COLUMN "ocrMatchPassed" BOOLEAN,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "autoApprovedAt" TIMESTAMP(3);
