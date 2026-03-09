-- Migration 00068: Create P2 integration tables (outgoing_webhooks, api_keys)
-- Story 12.5b: Preparation integrations P2 — Webhooks & API
-- Tables created empty, ready for Phase 2 implementation

CREATE TABLE outgoing_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_outgoing_webhooks_updated_at
  BEFORE UPDATE ON outgoing_webhooks
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TRIGGER trg_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

ALTER TABLE outgoing_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY outgoing_webhooks_select_operator ON outgoing_webhooks
  FOR SELECT USING (is_operator());
CREATE POLICY outgoing_webhooks_insert_operator ON outgoing_webhooks
  FOR INSERT WITH CHECK (is_operator());
CREATE POLICY outgoing_webhooks_update_operator ON outgoing_webhooks
  FOR UPDATE USING (is_operator());
CREATE POLICY outgoing_webhooks_delete_operator ON outgoing_webhooks
  FOR DELETE USING (is_operator());

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_select_operator ON api_keys
  FOR SELECT USING (is_operator());
CREATE POLICY api_keys_insert_operator ON api_keys
  FOR INSERT WITH CHECK (is_operator());
CREATE POLICY api_keys_update_operator ON api_keys
  FOR UPDATE USING (is_operator());
CREATE POLICY api_keys_delete_operator ON api_keys
  FOR DELETE USING (is_operator());
CREATE POLICY api_keys_select_owner ON api_keys
  FOR SELECT USING (client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid()));
