-- CreateEnum
ALTER TYPE "BookingMode" ADD VALUE IF NOT EXISTS 'VIDEO_CONSULTATION';

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VideoSessionStatus') THEN
        CREATE TYPE "VideoSessionStatus" AS ENUM ('CREATED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED');
    END IF;
END $$;

-- AlterTable
ALTER TABLE "provider_profiles"
ADD COLUMN IF NOT EXISTS "videoConsultationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "consultationFeeVideoConsultation" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "doctor_onboarding_questionnaire" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "specialization" TEXT,
    "qualification" TEXT,
    "experience" TEXT,
    "hospital" TEXT,
    "bio" TEXT,
    "home_visits" TEXT,
    "services" TEXT[] NOT NULL,
    "patient_groups" TEXT[] NOT NULL,
    "medical_equipment" TEXT[] NOT NULL,
    "emergency_cases" TEXT,
    "working_schedule" TEXT,
    "time_slots" TEXT[] NOT NULL,
    "travel_distance" TEXT,
    "payment_preference" TEXT,
    "app_comfort" TEXT,
    "online_consultations" TEXT,
    "platform_expectations" TEXT[] NOT NULL,
    "guidelines_agreement" TEXT,

    CONSTRAINT "doctor_onboarding_questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "video_sessions" (
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "video_sessions_bookingId_key" ON "video_sessions"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "video_sessions_roomId_key" ON "video_sessions"("roomId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_sessions_bookingId_idx" ON "video_sessions"("bookingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_sessions_status_idx" ON "video_sessions"("status");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'video_sessions_bookingId_fkey'
    ) THEN
        ALTER TABLE "video_sessions"
        ADD CONSTRAINT "video_sessions_bookingId_fkey"
        FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;