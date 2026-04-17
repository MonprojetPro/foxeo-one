-- Migration 00094 — Story 13-9
-- Table accountant_notifications + system_config keys pour la section "Notifications comptable"

-- ─────────────────────────────────────────────────────────────────────────────
-- Table : accountant_notifications
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accountant_notifications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type           TEXT        NOT NULL CHECK (type IN ('missing_receipt', 'info_request', 'other')),
  title          TEXT        NOT NULL,
  body           TEXT,
  source_email   TEXT,        -- adresse email de l'expéditeur (comptable)
  raw_email_id   TEXT UNIQUE, -- ID Gmail du message source (dédoublonnage)
  status         TEXT        NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'resolved')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour la liste active (non résolus, triés par date)
CREATE INDEX IF NOT EXISTS idx_accountant_notifications_status_created
  ON accountant_notifications (status, created_at DESC);

-- RLS
ALTER TABLE accountant_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY accountant_notifications_select_operator
  ON accountant_notifications FOR SELECT
  USING (is_operator());

CREATE POLICY accountant_notifications_insert_operator
  ON accountant_notifications FOR INSERT
  WITH CHECK (is_operator());

CREATE POLICY accountant_notifications_update_operator
  ON accountant_notifications FOR UPDATE
  USING (is_operator());

-- Trigger updated_at (fn_update_updated_at définie dans 00006)
CREATE TRIGGER trg_accountant_notifications_updated_at
  BEFORE UPDATE ON accountant_notifications
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- system_config — clés comptable (INSERT uniquement si absentes)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO system_config (key, value, description)
VALUES
  ('accountant_email',              '""',    'Adresse email du comptable Pennylane'),
  ('accountant_email_sync_enabled', 'false', 'Active la synchronisation Gmail avec le comptable')
ON CONFLICT (key) DO NOTHING;
