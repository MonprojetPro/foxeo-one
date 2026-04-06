-- Migration 00076: Add attachment fields to messages table + chat-attachments storage bucket
-- Story 3.8: Chat Hub — Pièces jointes & Workflow Transformation Élio

-- 1. Add attachment columns to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT NULL;

-- 2. Create chat-attachments storage bucket (public = false → signed URLs required)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760, -- 10 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS: operators can upload and read attachments for their clients
CREATE POLICY "chat_attachments_operator_all"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND is_operator()
  )
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND is_operator()
  );

-- 4. Storage RLS: clients can read their own attachments (path starts with operatorId/clientId/)
CREATE POLICY "chat_attachments_client_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.auth_user_id = auth.uid()
        AND (storage.objects.name LIKE '%/' || c.id::text || '/%')
    )
  );
