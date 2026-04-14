-- Migration 00077 — Gmail integrations (Story 3.9)
-- Stocke les tokens OAuth Gmail par opérateur

CREATE TABLE IF NOT EXISTS gmail_integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_email     TEXT NOT NULL,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  token_expiry    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un opérateur = une intégration Gmail
CREATE UNIQUE INDEX gmail_integrations_operator_idx ON gmail_integrations(operator_id);

-- Trigger updated_at
CREATE TRIGGER trg_gmail_integrations_updated_at
  BEFORE UPDATE ON gmail_integrations
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- RLS : chaque opérateur ne voit que ses propres tokens
ALTER TABLE gmail_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY gmail_integrations_select_owner ON gmail_integrations
  FOR SELECT USING (operator_id = auth.uid());

CREATE POLICY gmail_integrations_insert_owner ON gmail_integrations
  FOR INSERT WITH CHECK (operator_id = auth.uid());

CREATE POLICY gmail_integrations_update_owner ON gmail_integrations
  FOR UPDATE USING (operator_id = auth.uid());

CREATE POLICY gmail_integrations_delete_owner ON gmail_integrations
  FOR DELETE USING (operator_id = auth.uid());
