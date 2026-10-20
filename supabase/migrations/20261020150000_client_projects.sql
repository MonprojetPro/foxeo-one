-- Migration: 20261020150000_client_projects.sql
-- T-063 — Refonte de l'onglet "Cursor" (mort, chemin Mac en dur jamais valide sous
-- Windows) en onglet "Dossier projet". Un client peut porter plusieurs projets
-- (plusieurs chantiers en parallele) ; chacun est relie a un dossier local sur le
-- poste de MiKL via la File System Access API du navigateur. Le handle du dossier
-- ne peut pas traverser le reseau : il vit en IndexedDB cote navigateur, jamais
-- ici. Cette table ne porte que le nom du projet et sert d'ancre pour rattacher
-- les documents generes par le Hub (voir client_project_id sur `documents`).

CREATE TABLE client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE client_projects IS 'T-063 — Projets (chantiers) d''un client, un ou plusieurs. Sert a rattacher les documents generes par le Hub a un dossier local choisi par MiKL (handle en IndexedDB, jamais stocke ici).';

CREATE INDEX idx_client_projects_client ON client_projects(client_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Fonctionnalite interne au Hub : seul l'operateur gere ses projets, le client
-- n'a jamais a en avoir connaissance (pas de policy "owner").

ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_projects_select_operator ON client_projects
  FOR SELECT USING (is_operator());

CREATE POLICY client_projects_insert_operator ON client_projects
  FOR INSERT WITH CHECK (is_operator());

CREATE POLICY client_projects_update_operator ON client_projects
  FOR UPDATE USING (is_operator()) WITH CHECK (is_operator());

CREATE POLICY client_projects_delete_operator ON client_projects
  FOR DELETE USING (is_operator());

-- ── Rattachement des documents existants ────────────────────────────────────
-- Nullable : un document peut exister sans etre encore range dans un projet.

ALTER TABLE documents ADD COLUMN client_project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL;
CREATE INDEX idx_documents_client_project ON documents(client_project_id);

-- ── Realtime ──────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'client_projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_projects;
  END IF;
END $$;

ALTER TABLE client_projects REPLICA IDENTITY FULL;
