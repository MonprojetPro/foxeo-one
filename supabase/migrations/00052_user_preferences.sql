-- Migration: Create user_preferences table + RLS for client_instances client select
-- Story: 9.2 — Graduation Lab vers One — Notification client & activation accès One

-- ============================================================
-- 1. Create user_preferences table
-- ============================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  show_graduation_screen BOOLEAN NOT NULL DEFAULT false,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No index needed: client_id is already the PRIMARY KEY

CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_updated_at();

COMMENT ON TABLE user_preferences IS 'Préférences locales client — show_graduation_screen, etc.';
COMMENT ON COLUMN user_preferences.show_graduation_screen IS 'Afficher l''ecran de graduation au prochain chargement (Story 9.2)';

-- ============================================================
-- 2. RLS policies for user_preferences
-- ============================================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_preferences_select_owner
  ON user_preferences FOR SELECT
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY user_preferences_insert_owner
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY user_preferences_update_owner
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    OR is_admin()
  );

-- ============================================================
-- 3. Add SELECT policy for clients to read their own instance
--    (needed for middleware redirect to One instance URL)
-- ============================================================

CREATE POLICY client_instances_select_owner
  ON client_instances FOR SELECT
  TO authenticated
  USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_instances.client_id
        AND clients.operator_id IN (
          SELECT id FROM operators WHERE auth_user_id = auth.uid()
        )
    )
    OR is_admin()
  );
