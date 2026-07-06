-- ============================================================
-- Migration 20260706123000 — Table elio_hub_actions (Contrat 3, chantier Élio Hub 2026-07-06)
--
-- Garde-fou des actions de l'agent Élio Hub : toute action à effet externe
-- (message chat, email, devis, parcours, crédits coaching) crée une proposition
-- `pending` que MiKL valide/refuse depuis une carte dans le chat. Si MiKL a
-- explicitement débrayé la vérification (« sans vérif »), l'action est exécutée
-- immédiatement et tracée en `auto_executed`.
--
-- RLS : opérateur uniquement (is_operator(operator_id)).
-- Realtime : ajoutée à la publication (cartes du chat mises à jour sans reload).
-- ============================================================

CREATE TABLE elio_hub_actions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     UUID        NOT NULL REFERENCES operators(id),
  conversation_id UUID        REFERENCES elio_conversations(id) ON DELETE SET NULL,
  tool_name       TEXT        NOT NULL,
  tool_input      JSONB       NOT NULL,
  summary         TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected', 'executed', 'failed', 'auto_executed')),
  result          JSONB,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  decided_at      TIMESTAMPTZ,
  executed_at     TIMESTAMPTZ
);

COMMENT ON TABLE elio_hub_actions IS
  'Propositions d''actions de l''agent Élio Hub (garde-fou). summary = phrase lisible en français, ex : « Envoyer message chat à Dupont : "…" ».';
COMMENT ON COLUMN elio_hub_actions.tool_input IS
  'Input JSON de l''outil, avec les identifiants résolus (_resolved_client_id/_resolved_client_name) pour une exécution déterministe à la confirmation.';

CREATE INDEX idx_elio_hub_actions_conversation_id ON elio_hub_actions(conversation_id);
CREATE INDEX idx_elio_hub_actions_status ON elio_hub_actions(status);
CREATE INDEX idx_elio_hub_actions_created_at ON elio_hub_actions(created_at DESC);

-- ------------------------------------------------------------
-- RLS — opérateur uniquement (le client ne voit JAMAIS ces rows)
-- ------------------------------------------------------------
ALTER TABLE elio_hub_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY elio_hub_actions_select_operator ON elio_hub_actions
  FOR SELECT USING (is_operator(operator_id));

CREATE POLICY elio_hub_actions_insert_operator ON elio_hub_actions
  FOR INSERT WITH CHECK (is_operator(operator_id));

CREATE POLICY elio_hub_actions_update_operator ON elio_hub_actions
  FOR UPDATE USING (is_operator(operator_id))
  WITH CHECK (is_operator(operator_id));

-- ------------------------------------------------------------
-- Realtime — les cartes d'action du chat Hub se mettent à jour
-- instantanément après confirm/reject (pas de reload)
-- ------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE elio_hub_actions;
ALTER TABLE elio_hub_actions REPLICA IDENTITY FULL;
