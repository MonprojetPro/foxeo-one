-- Migration: Create screenshots storage bucket
-- Module: support — uploadScreenshot() (packages/modules/support/actions/upload-screenshot.ts)
-- Fix bug "Échec de l'upload" : le bucket 'screenshots' n'existait pas en base.
--
-- Choix : bucket PUBLIC car le code lit l'image via getPublicUrl() (URL servie sans auth).
-- Limites alignées sur le code : MAX_SIZE = 5 Mo, ALLOWED_TYPES = png/jpeg/webp.
-- Chemin d'upload : `${auth.uid()}/uuid.ext` → le 1er segment du dossier = l'auth user id.

-- 1. Création du bucket (public, RLS activé sur storage.objects)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screenshots',
  'screenshots',
  true,
  5242880, -- 5 Mo (= MAX_SIZE côté action)
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: un utilisateur authentifié peut uploader dans SON propre dossier
CREATE POLICY screenshots_insert_owner ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Lecture publique (bucket public → getPublicUrl servie sans auth)
CREATE POLICY screenshots_select_public ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'screenshots');

-- 4. Policy: un utilisateur peut supprimer ses propres captures
CREATE POLICY screenshots_delete_owner ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
