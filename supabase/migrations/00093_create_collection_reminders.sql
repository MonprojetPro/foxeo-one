-- Story 13-8 — Relances impayées intelligentes — Élio génère, MiKL valide, multicanal
-- Table: collection_reminders

CREATE TABLE IF NOT EXISTS collection_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_amount NUMERIC NOT NULL,
  invoice_date DATE NOT NULL,
  reminder_level INTEGER NOT NULL CHECK (reminder_level IN (1, 2, 3)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  generated_body TEXT,
  sent_at TIMESTAMPTZ,
  channel TEXT CHECK (channel IN ('email', 'chat', 'both')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE collection_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_reminders_select_operator"
  ON collection_reminders FOR SELECT
  USING (is_operator());

CREATE POLICY "collection_reminders_insert_operator"
  ON collection_reminders FOR INSERT
  WITH CHECK (is_operator());

CREATE POLICY "collection_reminders_update_operator"
  ON collection_reminders FOR UPDATE
  USING (is_operator());

CREATE INDEX IF NOT EXISTS idx_collection_reminders_status_created
  ON collection_reminders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_reminders_client_invoice
  ON collection_reminders (client_id, invoice_id);

CREATE TRIGGER trg_collection_reminders_updated_at
  BEFORE UPDATE ON collection_reminders
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
