-- Migration 00113 — RLS client INSERT sur parcours (abandon nouveau système)
-- Permet au client de créer un enregistrement parcours quand il abandonne
-- dans le nouveau système (client_parcours_agents) où aucun row parcours n'existe encore.
-- Restriction : status doit être 'abandoned' (seul cas d'usage autorisé côté client).

CREATE POLICY parcours_insert_owner ON parcours
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
    AND status = 'abandoned'
  );
