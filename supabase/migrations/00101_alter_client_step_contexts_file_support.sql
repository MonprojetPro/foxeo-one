-- Migration 00101 — Contexte client par agent parcours (Story 14.6)
-- Étend client_step_contexts pour lier les injections Hub à client_parcours_agents
-- et supporter les uploads de fichiers (type: text | file)

-- 1. Rendre step_id nullable (remplacé par client_parcours_agent_id pour les nouvelles injections Hub)
ALTER TABLE client_step_contexts
  ALTER COLUMN step_id DROP NOT NULL;

-- 2. Lien direct vers l'étape du parcours Hub (l'opérateur injecte par agent assigné)
ALTER TABLE client_step_contexts
  ADD COLUMN client_parcours_agent_id UUID REFERENCES client_parcours_agents(id) ON DELETE CASCADE;

-- 3. Support fichiers : type de contenu + chemin Storage
ALTER TABLE client_step_contexts
  ADD COLUMN content_type TEXT NOT NULL DEFAULT 'text'
    CHECK (content_type IN ('text', 'file')),
  ADD COLUMN file_path TEXT,
  ADD COLUMN file_name TEXT;

-- 4. Index pour les requêtes Hub : contextes par agent (non-consommés prioritaires)
CREATE INDEX idx_client_step_contexts_parcours_agent_id
  ON client_step_contexts(client_parcours_agent_id)
  WHERE consumed_at IS NULL;

-- 5. Bucket Storage pour les fichiers injectés par l'opérateur (privé, 10 Mo max)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'step-contexts',
  'step-contexts',
  false,
  10485760,
  ARRAY[
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Politique Storage : opérateurs uniquement (lecture/écriture/suppression)
CREATE POLICY "step_contexts_operator_all"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'step-contexts' AND is_operator())
  WITH CHECK (bucket_id = 'step-contexts' AND is_operator());
