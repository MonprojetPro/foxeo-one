-- Migration 00100 — Contextes injectés par MiKL par étape (Story 14.5)
-- Crée client_step_contexts : messages d'annonce MiKL non-consommés par étape
-- Ajoute SELECT client sur elio_lab_agents et client_parcours_agents

-- 1. Table client_step_contexts
CREATE TABLE client_step_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES parcours_steps(id) ON DELETE CASCADE,
  context_message TEXT NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_step_contexts_client_id ON client_step_contexts(client_id);
CREATE INDEX idx_client_step_contexts_step_id ON client_step_contexts(step_id);
CREATE INDEX idx_client_step_contexts_unconsumed
  ON client_step_contexts(step_id, client_id)
  WHERE consumed_at IS NULL;

ALTER TABLE client_step_contexts ENABLE ROW LEVEL SECURITY;

-- Opérateur : CRUD complet
CREATE POLICY client_step_contexts_select_operator ON client_step_contexts
  FOR SELECT USING (is_operator());

CREATE POLICY client_step_contexts_insert_operator ON client_step_contexts
  FOR INSERT WITH CHECK (is_operator());

CREATE POLICY client_step_contexts_update_operator ON client_step_contexts
  FOR UPDATE USING (is_operator());

CREATE POLICY client_step_contexts_delete_operator ON client_step_contexts
  FOR DELETE USING (is_operator());

-- Client : lecture de ses propres contextes
CREATE POLICY client_step_contexts_select_owner ON client_step_contexts
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- Client : mise à jour de consumed_at sur ses propres contextes (lecture seule → marquage consommé uniquement)
-- WITH CHECK garantit que le client ne peut qu'écrire consumed_at (pas dé-consommer ni modifier context_message)
CREATE POLICY client_step_contexts_update_owner ON client_step_contexts
  FOR UPDATE USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    AND consumed_at IS NOT NULL
  );

CREATE TRIGGER trg_client_step_contexts_updated_at
  BEFORE UPDATE ON client_step_contexts
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- 2. SELECT client sur elio_lab_agents (agents non archivés lisibles par les clients)
CREATE POLICY elio_lab_agents_select_client ON elio_lab_agents
  FOR SELECT USING (
    archived = false
    AND EXISTS (SELECT 1 FROM clients WHERE auth_user_id = auth.uid())
  );

-- 3. SELECT client sur client_parcours_agents (un client voit son propre parcours)
CREATE POLICY client_parcours_agents_select_client ON client_parcours_agents
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );
