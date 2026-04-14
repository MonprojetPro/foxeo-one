-- Migration 00053: Add 'abandoned' status to parcours + abandonment_reason column
-- Story 9.3 — Demande d'abandon de parcours Lab par le client

-- ============================================================
-- UPDATE CHECK CONSTRAINT: add 'abandoned' to parcours status
-- ============================================================

ALTER TABLE parcours DROP CONSTRAINT IF EXISTS parcours_status_check;
ALTER TABLE parcours ADD CONSTRAINT parcours_status_check
  CHECK (status IN ('en_cours', 'suspendu', 'termine', 'abandoned'));

-- ============================================================
-- ADD COLUMN: abandonment_reason (optional text from client, max 1000 chars)
-- ============================================================

ALTER TABLE parcours
  ADD COLUMN IF NOT EXISTS abandonment_reason VARCHAR(1000);

-- ============================================================
-- INDEX: parcours status + client_id for filtering abandoned parcours
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_parcours_status_client ON parcours(status, client_id);

-- ============================================================
-- RLS: client can update own parcours for abandonment ONLY
-- Restricted: client can only set status to 'abandoned' and update abandonment_reason
-- Full updates (reactivation etc.) go through operator RLS policies (00017)
-- ============================================================

DROP POLICY IF EXISTS parcours_update_owner ON parcours;
DROP POLICY IF EXISTS parcours_select_owner ON parcours;

CREATE POLICY parcours_update_owner
  ON parcours
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
    AND status IN ('abandoned')
  );

-- Client can read own parcours
CREATE POLICY parcours_select_owner
  ON parcours
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );
