-- Migration 00112 — RLS client pour client_parcours_agents
-- Permet au client de lire ses propres étapes de parcours (fix dashboard Lab)

CREATE POLICY client_parcours_agents_select_own ON client_parcours_agents
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );
