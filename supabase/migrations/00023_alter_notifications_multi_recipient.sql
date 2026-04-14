-- Migration: Alter notifications table for multi-recipient support
-- Story: 3.2 — Module Notifications — Infrastructure in-app & temps réel
-- Date: 2026-02-17
--
-- The notifications table was created in 00021 for operator-only alerts.
-- This migration evolves it to support both client and operator recipients,
-- adds link support, and replaces boolean read with timestamped read_at.

-- ============================================================
-- 1. ADD new columns
-- ============================================================

ALTER TABLE notifications ADD COLUMN recipient_type TEXT;
ALTER TABLE notifications ADD COLUMN recipient_id UUID;
ALTER TABLE notifications ADD COLUMN body TEXT;
ALTER TABLE notifications ADD COLUMN link TEXT;
ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;

-- ============================================================
-- 2. MIGRATE existing data
-- ============================================================

UPDATE notifications SET
  recipient_type = 'operator',
  recipient_id = operator_id,
  body = message,
  read_at = CASE WHEN read = true THEN created_at ELSE NULL END;

-- ============================================================
-- 3. ADD constraints on new columns
-- ============================================================

ALTER TABLE notifications ALTER COLUMN recipient_type SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN recipient_id SET NOT NULL;

ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_type_check
  CHECK (recipient_type IN ('client', 'operator'));

-- Expand type CHECK to include all notification types
-- Drop existing constraint if any, then add comprehensive one
DO $$
BEGIN
  -- Remove any existing check constraint on type column
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'notifications' AND column_name = 'type'
    AND constraint_name != 'notifications_pkey'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE notifications DROP CONSTRAINT ' || constraint_name
      FROM information_schema.constraint_column_usage
      WHERE table_name = 'notifications' AND column_name = 'type'
      AND constraint_name != 'notifications_pkey'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('message', 'validation', 'alert', 'system', 'graduation', 'payment', 'inactivity_alert', 'csv_import_complete'));

-- ============================================================
-- 4. DROP old RLS policies (must happen before dropping columns they reference)
-- ============================================================

DROP POLICY IF EXISTS notifications_select_operator ON notifications;
DROP POLICY IF EXISTS notifications_update_operator ON notifications;
DROP POLICY IF EXISTS notifications_insert_operator ON notifications;

-- ============================================================
-- 5. DROP old columns
-- ============================================================

ALTER TABLE notifications DROP COLUMN operator_id;
ALTER TABLE notifications DROP COLUMN message;
ALTER TABLE notifications DROP COLUMN read;
ALTER TABLE notifications DROP COLUMN entity_type;
ALTER TABLE notifications DROP COLUMN entity_id;

-- ============================================================
-- 6. DROP old indexes and create new ones
-- ============================================================

DROP INDEX IF EXISTS idx_notifications_operator_unread;
DROP INDEX IF EXISTS idx_notifications_entity;

CREATE INDEX idx_notifications_recipient_created_at
  ON notifications(recipient_id, created_at DESC);

CREATE INDEX idx_notifications_unread
  ON notifications(recipient_id, read_at) WHERE read_at IS NULL;

CREATE POLICY notifications_select_owner ON notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY notifications_update_owner ON notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid());

-- INSERT: controlled by Server Actions (service_role or authenticated)
CREATE POLICY notifications_insert_system ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 7. Enable Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- 8. Update comments
-- ============================================================

COMMENT ON TABLE notifications IS 'Notifications in-app multi-recipient (clients et opérateurs)';
COMMENT ON COLUMN notifications.recipient_type IS 'Type de destinataire: client ou operator';
COMMENT ON COLUMN notifications.recipient_id IS 'UUID du destinataire (auth.uid)';
COMMENT ON COLUMN notifications.type IS 'Type de notification: message, validation, alert, system, graduation, payment, inactivity_alert, csv_import_complete';
COMMENT ON COLUMN notifications.body IS 'Corps de la notification (optionnel)';
COMMENT ON COLUMN notifications.link IS 'URL relative de redirection (optionnel)';
COMMENT ON COLUMN notifications.read_at IS 'Date de lecture (NULL = non lue)';
