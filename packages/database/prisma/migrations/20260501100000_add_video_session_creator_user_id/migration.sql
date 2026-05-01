-- Add creatorUserId to video_sessions so every session records who initiated it.
ALTER TABLE "video_sessions" ADD COLUMN IF NOT EXISTS "creatorUserId" TEXT;
