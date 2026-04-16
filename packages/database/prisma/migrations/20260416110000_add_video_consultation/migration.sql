-- Add VIDEO_CONSULTATION to BookingMode enum
ALTER TYPE "BookingMode" ADD VALUE 'VIDEO_CONSULTATION';

-- Add video consultation fields to provider_profiles
ALTER TABLE "provider_profiles"
  ADD COLUMN "videoConsultationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consultationFeeVideoConsultation" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Create VideoSessionStatus enum
CREATE TYPE "VideoSessionStatus" AS ENUM ('CREATED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED');

-- Create video_sessions table
CREATE TABLE "video_sessions" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "sessionToken" TEXT,
    "status" "VideoSessionStatus" NOT NULL DEFAULT 'CREATED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_sessions_pkey" PRIMARY KEY ("id")
);

-- Create unique and index constraints on video_sessions
CREATE UNIQUE INDEX "video_sessions_bookingId_key" ON "video_sessions"("bookingId");
CREATE UNIQUE INDEX "video_sessions_roomId_key" ON "video_sessions"("roomId");
CREATE INDEX "video_sessions_bookingId_idx" ON "video_sessions"("bookingId");
CREATE INDEX "video_sessions_status_idx" ON "video_sessions"("status");

-- Add foreign key for video_sessions → bookings
ALTER TABLE "video_sessions"
  ADD CONSTRAINT "video_sessions_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
