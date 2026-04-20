-- Migration 00096 — Table elio_step_configs
-- Config Élio personnalisée par étape de parcours (Story 14.1)

CREATE TABLE elio_step_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL UNIQUE REFERENCES parcours_steps(id) ON DELETE CASCADE,
  persona_name TEXT NOT NULL DEFAULT 'Élio',
  persona_description TEXT,
  system_prompt_override TEXT,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  temperature NUMERIC NOT NULL DEFAULT 1.0 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER NOT NULL DEFAULT 2000 CHECK (max_tokens >= 100 AND max_tokens <= 8000),
  custom_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE elio_step_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY elio_step_configs_select_operator ON elio_step_configs
  FOR SELECT USING (is_operator());

CREATE POLICY elio_step_configs_insert_operator ON elio_step_configs
  FOR INSERT WITH CHECK (is_operator());

CREATE POLICY elio_step_configs_update_operator ON elio_step_configs
  FOR UPDATE USING (is_operator());

CREATE POLICY elio_step_configs_delete_operator ON elio_step_configs
  FOR DELETE USING (is_operator());

CREATE TRIGGER trg_elio_step_configs_updated_at
  BEFORE UPDATE ON elio_step_configs
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

CREATE INDEX idx_elio_step_configs_step_id ON elio_step_configs(step_id);

ALTER TABLE elio_step_configs
  ADD CONSTRAINT elio_step_configs_model_check
  CHECK (model IN ('claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'));
