-- Re-create VideoSessionStatus enum (was dropped by remove_video_consultation migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VideoSessionStatus') THEN
        CREATE TYPE "VideoSessionStatus" AS ENUM ('CREATED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED');
    END IF;
END $$;

-- Re-create video_sessions table (was dropped by remove_video_consultation migration)
CREATE TABLE IF NOT EXISTS "video_sessions" (
    "id"           TEXT NOT NULL,
    "bookingId"    TEXT NOT NULL,
    "roomId"       TEXT NOT NULL,
    "sessionToken" TEXT,
    "status"       "VideoSessionStatus" NOT NULL DEFAULT 'CREATED',
    "startedAt"    TIMESTAMP(3),
    "endedAt"      TIMESTAMP(3),
    "duration"     INTEGER,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_sessions_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "video_sessions_bookingId_key" ON "video_sessions"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "video_sessions_roomId_key"    ON "video_sessions"("roomId");
CREATE INDEX IF NOT EXISTS "video_sessions_bookingId_idx"         ON "video_sessions"("bookingId");
CREATE INDEX IF NOT EXISTS "video_sessions_status_idx"            ON "video_sessions"("status");

-- Foreign key from video_sessions → bookings
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
