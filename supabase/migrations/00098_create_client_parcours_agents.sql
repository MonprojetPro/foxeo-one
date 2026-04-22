-- Migration 00098 — Assemblage du Parcours Client (Story 14.3)
-- Crée client_parcours_agents : composition du parcours Lab par client

CREATE TABLE client_parcours_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  elio_lab_agent_id UUID NOT NULL REFERENCES elio_lab_agents(id) ON DELETE RESTRICT,
  step_order INTEGER NOT NULL CHECK (step_order >= 1),
  step_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_client_parcours_agents_client_id ON client_parcours_agents(client_id);

-- RLS
ALTER TABLE client_parcours_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_parcours_agents_select_operator ON client_parcours_agents
  FOR SELECT USING (is_operator());

CREATE POLICY client_parcours_agents_insert_operator ON client_parcours_agents
  FOR INSERT WITH CHECK (is_operator());

CREATE POLICY client_parcours_agents_update_operator ON client_parcours_agents
  FOR UPDATE USING (is_operator());

CREATE POLICY client_parcours_agents_delete_operator ON client_parcours_agents
  FOR DELETE USING (is_operator());

-- Trigger updated_at
CREATE TRIGGER trg_client_parcours_agents_updated_at
  BEFORE UPDATE ON client_parcours_agents
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
