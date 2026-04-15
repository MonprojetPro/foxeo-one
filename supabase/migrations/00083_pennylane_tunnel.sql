-- Migration: 00083_pennylane_tunnel.sql
-- Story: 13.4 — Tunnel paiement Pennylane (création compte + activation accès)
--
-- Architecture note:
-- Le codebase n'a pas de table `quotes` dédiée : les devis Pennylane vivent
-- dans `billing_sync` (miroir passif). `quote_metadata` stocke les metadonnees
-- business MPP (quote_type, idempotence du webhook) sans dupliquer billing_sync.

-- ============================================================
-- 1. Table quote_metadata (metadonnees business des devis MPP)
-- ============================================================

CREATE TABLE quote_metadata (
  pennylane_quote_id TEXT PRIMARY KEY,
  pennylane_invoice_id TEXT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quote_type TEXT NOT NULL CHECK (quote_type IN (
    'lab_onboarding',
    'one_direct_deposit',
    'one_direct_final',
    'ponctuel_deposit',
    'ponctuel_final'
  )),
  total_amount_ht NUMERIC(12, 2),
  signed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quote_metadata_pennylane_invoice_id ON quote_metadata(pennylane_invoice_id);
CREATE INDEX idx_quote_metadata_client_id ON quote_metadata(client_id);
CREATE INDEX idx_quote_metadata_quote_type ON quote_metadata(quote_type);

COMMENT ON TABLE quote_metadata IS
  'Metadonnees business des devis Pennylane (quote_type, idempotence webhook tunnel paiement). Ne duplique pas billing_sync.';
COMMENT ON COLUMN quote_metadata.pennylane_quote_id IS 'ID Pennylane du devis (PK fonctionnelle)';
COMMENT ON COLUMN quote_metadata.pennylane_invoice_id IS 'ID Pennylane de la facture liee — renseigne au moment du paiement, indexe pour le lookup webhook';
COMMENT ON COLUMN quote_metadata.paid_at IS 'Timestamp du paiement (pose par le webhook Pennylane)';
COMMENT ON COLUMN quote_metadata.processed_at IS 'Timestamp apres traitement handler (creation compte / activation) — garantit l idempotence';

-- RLS : seul is_operator() peut lire/ecrire (webhook passe par SERVICE_ROLE_KEY qui bypass RLS)
ALTER TABLE quote_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY quote_metadata_select_operator ON quote_metadata
  FOR SELECT USING (is_operator());

CREATE POLICY quote_metadata_insert_operator ON quote_metadata
  FOR INSERT WITH CHECK (is_operator());

CREATE POLICY quote_metadata_update_operator ON quote_metadata
  FOR UPDATE USING (is_operator());

CREATE POLICY quote_metadata_delete_operator ON quote_metadata
  FOR DELETE USING (is_operator());

CREATE TRIGGER trg_quote_metadata_updated_at
  BEFORE UPDATE ON quote_metadata
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- ============================================================
-- 2. Extensions clients : password_change_required + project_status
-- ============================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS project_status TEXT
    CHECK (project_status IS NULL OR project_status IN ('in_progress', 'completed'));

COMMENT ON COLUMN clients.password_change_required IS
  'Story 13.4 — true si le client a recu un mot de passe temporaire et doit le changer au premier login';
COMMENT ON COLUMN clients.project_status IS
  'Story 13.4 — NULL par defaut, in_progress apres deposit, completed apres paiement final';

-- ============================================================
-- 3. Extensions client_configs : deposit_paid_at + final_payment_at
-- ============================================================

ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_payment_at TIMESTAMPTZ;

COMMENT ON COLUMN client_configs.deposit_paid_at IS
  'Story 13.4 — timestamp paiement acompte 30% (one_direct_deposit / ponctuel_deposit)';
COMMENT ON COLUMN client_configs.final_payment_at IS
  'Story 13.4 — timestamp paiement final 70% (one_direct_final / ponctuel_final)';
