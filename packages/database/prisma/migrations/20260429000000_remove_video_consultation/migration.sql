-- Drop video_sessions table (cascades foreign key from bookings)
DROP TABLE IF EXISTS "video_sessions";

-- Drop VideoSessionStatus enum
DROP TYPE IF EXISTS "VideoSessionStatus";

-- Remove video consultation columns from provider_profiles
ALTER TABLE "provider_profiles"
  DROP COLUMN IF EXISTS "videoConsultationEnabled",
  DROP COLUMN IF EXISTS "consultationFeeVideoConsultation";
