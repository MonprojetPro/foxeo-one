-- Migration 00114 — RLS : un client peut lire les infos de son opérateur assigné
-- Nécessaire pour que request-abandonment.ts (Server Action client) puisse récupérer
-- l'auth_user_id de l'opérateur afin de lui envoyer une notification.
-- Sans cette policy, la query operators retourne NULL côté client → notification jamais créée.

CREATE POLICY operators_select_by_assigned_client
  ON operators
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT operator_id FROM clients WHERE auth_user_id = auth.uid()
    )
  );
