-- Story 9.1 / 10.1 rework (ADR-01 Révision 2 — 2026-04-13)
-- Toggle Mode Lab / Mode One + feature flag Élio Lab
-- Voir: _bmad-output/planning-artifacts/architecture/adr-01-lab-one-coexistence-same-instance.md

ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS lab_mode_available BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS elio_lab_enabled BOOLEAN DEFAULT false NOT NULL;

-- Backfill : clients actuellement en mode Lab → accès Lab + Élio Lab actifs
UPDATE client_configs
SET lab_mode_available = true,
    elio_lab_enabled = true
WHERE dashboard_type = 'lab';

-- Backfill : clients déjà gradués (One) → accès Lab disponible (toggle visible),
-- mais Élio Lab désactivé par défaut (MiKL le réactive au cas par cas pour les évolutions)
UPDATE client_configs
SET lab_mode_available = true,
    elio_lab_enabled = false
WHERE dashboard_type = 'one';

COMMENT ON COLUMN client_configs.lab_mode_available IS
  'Le client peut basculer en Mode Lab via le toggle du shell. Voir ADR-01 Révision 2.';

COMMENT ON COLUMN client_configs.elio_lab_enabled IS
  'L''agent Élio Lab est actif pour ce client. Contrôlé par MiKL depuis le Hub. Voir ADR-01 Révision 2.';
