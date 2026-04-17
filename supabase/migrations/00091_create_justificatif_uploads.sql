-- ============================================================
-- 00091 — Table justificatif_uploads (Story 13-7)
-- Historique des uploads de justificatifs vers Google Drive
-- ============================================================

CREATE TABLE justificatif_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  drive_file_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for listing recent uploads
CREATE INDEX idx_justificatif_uploads_created_at ON justificatif_uploads (created_at DESC);

-- Trigger updated_at
CREATE TRIGGER trg_justificatif_uploads_updated_at
  BEFORE UPDATE ON justificatif_uploads
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_updated_at();

-- RLS
ALTER TABLE justificatif_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY justificatif_uploads_select_operator
  ON justificatif_uploads FOR SELECT
  USING (is_operator());

CREATE POLICY justificatif_uploads_insert_operator
  ON justificatif_uploads FOR INSERT
  WITH CHECK (is_operator());

CREATE POLICY justificatif_uploads_delete_operator
  ON justificatif_uploads FOR DELETE
  USING (is_operator());
