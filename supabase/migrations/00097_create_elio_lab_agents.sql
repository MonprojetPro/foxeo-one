-- Migration 00097 — Catalogue agents Élio Lab (Story 14.2)
-- Supprime elio_step_configs (Story 14.1 — remplacé par catalogue agents)
-- Crée elio_lab_agents pour gérer les agents Élio Lab depuis des fichiers .md

-- 1. Supprimer elio_step_configs (plus besoin — remplacé par elio_lab_agents)
DROP TABLE IF EXISTS elio_step_configs CASCADE;

-- 2. Créer la table elio_lab_agents
CREATE TABLE elio_lab_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  temperature NUMERIC NOT NULL DEFAULT 1.0 CHECK (temperature >= 0 AND temperature <= 2),
  image_path TEXT,
  file_path TEXT NOT NULL UNIQUE,
  system_prompt TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE elio_lab_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY elio_lab_agents_select_operator ON elio_lab_agents
  FOR SELECT USING (is_operator());

CREATE POLICY elio_lab_agents_insert_operator ON elio_lab_agents
  FOR INSERT WITH CHECK (is_operator());

CREATE POLICY elio_lab_agents_update_operator ON elio_lab_agents
  FOR UPDATE USING (is_operator());

CREATE POLICY elio_lab_agents_delete_operator ON elio_lab_agents
  FOR DELETE USING (is_operator());

-- 4. Trigger updated_at
CREATE TRIGGER trg_elio_lab_agents_updated_at
  BEFORE UPDATE ON elio_lab_agents
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- 5. Index
CREATE INDEX idx_elio_lab_agents_archived ON elio_lab_agents(archived);
CREATE INDEX idx_elio_lab_agents_file_path ON elio_lab_agents(file_path);
