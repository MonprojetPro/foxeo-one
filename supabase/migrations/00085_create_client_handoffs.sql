-- Migration 00085 — Story 13.1: Kit de sortie client
-- Creates client_handoffs table for tracking handoff orchestration
-- Adds 'subscription_cancelled' and 'handed_off' to clients.status

-- 1. Create client_handoffs table
CREATE TABLE client_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  handoff_type TEXT NOT NULL
    CHECK (handoff_type IN ('subscription_cancelled', 'one_shot')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'vercel_provisioning',
      'github_provisioning',
      'supabase_provisioning',
      'data_migration',
      'build_push',
      'deployment',
      'finalizing',
      'completed',
      'failed'
    )),
  current_step TEXT,
  vercel_project_id TEXT,
  github_repo_url TEXT,
  supabase_project_url TEXT,
  supabase_url TEXT,
  supabase_anon_key TEXT,
  supabase_service_role_key TEXT, -- TODO: encrypt via Supabase Vault in production
  error_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_handoffs_client_id ON client_handoffs(client_id);
CREATE INDEX idx_client_handoffs_status ON client_handoffs(status);

-- Trigger updated_at
CREATE TRIGGER trg_client_handoffs_updated_at
  BEFORE UPDATE ON client_handoffs
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- 2. RLS
ALTER TABLE client_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_handoffs_select_operator"
  ON client_handoffs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_handoffs.client_id
        AND clients.operator_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "client_handoffs_insert_operator"
  ON client_handoffs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_handoffs.client_id
        AND clients.operator_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "client_handoffs_update_operator"
  ON client_handoffs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_handoffs.client_id
        AND clients.operator_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "client_handoffs_delete_admin"
  ON client_handoffs FOR DELETE
  USING (is_admin());

-- 3. Update clients.status constraint to include subscription_cancelled + handed_off
-- Also restore 'prospect' (lost in migration 00058)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check
  CHECK (status IN ('active', 'suspended', 'archived', 'deleted', 'prospect', 'subscription_cancelled', 'handed_off'));

COMMENT ON TABLE client_handoffs IS 'Tracks kit de sortie orchestration steps for client handoff';
COMMENT ON COLUMN client_handoffs.handoff_type IS 'subscription_cancelled = résiliation, one_shot = livraison ponctuelle';
COMMENT ON COLUMN client_handoffs.error_log IS 'JSON array of {step, error, timestamp} entries';
