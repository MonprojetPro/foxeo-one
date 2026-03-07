-- Story 10.4: Bucket Storage pour assets clients (logos branding)
-- Bucket public pour URLs sans authentification (logos = assets non sensibles)

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-assets', 'client-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: seuls les opérateurs peuvent uploader
CREATE POLICY "client_assets_insert_operator"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-assets'
    AND EXISTS (
      SELECT 1 FROM public.operators
      WHERE operators.auth_user_id = auth.uid()
    )
  );

-- RLS: seuls les opérateurs peuvent mettre à jour (upsert)
CREATE POLICY "client_assets_update_operator"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'client-assets'
    AND EXISTS (
      SELECT 1 FROM public.operators
      WHERE operators.auth_user_id = auth.uid()
    )
  );

-- RLS: seuls les opérateurs peuvent supprimer
CREATE POLICY "client_assets_delete_operator"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client-assets'
    AND EXISTS (
      SELECT 1 FROM public.operators
      WHERE operators.auth_user_id = auth.uid()
    )
  );

-- Lecture publique (bucket public)
CREATE POLICY "client_assets_select_public"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'client-assets');
