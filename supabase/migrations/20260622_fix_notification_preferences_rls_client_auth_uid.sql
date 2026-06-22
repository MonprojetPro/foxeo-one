-- Migration: Fix RLS notification_preferences — client policies
-- Cause prouvée : is_owner(user_id) attend clients.id, mais le code stocke
--   user_id = auth_user_id (auth.uid()). Les clients ne peuvent donc ni lire
--   ni écrire leurs propres préférences (INSERT/UPDATE rejetés, table vide).
-- Fix : remplacer is_owner(user_id) par user_id = auth.uid() dans les 3
--   policies client. Les policies operator restent inchangées.
--
-- IMPORTANT : user_id dans notification_preferences = auth_user_id (auth.uid()),
--   PAS clients.id. Ne jamais passer clients.id dans ce champ côté client.

-- Recréer la policy SELECT fusionnée (merge perf migration 20260605081321)
DROP POLICY IF EXISTS notification_preferences_select_merged ON notification_preferences;
CREATE POLICY notification_preferences_select_merged
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (
    -- Client : voit ses propres préférences (user_id = auth.uid())
    (user_type = 'client' AND user_id = auth.uid())
    OR
    -- Opérateur : voit ses propres préférences
    (user_type = 'operator' AND EXISTS (
      SELECT 1 FROM operators
      WHERE operators.id = notification_preferences.user_id
        AND operators.auth_user_id = (SELECT auth.uid())
    ))
    OR
    -- Opérateur : voit les préférences de ses clients (pour override)
    (user_type = 'client' AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = notification_preferences.user_id
        AND is_operator(clients.operator_id)
    ))
  );

DROP POLICY IF EXISTS notification_preferences_insert_merged ON notification_preferences;
CREATE POLICY notification_preferences_insert_merged
  ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_type = 'client' AND user_id = auth.uid())
    OR
    (user_type = 'operator' AND EXISTS (
      SELECT 1 FROM operators
      WHERE operators.id = notification_preferences.user_id
        AND operators.auth_user_id = (SELECT auth.uid())
    ))
    OR
    (user_type = 'client' AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = notification_preferences.user_id
        AND is_operator(clients.operator_id)
    ))
  );

DROP POLICY IF EXISTS notification_preferences_update_merged ON notification_preferences;
CREATE POLICY notification_preferences_update_merged
  ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (
    (user_type = 'client' AND user_id = auth.uid())
    OR
    (user_type = 'operator' AND EXISTS (
      SELECT 1 FROM operators
      WHERE operators.id = notification_preferences.user_id
        AND operators.auth_user_id = (SELECT auth.uid())
    ))
    OR
    (user_type = 'client' AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = notification_preferences.user_id
        AND is_operator(clients.operator_id)
    ))
  )
  WITH CHECK (
    (user_type = 'client' AND user_id = auth.uid())
    OR
    (user_type = 'operator' AND EXISTS (
      SELECT 1 FROM operators
      WHERE operators.id = notification_preferences.user_id
        AND operators.auth_user_id = (SELECT auth.uid())
    ))
    OR
    (user_type = 'client' AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = notification_preferences.user_id
        AND is_operator(clients.operator_id)
    ))
  );
