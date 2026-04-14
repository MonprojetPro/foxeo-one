-- Migration: Fix activity_logs RLS SELECT policy
-- Story: Fix — activity_logs invisible car actor_id = operators.id ≠ auth.uid()
--
-- Problème : La policy existante vérifie actor_id = auth.uid() mais toutes les
-- actions opérateur utilisent actor_id = operators.id (UUID interne, ≠ auth.uid()).
-- Les logs s'insèrent correctement mais ne sont jamais retournés en SELECT.
--
-- Fix : Ajouter une condition basée sur entity_id (le client appartient à cet opérateur)
-- ce qui couvre tous les cas : actions opérateur, actions client, actions système.

-- Drop existing policy
DROP POLICY IF EXISTS activity_logs_select_operator ON activity_logs;

-- Recreate with correct logic:
-- Un opérateur voit tous les logs dont l'entité cible (entity_id) est un de ses clients
-- OU dont l'acteur est lui-même (via son operators.id)
-- OU dont l'acteur est un de ses clients
CREATE POLICY activity_logs_select_operator
  ON activity_logs
  FOR SELECT
  USING (
    -- Logs ciblant un client de cet opérateur (cas le plus fréquent)
    (entity_type = 'client' AND entity_id IN (
      SELECT id FROM clients WHERE operator_id = fn_get_operator_id()
    ))
    -- Logs dont l'acteur est l'opérateur lui-même (via son operators.id)
    OR actor_id IN (
      SELECT id FROM operators WHERE auth_user_id = auth.uid()
    )
    -- Logs dont l'acteur est un client de cet opérateur
    OR (actor_type = 'client' AND actor_id IN (
      SELECT id FROM clients WHERE operator_id = fn_get_operator_id()
    ))
  );

COMMENT ON POLICY activity_logs_select_operator ON activity_logs IS
  'Opérateurs voient les logs sur leurs clients (entity_id) ou dont ils sont acteurs (operators.id)';
