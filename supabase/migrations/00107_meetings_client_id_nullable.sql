-- Migration: Allow nullable client_id in meetings (Hub-originated meetings)
-- Story: 15.2 — Migration Visio OpenVidu → Google Meet
-- Reason: Hub operator can create meetings not yet associated to a specific client

ALTER TABLE meetings
  ALTER COLUMN client_id DROP NOT NULL;

-- Update RLS: client selector should still only see their own meetings
-- (existing policy uses: client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()))
-- This still works when client_id is NULL (NULL not IN set → no row shown to client — correct)
