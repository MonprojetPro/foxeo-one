-- Migration 00086 — Story 13.2: Kit de sortie Lab
-- Creates client_lab_exports table for tracking Lab exit kit exports
-- Adds 'archived_lab' to clients.status constraint

-- 1. Create client_lab_exports table
CREATE TABLE client_lab_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  zip_url TEXT NOT NULL,
  document_count INTEGER NOT NULL DEFAULT 0,
  brief_count INTEGER NOT NULL DEFAULT 0,
  chat_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  downloaded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_lab_exports_client_id ON client_lab_exports(client_id);

-- Trigger updated_at
CREATE TRIGGER trg_client_lab_exports_updated_at
  BEFORE UPDATE ON client_lab_exports
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- 2. RLS
ALTER TABLE client_lab_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_lab_exports_select_operator_or_owner"
  ON client_lab_exports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_lab_exports.client_id
        AND (clients.operator_id = auth.uid() OR clients.auth_user_id = auth.uid())
    )
    OR is_admin()
  );

CREATE POLICY "client_lab_exports_insert_operator"
  ON client_lab_exports FOR INSERT
  WITH CHECK (is_operator());

CREATE POLICY "client_lab_exports_update_operator"
  ON client_lab_exports FOR UPDATE
  USING (is_operator());

-- 3. Add archived_lab to clients.status constraint
-- Consolidate with all statuses including 13.1 additions
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check
  CHECK (status IN ('active', 'suspended', 'archived', 'deleted', 'prospect', 'subscription_cancelled', 'handed_off', 'archived_lab'));

COMMENT ON TABLE client_lab_exports IS 'Tracks Lab exit kit ZIP exports for clients leaving without graduation';
COMMENT ON COLUMN client_lab_exports.zip_url IS 'Signed URL to the ZIP file in Supabase Storage (expires after 14 days)';
