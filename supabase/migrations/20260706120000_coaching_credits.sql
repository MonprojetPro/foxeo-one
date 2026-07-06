-- ============================================================
-- Migration 20260706120000 — Coaching One+ (Contrat 5, chantier Élio Hub / Coaching 2026-07-06)
--
-- 1. client_configs.coaching_monthly_credits (crédits/mois configurables par client)
-- 2. Table coaching_credit_ledger (solde = somme des delta) + RLS + Realtime
-- 3. Fonction get_coaching_balance(p_client_id) — SECURITY DEFINER, accès restreint
-- 4. meetings.type : élargissement du CHECK avec 'coaching'
-- 5. meetings ajoutée à la publication Realtime (carte Coaching du cockpit One)
-- 6. Backfill initial_grant pour les clients One+ existants
-- ============================================================

-- ------------------------------------------------------------
-- 1. Crédits mensuels par client (défaut : 1 séance/mois)
-- ------------------------------------------------------------
ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS coaching_monthly_credits INT NOT NULL DEFAULT 1;

COMMENT ON COLUMN client_configs.coaching_monthly_credits IS
  'Nombre de crédits de coaching accordés chaque mois aux clients One+ (elio_tier=one_plus). Configurable par client depuis le Hub. Cumulables (report).';

-- ------------------------------------------------------------
-- 2. Ledger des crédits coaching — solde = SUM(delta)
-- ------------------------------------------------------------
CREATE TABLE coaching_credit_ledger (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  delta       INT         NOT NULL,
  reason      TEXT        NOT NULL
    CHECK (reason IN ('monthly_accrual', 'session_booked', 'manual_adjust', 'session_cancelled', 'initial_grant')),
  meeting_id  UUID        REFERENCES meetings(id) ON DELETE SET NULL,
  note        TEXT,
  created_by  TEXT        NOT NULL DEFAULT 'system',
  created_at  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE coaching_credit_ledger IS
  'Mouvements de crédits coaching One+ (append-only). Solde d''un client = SUM(delta) — cf. get_coaching_balance().';

CREATE INDEX idx_coaching_credit_ledger_client_id ON coaching_credit_ledger(client_id);
CREATE INDEX idx_coaching_credit_ledger_created_at ON coaching_credit_ledger(created_at DESC);
CREATE INDEX idx_coaching_credit_ledger_meeting_id ON coaching_credit_ledger(meeting_id);

-- RLS : lecture owner + opérateur ; écriture opérateur (le service_role bypasse la RLS)
ALTER TABLE coaching_credit_ledger ENABLE ROW LEVEL SECURITY;

-- Le client voit ses propres mouvements (solde affiché dans le cockpit One / page visio)
CREATE POLICY coaching_credit_ledger_select_owner ON coaching_credit_ledger
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- L'opérateur voit les mouvements de SES clients
CREATE POLICY coaching_credit_ledger_select_operator ON coaching_credit_ledger
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = coaching_credit_ledger.client_id
        AND is_operator(clients.operator_id)
    )
  );

-- Seul l'opérateur (ou le service_role, hors RLS) crée des mouvements
CREATE POLICY coaching_credit_ledger_insert_operator ON coaching_credit_ledger
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = coaching_credit_ledger.client_id
        AND is_operator(clients.operator_id)
    )
  );

-- UPDATE opérateur uniquement (correctif exceptionnel — le ledger est append-only par convention)
CREATE POLICY coaching_credit_ledger_update_operator ON coaching_credit_ledger
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = coaching_credit_ledger.client_id
        AND is_operator(clients.operator_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = coaching_credit_ledger.client_id
        AND is_operator(clients.operator_id)
    )
  );

-- ------------------------------------------------------------
-- 3. get_coaching_balance(p_client_id) — solde courant
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_coaching_balance(p_client_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  -- Garde d'accès : le client lui-même, un opérateur, ou le service_role (Edge Functions)
  IF NOT (is_owner(p_client_id) OR is_operator() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN COALESCE(
    (SELECT SUM(delta) FROM coaching_credit_ledger WHERE client_id = p_client_id),
    0
  )::INT;
END;
$$;

COMMENT ON FUNCTION get_coaching_balance(UUID) IS
  'Solde de crédits coaching One+ d''un client (somme des delta du ledger). Accès : owner, opérateur, service_role.';

REVOKE ALL ON FUNCTION get_coaching_balance(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_coaching_balance(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION get_coaching_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coaching_balance(UUID) TO service_role;

-- ------------------------------------------------------------
-- 4. meetings.type : ajout de 'coaching'
--    (contrainte inline auto-nommée meetings_type_check, posée en 00034)
-- ------------------------------------------------------------
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_type_check;
ALTER TABLE meetings ADD CONSTRAINT meetings_type_check
  CHECK (type IN ('standard', 'prospect', 'onboarding', 'support', 'coaching'));

-- ------------------------------------------------------------
-- 5. Realtime — le solde et la carte Coaching du cockpit One
--    se mettent à jour sans reload
-- ------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE coaching_credit_ledger;
ALTER TABLE coaching_credit_ledger REPLICA IDENTITY FULL;

-- meetings n'était pas dans la publication (le cockpit Visio se contentait du refetch
-- au focus). La carte Coaching affiche la prochaine séance en direct → on l'ajoute.
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;

-- ------------------------------------------------------------
-- 6. Backfill — crédit initial pour les clients déjà One+
--    (no-op si aucun client one_plus, cf. bug graduate-client corrigé dans ce chantier)
-- ------------------------------------------------------------
INSERT INTO coaching_credit_ledger (client_id, delta, reason, note, created_by)
SELECT cc.client_id, cc.coaching_monthly_credits, 'initial_grant',
       'Crédit initial à la mise en place du coaching One+', 'migration'
FROM client_configs cc
WHERE cc.elio_tier = 'one_plus'
  AND NOT EXISTS (
    SELECT 1 FROM coaching_credit_ledger l WHERE l.client_id = cc.client_id
  );
