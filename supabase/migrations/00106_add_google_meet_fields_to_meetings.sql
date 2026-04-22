-- Migration 00106: Champs Google Meet sur la table meetings
-- Remplace session_id OpenVidu par meet_space_name + meet_uri Google Meet

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS meet_space_name TEXT,
  ADD COLUMN IF NOT EXISTS meet_uri TEXT;

COMMENT ON COLUMN meetings.meet_space_name IS 'Identifiant de l''espace Google Meet (ex: spaces/abc123)';
COMMENT ON COLUMN meetings.meet_uri IS 'Lien Google Meet partageable (ex: https://meet.google.com/abc-def-ghi)';
