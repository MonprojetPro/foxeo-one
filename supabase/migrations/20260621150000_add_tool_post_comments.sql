-- ============================================================
-- LOT G1 suite — Module Suivi de l'outil : commentaires/réactions
-- Migration : tool_post_comments + ajout type 'tool_comment'
-- ============================================================

-- 1. Ajout du type 'tool_comment' dans notifications
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'message', 'validation', 'alert', 'system', 'graduation', 'payment',
    'inactivity_alert', 'csv_import_complete', 'success', 'info', 'warning',
    'error', 'export_ready', 'elio_escalation', 'tool_update', 'tool_comment'
  ]));

-- 2. Ajout du type 'tool_comment' dans notification_preferences
ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_notification_type_check;
ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_notification_type_check
  CHECK (notification_type = ANY (ARRAY[
    'message', 'validation', 'alert', 'system', 'graduation', 'payment',
    'inactivity_alert', 'csv_import_complete', 'tool_update', 'tool_comment'
  ]));

-- 3. Table tool_post_comments
CREATE TABLE IF NOT EXISTS tool_post_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid        NOT NULL REFERENCES tool_posts(id) ON DELETE CASCADE,
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  author_type text        NOT NULL CHECK (author_type IN ('client', 'operator')),
  author_id   uuid        NOT NULL,
  body        text        NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index performances
CREATE INDEX IF NOT EXISTS tool_post_comments_post_id_idx    ON tool_post_comments(post_id);
CREATE INDEX IF NOT EXISTS tool_post_comments_client_id_idx  ON tool_post_comments(client_id);
CREATE INDEX IF NOT EXISTS tool_post_comments_created_at_idx ON tool_post_comments(created_at ASC);

-- REPLICA IDENTITY FULL pour que le DELETE soit capturé côté client
ALTER TABLE tool_post_comments REPLICA IDENTITY FULL;

-- 4. RLS
ALTER TABLE tool_post_comments ENABLE ROW LEVEL SECURITY;

-- Le client voit les commentaires des posts de son propre parcours
CREATE POLICY "tool_post_comments_select_client"
  ON tool_post_comments FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- L'opérateur voit les commentaires des posts de ses clients
-- NB: is_operator() attend un operator_id (PAS auth.uid()) — on passe clients.operator_id
CREATE POLICY "tool_post_comments_select_operator"
  ON tool_post_comments FOR SELECT
  USING (
    client_id IN (SELECT c.id FROM clients c WHERE is_operator(c.operator_id))
  );

-- Le client insère en author_type='client' sur un post de son parcours
CREATE POLICY "tool_post_comments_insert_client"
  ON tool_post_comments FOR INSERT
  WITH CHECK (
    author_type = 'client'
    AND author_id = auth.uid()
    AND client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
    AND post_id IN (
      SELECT tp.id FROM tool_posts tp
      JOIN clients c ON c.id = tp.client_id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- L'opérateur insère en author_type='operator' sur un post de SES clients
CREATE POLICY "tool_post_comments_insert_operator"
  ON tool_post_comments FOR INSERT
  WITH CHECK (
    author_type = 'operator'
    AND author_id = auth.uid()
    AND client_id IN (SELECT c.id FROM clients c WHERE is_operator(c.operator_id))
  );

-- 5. Publication Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tool_post_comments;
