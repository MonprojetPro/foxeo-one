-- Migration 00104 — Table elio_token_usage (Story 14.11)
-- Tracking de la consommation tokens Élio par conversation/agent/client

CREATE TABLE elio_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  elio_lab_agent_id UUID REFERENCES elio_lab_agents(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES elio_conversations(id) ON DELETE SET NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  cost_eur NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS : opérateur uniquement
ALTER TABLE elio_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY elio_token_usage_select_operator ON elio_token_usage
  FOR SELECT USING (is_operator());

CREATE POLICY elio_token_usage_insert_operator ON elio_token_usage
  FOR INSERT WITH CHECK (is_operator());

-- Table d'audit financier — immuable par RLS (ni UPDATE ni DELETE autorisés)
CREATE POLICY elio_token_usage_no_update ON elio_token_usage FOR UPDATE USING (false);
CREATE POLICY elio_token_usage_no_delete ON elio_token_usage FOR DELETE USING (false);

-- Index pour les requêtes d'agrégation temporelle et par entité
CREATE INDEX idx_elio_token_usage_created_at ON elio_token_usage(created_at);
CREATE INDEX idx_elio_token_usage_client_id ON elio_token_usage(client_id);
CREATE INDEX idx_elio_token_usage_agent_id ON elio_token_usage(elio_lab_agent_id);
CREATE INDEX idx_elio_token_usage_model ON elio_token_usage(model);
