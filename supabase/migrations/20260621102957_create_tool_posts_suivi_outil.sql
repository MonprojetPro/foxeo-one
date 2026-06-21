-- ============================================================
-- LOT G1 — Module Suivi de l'outil
-- Migration : tool_posts + bucket + ajout type 'tool_update'
-- ============================================================

-- 1. Ajout du type 'tool_update' dans notifications
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'message', 'validation', 'alert', 'system', 'graduation', 'payment',
    'inactivity_alert', 'csv_import_complete', 'success', 'info', 'warning',
    'error', 'export_ready', 'elio_escalation', 'tool_update'
  ]));

-- 2. Ajout du type 'tool_update' dans notification_preferences
ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_notification_type_check;
ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_notification_type_check
  CHECK (notification_type = ANY (ARRAY[
    'message', 'validation', 'alert', 'system', 'graduation', 'payment',
    'inactivity_alert', 'csv_import_complete', 'tool_update'
  ]));

-- 3. Table tool_posts
CREATE TABLE IF NOT EXISTS tool_posts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  operator_id   uuid        NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  title         text,
  body          text        NOT NULL,
  image_paths   text[]      NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index performances
CREATE INDEX IF NOT EXISTS tool_posts_client_id_idx     ON tool_posts(client_id);
CREATE INDEX IF NOT EXISTS tool_posts_operator_id_idx   ON tool_posts(operator_id);
CREATE INDEX IF NOT EXISTS tool_posts_created_at_idx    ON tool_posts(created_at DESC);

-- Trigger updated_at (fn_update_updated_at existe déjà depuis migration 00006)
CREATE TRIGGER tool_posts_updated_at
  BEFORE UPDATE ON tool_posts
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- 4. RLS
ALTER TABLE tool_posts ENABLE ROW LEVEL SECURITY;

-- Client : voit uniquement ses propres posts
CREATE POLICY tool_posts_select_client ON tool_posts
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Opérateur : voit les posts qu'il a créés
CREATE POLICY tool_posts_select_operator ON tool_posts
  FOR SELECT USING (is_operator(operator_id));

-- Opérateur : crée un post
CREATE POLICY tool_posts_insert_operator ON tool_posts
  FOR INSERT WITH CHECK (is_operator(operator_id));

-- Opérateur : modifie ses propres posts
CREATE POLICY tool_posts_update_operator ON tool_posts
  FOR UPDATE USING (is_operator(operator_id));

-- Opérateur : supprime ses propres posts
CREATE POLICY tool_posts_delete_operator ON tool_posts
  FOR DELETE USING (is_operator(operator_id));

-- 5. Publication Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tool_posts;

-- REPLICA IDENTITY FULL pour que le DELETE soit capturé côté client
ALTER TABLE tool_posts REPLICA IDENTITY FULL;

-- 6. Bucket tool-screenshots (Storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tool-screenshots',
  'tool-screenshots',
  false,
  5242880,  -- 5 MB max par image
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Policies Storage — opérateur : upload/download/delete
CREATE POLICY "tool_screenshots_operator_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tool-screenshots'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM operators WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "tool_screenshots_operator_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'tool-screenshots'
    AND auth.role() = 'authenticated'
    AND (
      EXISTS (SELECT 1 FROM operators WHERE auth_user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM clients c
        JOIN tool_posts tp ON tp.client_id = c.id
        WHERE c.auth_user_id = auth.uid()
          AND storage.objects.name LIKE '%' || c.id::text || '%'
      )
    )
  );

CREATE POLICY "tool_screenshots_operator_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tool-screenshots'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM operators WHERE auth_user_id = auth.uid()
    )
  );
