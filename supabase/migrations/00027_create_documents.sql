-- Migration: Create documents table
-- Story: 4.1 — Module Documents migration, structure & upload avec validation
-- Date: 2026-02-18

-- ============================================================
-- 1. CREATE TABLE documents
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  folder_id UUID,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  uploaded_by TEXT NOT NULL CHECK (uploaded_by IN ('client', 'operator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE documents IS 'Documents uploades par les clients et operateurs — stockes dans Supabase Storage';
COMMENT ON COLUMN documents.file_path IS 'Chemin dans Supabase Storage : {operatorId}/{clientId}/{filename}';
COMMENT ON COLUMN documents.file_size IS 'Taille en octets';
COMMENT ON COLUMN documents.visibility IS 'private = visible uniquement par le uploadeur, shared = visible par client et operateur';
COMMENT ON COLUMN documents.uploaded_by IS 'Qui a uploade : client ou operator';
COMMENT ON COLUMN documents.folder_id IS 'Dossier parent (story 4.4)';

-- ============================================================
-- 2. INDEX
-- ============================================================

CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_documents_operator_id ON documents(operator_id);
CREATE INDEX idx_documents_visibility ON documents(visibility);

-- ============================================================
-- 3. Trigger updated_at
-- ============================================================

CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_updated_at();

-- ============================================================
-- 4. RLS policies
-- ============================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Client ne voit que ses docs partages + ses propres uploads
CREATE POLICY documents_select_owner ON documents
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    AND (visibility = 'shared' OR uploaded_by = 'client')
  );

-- Operateur voit tous les docs de ses clients
CREATE POLICY documents_select_operator ON documents
  FOR SELECT
  TO authenticated
  USING (operator_id IN (
    SELECT id FROM operators WHERE auth_user_id = auth.uid()
  ));

-- Client peut inserer pour son propre client_id
CREATE POLICY documents_insert_client ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = 'client'
    AND client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- Operateur peut inserer pour ses propres clients
CREATE POLICY documents_insert_operator ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = 'operator'
    AND operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid())
  );

-- Seul l'operateur peut modifier (metadata, visibility, tags)
CREATE POLICY documents_update_operator ON documents
  FOR UPDATE
  TO authenticated
  USING (operator_id IN (
    SELECT id FROM operators WHERE auth_user_id = auth.uid()
  ))
  WITH CHECK (operator_id IN (
    SELECT id FROM operators WHERE auth_user_id = auth.uid()
  ));

-- Operateur peut supprimer les documents de ses clients
CREATE POLICY documents_delete_operator ON documents
  FOR DELETE
  TO authenticated
  USING (operator_id IN (
    SELECT id FROM operators WHERE auth_user_id = auth.uid()
  ));

-- Client peut supprimer ses propres uploads
CREATE POLICY documents_delete_owner ON documents
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = 'client'
    AND client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- ============================================================
-- 5. Supabase Storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Client accede a ses propres fichiers
CREATE POLICY "documents_storage_select_owner" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[2] IN (
      SELECT id::text FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Storage RLS: Operateur accede a tous les fichiers de ses clients
CREATE POLICY "documents_storage_select_operator" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM operators WHERE auth_user_id = auth.uid()
    )
  );

-- Storage RLS: Operateur peut uploader dans son propre dossier
CREATE POLICY "documents_storage_insert_operator" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM operators WHERE auth_user_id = auth.uid()
    )
  );

-- Storage RLS: Client peut uploader dans son propre dossier client
CREATE POLICY "documents_storage_insert_client" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[2] IN (
      SELECT id::text FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Storage RLS: Operateur peut supprimer des fichiers
CREATE POLICY "documents_storage_delete_operator" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM operators WHERE auth_user_id = auth.uid()
    )
  );

-- Storage RLS: Client peut supprimer ses propres uploads
CREATE POLICY "documents_storage_delete_owner" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[2] IN (
      SELECT id::text FROM clients WHERE auth_user_id = auth.uid()
    )
  );
