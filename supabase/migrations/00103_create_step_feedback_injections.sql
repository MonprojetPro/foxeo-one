-- Migration 00103_create_step_feedback_injections.sql
-- Story 14.9 — Feedback MiKL : injection texte ou questions Élio dans l'étape

CREATE TABLE step_feedback_injections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES parcours_steps(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text_feedback', 'elio_questions')),
  injected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE step_feedback_injections ENABLE ROW LEVEL SECURITY;

-- Operator : lecture et insertion complètes
CREATE POLICY step_feedback_injections_select_operator ON step_feedback_injections
  FOR SELECT USING (is_operator());

CREATE POLICY step_feedback_injections_insert_operator ON step_feedback_injections
  FOR INSERT WITH CHECK (is_operator());

-- Client : lecture de ses propres injections
CREATE POLICY step_feedback_injections_select_client ON step_feedback_injections
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- Client : marquage en lu (UPDATE read_at uniquement)
CREATE POLICY step_feedback_injections_update_client ON step_feedback_injections
  FOR UPDATE USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- Index pour les lookups step+client et les non-lus
CREATE INDEX idx_step_feedback_injections_step_client
  ON step_feedback_injections(step_id, client_id);

CREATE INDEX idx_step_feedback_injections_unread
  ON step_feedback_injections(client_id) WHERE read_at IS NULL;

-- Trigger updated_at (optionnel — pas de colonne updated_at sur cette table)
-- read_at est mis à jour directement par la policy client

COMMENT ON TABLE step_feedback_injections IS 'Injections de feedback MiKL sur une étape client : texte visible ou questions injectées dans Élio';
COMMENT ON COLUMN step_feedback_injections.type IS 'text_feedback : visible dans historique étape ; elio_questions : injecté comme message assistant dans elio_messages';
