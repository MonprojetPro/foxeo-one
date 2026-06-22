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
-- ⚠️ PIÈGE : `clients` a une colonne `name`. Dans une sous-requête `FROM clients`,
-- `(storage.foldername(name))[2]` résout `name` vers clients.name (le nom du client)
-- au lieu de storage.objects.name → condition toujours fausse → upload rejeté (400).
-- On évite l'ambiguïté : `name` reste dans le contexte storage.objects (hors sous-requête),
-- comparé via IN à un SELECT aliasé qui n'expose pas de colonne `name`.
CREATE POLICY "tool_screenshots_client_comment_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tool-screenshots'
    AND (storage.foldername(name))[1] = 'comments'
    AND (storage.foldername(name))[2] IN (
      SELECT c.id::text FROM clients c WHERE c.auth_user_id = auth.uid()
    )
  );
