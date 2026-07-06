-- Migration: 20260706121000_billable_items.sql
-- Chantier Élio Hub / Coaching One+ (2026-07-06) — Contrat 5 (équipier Billing)
--
-- Table des éléments facturables hors forfait (séances coaching One+ sans crédit).
-- Alimentée par le webhook Cal.com (calcom-webhook) quand get_coaching_balance <= 0,
-- consommée par l'Edge Function monthly-billing (cron le 1er du mois) qui crée
-- UNE facture Pennylane par client puis passe les items en status='invoiced'.

CREATE TABLE billable_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('coaching_session')),
  label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,          -- 4500 pour une séance coaching
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','invoiced','cancelled')),
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  pennylane_invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invoiced_at TIMESTAMPTZ
);

COMMENT ON TABLE billable_items IS 'Éléments facturables hors forfait (ex: séance coaching One+ sans crédit — 45 € HT). Facturés en lot par monthly-billing le 1er du mois.';
COMMENT ON COLUMN billable_items.amount_cents IS 'Montant HT en centimes (4500 = 45 €)';
COMMENT ON COLUMN billable_items.pennylane_invoice_id IS 'ID de la facture Pennylane groupée, posé par monthly-billing au passage à invoiced';

CREATE INDEX idx_billable_items_client ON billable_items(client_id);
CREATE INDEX idx_billable_items_status_created ON billable_items(status, created_at);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- SELECT : client propriétaire (via clients.auth_user_id) + opérateur.
-- INSERT / UPDATE : opérateur (les Edge Functions calcom-webhook et
-- monthly-billing écrivent en service_role, qui bypasse la RLS).

ALTER TABLE billable_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY billable_items_select_owner ON billable_items
  FOR SELECT USING (
    client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

CREATE POLICY billable_items_select_operator ON billable_items
  FOR SELECT USING (is_operator());

CREATE POLICY billable_items_insert_operator ON billable_items
  FOR INSERT WITH CHECK (is_operator());

CREATE POLICY billable_items_update_operator ON billable_items
  FOR UPDATE USING (is_operator()) WITH CHECK (is_operator());

-- Pas de DELETE : annulation = status 'cancelled' (trace comptable conservée).

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Ajout idempotent à la publication supabase_realtime (pattern 20260616171500).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'billable_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE billable_items;
  END IF;
END $$;

-- REPLICA IDENTITY FULL pour que les events UPDATE Realtime portent l'ancienne
-- ligne complète (cohérent avec 20260618120000_realtime_replica_identity_full).
ALTER TABLE billable_items REPLICA IDENTITY FULL;
