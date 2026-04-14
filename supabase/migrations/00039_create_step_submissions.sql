-- Migration: Create step_submissions table
-- Story: 6.3 — Soumission de brief pour validation & notifications

-- 1. Table step_submissions
CREATE TABLE step_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcours_step_id UUID NOT NULL REFERENCES parcours_steps(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  submission_content TEXT NOT NULL,
  submission_files JSONB DEFAULT '[]'::JSONB,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  feedback TEXT,
  feedback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Index: performances queries
CREATE INDEX idx_step_submissions_parcours_step_id ON step_submissions(parcours_step_id);
CREATE INDEX idx_step_submissions_client_id_status ON step_submissions(client_id, status);

-- 3. Trigger updated_at
CREATE TRIGGER step_submissions_updated_at
  BEFORE UPDATE ON step_submissions
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- 4. Enable RLS
ALTER TABLE step_submissions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Client voit ses soumissions
CREATE POLICY step_submissions_select_owner ON step_submissions
  FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE auth_user_id = auth.uid()
  ));

-- Opérateur voit toutes les soumissions de ses clients
CREATE POLICY step_submissions_select_operator ON step_submissions
  FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE operator_id = auth.uid()
  ));

-- Client peut créer ses soumissions
CREATE POLICY step_submissions_insert_owner ON step_submissions
  FOR INSERT
  WITH CHECK (client_id IN (
    SELECT id FROM clients WHERE auth_user_id = auth.uid()
  ));

-- Seul l'opérateur peut modifier (validation)
CREATE POLICY step_submissions_update_operator ON step_submissions
  FOR UPDATE
  USING (client_id IN (
    SELECT id FROM clients WHERE operator_id = auth.uid()
  ));
