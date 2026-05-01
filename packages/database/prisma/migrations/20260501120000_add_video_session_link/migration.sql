-- Add videoSessionLink to video_sessions so the full Jitsi meeting URL is
-- persisted alongside the sessionToken. Both patient and provider receive the
-- same link, guaranteeing they join the same room.
ALTER TABLE "video_sessions" ADD COLUMN IF NOT EXISTS "videoSessionLink" TEXT;
