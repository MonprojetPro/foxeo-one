-- Migration 00108: Drop meeting_requests table + add operator RLS on meeting_recordings
-- Story: 15.3 — Post-meeting Google Meet sync (nettoyage final)

-- 1. Drop meeting_requests (replaced by Cal.com + Chat workflows)
DROP TABLE IF EXISTS meeting_requests CASCADE;

-- 2. Add operator INSERT policy on meeting_recordings
--    (previously only service_role could insert — needed for syncMeetingResults Server Action)
CREATE POLICY meeting_recordings_insert_operator ON meeting_recordings FOR INSERT
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM meetings WHERE operator_id = auth.uid()
    )
  );

-- 3. Add operator UPDATE policy on meeting_recordings
CREATE POLICY meeting_recordings_update_operator ON meeting_recordings FOR UPDATE
  USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE operator_id = auth.uid()
    )
  )
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM meetings WHERE operator_id = auth.uid()
    )
  );
