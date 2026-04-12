-- Migration 00080 — Champs prospect : hub_seen_at, prospect_stage, project_type, lead_message
-- Stories A, B, C, D, E du parcours entrée prospect

-- 1. Nouvelles colonnes sur clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS hub_seen_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prospect_stage  TEXT DEFAULT 'nouveau',
  ADD COLUMN IF NOT EXISTS project_type    TEXT,
  ADD COLUMN IF NOT EXISTS lead_message    TEXT;

-- 2. Contrainte prospect_stage
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_prospect_stage_check;
ALTER TABLE clients
  ADD CONSTRAINT clients_prospect_stage_check
    CHECK (prospect_stage IN ('nouveau', 'qualifié', 'sans_suite'));

-- 3. Index : prospects non vus (requête fréquente dashboard Hub)
CREATE INDEX IF NOT EXISTS idx_clients_hub_unseen
  ON clients (hub_seen_at, status)
  WHERE hub_seen_at IS NULL AND status = 'prospect';

-- 4. Mettre à jour la contrainte status pour inclure 'prospect' (déjà fait en 00034 mais on s'assure)
-- (prospect était déjà dans le CHECK depuis la migration 00034)

COMMENT ON COLUMN clients.hub_seen_at    IS 'NULL = jamais vu par MiKL → badge Nouveau affiché';
COMMENT ON COLUMN clients.prospect_stage IS 'nouveau | qualifié | sans_suite — géré manuellement par MiKL';
COMMENT ON COLUMN clients.project_type   IS 'coaching | dev | coaching_dev | exchange | other';
COMMENT ON COLUMN clients.lead_message   IS 'Message du prospect (formulaire site ou Cal.com)';
