-- ============================================================
-- Curex24 — Add video_session_link to video_sessions
-- Stores the full Jitsi meeting URL so both patient and provider
-- receive the same joinable link from the database.
-- ============================================================

ALTER TABLE video_sessions ADD COLUMN IF NOT EXISTS video_session_link TEXT;
