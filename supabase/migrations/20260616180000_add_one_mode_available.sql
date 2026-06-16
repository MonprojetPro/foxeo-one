-- Migration — Ajout du flag one_mode_available (ADR-01 Révision 2)
--
-- L'ADR-01 prévoyait DEUX flags d'accès indépendants : lab_mode_available ET
-- one_mode_available. Seul lab_mode_available avait été implémenté ; le code
-- déduisait l'accès One depuis dashboard_type, ce qui empêchait de modéliser
-- proprement la matrice d'accès conditionnelle :
--   • Lab actif (non gradué)  : Lab ✅ / One 🔒 (message teasing)
--   • Gradué Lab→One          : Lab ✅ (consultation) / One ✅
--   • Direct One              : Lab 🔒 / One ✅
--
-- one_mode_available = le Mode One est réellement débloqué (toggle + accès).
-- Devient true à la graduation (cf. graduate-client) et pour les clients One directs.

ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS one_mode_available boolean NOT NULL DEFAULT false;

-- Backfill : tout client déjà en One (direct One ou gradué) a le Mode One débloqué.
UPDATE client_configs SET one_mode_available = true WHERE dashboard_type = 'one';
