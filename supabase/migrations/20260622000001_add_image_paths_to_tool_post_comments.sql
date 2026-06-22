-- ============================================================
-- LOT G1 — Module Suivi de l'outil
-- Ajout : colonne image_paths sur tool_post_comments
--         + policy Storage pour upload client (commentaires)
-- ============================================================

-- 1. Colonne image_paths sur tool_post_comments
ALTER TABLE tool_post_comments
  ADD COLUMN IF NOT EXISTS image_paths text[] NOT NULL DEFAULT '{}';

-- 2. Policy Storage INSERT — client peut uploader dans comments/{clientId}/...
--    Chemin attendu : comments/{clientId}/{uuid}.ext
--    Le 2e segment du chemin = clientId, que l'on vérifie contre la table clients
CREATE POLICY "tool_screenshots_client_comment_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tool-screenshots'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'comments'
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE auth_user_id = auth.uid()
        AND id::text = (storage.foldername(name))[2]
    )
  );
