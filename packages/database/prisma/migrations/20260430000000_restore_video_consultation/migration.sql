-- Restore video consultation columns to provider_profiles
ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "videoConsultationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "consultationFeeVideoConsultation" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Enable video consultation for all existing providers (staging data fix)
UPDATE "provider_profiles"
SET "videoConsultationEnabled" = true,
    "consultationFeeVideoConsultation" = CASE
      WHEN "consultationFeeHomeVisit" > 0 THEN "consultationFeeHomeVisit"
      WHEN "consultationFeeDoctorPlace" > 0 THEN "consultationFeeDoctorPlace"
      ELSE 400
    END
WHERE "videoConsultationEnabled" = false;
