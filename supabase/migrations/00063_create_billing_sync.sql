-- Migration: 00063_create_billing_sync.sql
-- Story: 11.2 — Edge Function billing-sync — Table miroir Pennylane

CREATE TABLE billing_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('quote','invoice','subscription','customer')),
  pennylane_id TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  status TEXT NOT NULL,
  data JSONB NOT NULL,
  amount INTEGER,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, pennylane_id)
);

CREATE INDEX idx_billing_sync_client ON billing_sync(client_id);
CREATE INDEX idx_billing_sync_type_status ON billing_sync(entity_type, status);

ALTER TABLE billing_sync ENABLE ROW LEVEL SECURITY;

-- Opérateur : accès complet
CREATE POLICY billing_sync_select_operator ON billing_sync
  FOR SELECT USING (is_operator());

-- Client : accès à ses propres données uniquement
CREATE POLICY billing_sync_select_owner ON billing_sync
  FOR SELECT USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- Trigger updated_at (fn_update_updated_at défini dans 00006)
CREATE TRIGGER trg_billing_sync_updated_at
  BEFORE UPDATE ON billing_sync
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- Table de tracking de l'état de sync (workaround : system_config créée en 12.1)
-- Stocke le dernier sync par entity_type pour le polling incrémental
CREATE TABLE billing_sync_state (
  entity_type TEXT PRIMARY KEY,
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() - INTERVAL '4 weeks'),
  consecutive_errors INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE billing_sync_state ENABLE ROW LEVEL SECURITY;

-- Opérateur : lecture seule (écriture via SERVICE_ROLE_KEY dans Edge Function)
CREATE POLICY billing_sync_state_select_operator ON billing_sync_state
  FOR SELECT USING (is_operator());

-- Trigger updated_at sur billing_sync_state
CREATE TRIGGER trg_billing_sync_state_updated_at
  BEFORE UPDATE ON billing_sync_state
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- Seed des entity_types
INSERT INTO billing_sync_state (entity_type) VALUES
  ('invoice'),
  ('customer'),
  ('quote'),
  ('subscription');

-- pg_cron : toutes les 5 minutes
-- NOTE: Remplacer <SUPABASE_URL> et <SERVICE_ROLE_KEY> par les valeurs réelles lors du déploiement
-- Voir supabase/functions/billing-sync/README.md pour la configuration
-- SELECT cron.schedule(
--   'billing-sync-cron',
--   '*/5 * * * *',
--   $$SELECT net.http_post(
--     url:='<SUPABASE_URL>/functions/v1/billing-sync',
--     headers:='{"Authorization":"Bearer <SERVICE_ROLE_KEY>","Content-Type":"application/json"}'::jsonb,
--     body:='{}'::jsonb
--   )$$
-- );
