-- Set videoConsultationEnabled default to true so all new providers are video-enabled by default.
-- Also ensure all existing providers are set to true (video consultation is a default capability).
ALTER TABLE "provider_profiles"
  ALTER COLUMN "videoConsultationEnabled" SET DEFAULT true;

UPDATE "provider_profiles"
SET "videoConsultationEnabled" = true
WHERE "videoConsultationEnabled" = false;
