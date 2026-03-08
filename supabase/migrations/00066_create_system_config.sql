-- Migration 00066: Create system_config table
-- Used for maintenance mode, health checks, and other global settings

CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_config (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('maintenance_message', '"La plateforme est en maintenance. Nous serons de retour très bientôt !"'),
  ('maintenance_estimated_duration', 'null'),
  ('health_checks', '{}');

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- SELECT is public: middleware and maintenance page need to read maintenance_mode
-- for unauthenticated users and non-operator clients
CREATE POLICY system_config_select_public ON system_config
  FOR SELECT USING (true);

-- Only operators can modify system config
CREATE POLICY system_config_update_operator ON system_config
  FOR UPDATE USING (is_operator());

-- Trigger for updated_at
CREATE TRIGGER trg_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
