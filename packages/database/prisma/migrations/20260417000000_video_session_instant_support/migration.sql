-- Make bookingId nullable to support standalone instant video sessions
ALTER TABLE "video_sessions" ALTER COLUMN "bookingId" DROP NOT NULL;

-- Add creatorUserId to track who started instant sessions
ALTER TABLE "video_sessions" ADD COLUMN IF NOT EXISTS "creatorUserId" TEXT;

-- Add index on creatorUserId for efficient provider session lookups
CREATE INDEX IF NOT EXISTS "video_sessions_creatorUserId_idx" ON "video_sessions"("creatorUserId");
