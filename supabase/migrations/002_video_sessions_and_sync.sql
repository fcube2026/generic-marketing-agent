-- ============================================================
-- Curex24 — Video Sessions + Sync mapping columns
-- Adds the video_sessions table and a source_id mapping column on
-- doctors/patients/bookings so the API can upsert Prisma records
-- (cuid string ids) into Supabase using ON CONFLICT (source_id).
-- Run this AFTER 001_doctor_portal_tables.sql.
-- ============================================================

-- ----- source_id columns for upsert mapping --------------------------------
ALTER TABLE providers ADD COLUMN IF NOT EXISTS source_id TEXT UNIQUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS source_id TEXT UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_id TEXT UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_source_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_source_id  TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_patient_source ON bookings(patient_source_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_source  ON bookings(provider_source_id);

-- Make legacy FK columns nullable so backend sync (which works by source_id)
-- can insert booking rows without a pre-resolved Supabase UUID.
ALTER TABLE bookings ALTER COLUMN patient_id DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN provider_id  DROP NOT NULL;

-- ----- video_sessions ------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       TEXT UNIQUE NOT NULL,            -- Prisma VideoSession.id
  booking_source_id TEXT,                          -- Prisma Booking.id
  room_id         TEXT NOT NULL,
  session_token   TEXT,
  status          TEXT NOT NULL DEFAULT 'CREATED'
    CHECK (status IN ('CREATED','WAITING','IN_PROGRESS','COMPLETED','FAILED','EXPIRED')),
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration        INTEGER,
  creator_user_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_sessions_booking_source ON video_sessions(booking_source_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_status         ON video_sessions(status);
CREATE INDEX IF NOT EXISTS idx_video_sessions_room           ON video_sessions(room_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE video_sessions;

-- RLS
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

-- Allow patient/provider of the linked booking to read their video session
CREATE POLICY "Participants can view their video sessions"
  ON video_sessions FOR SELECT
  USING (
    booking_source_id IN (
      SELECT source_id FROM bookings
      WHERE provider_source_id IN (SELECT source_id FROM providers WHERE user_id = auth.uid()::text)
         OR patient_source_id IN (SELECT source_id FROM patients WHERE user_id = auth.uid()::text)
    )
  );

-- updated_at trigger
CREATE TRIGGER set_updated_at_video_sessions
  BEFORE UPDATE ON video_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
