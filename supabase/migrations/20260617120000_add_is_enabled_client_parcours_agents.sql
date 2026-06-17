-- Migration — Contrôle par agent : is_enabled (actif / désactivé-grisé)
--
-- Jusqu'ici l'état d'un agent du parcours vivait dans le seul champ `status`
-- (pending/active/pending_review/completed/skipped), qui mélange progression ET
-- disponibilité. On ajoute une notion ORTHOGONALE de configuration :
--   is_enabled = true  → agent actif (compte dans le parcours)
--   is_enabled = false → agent désactivé/grisé (MiKL l'a écarté ; conservé pour
--                        l'historique et réactivable à tout moment, même après validation)
--
-- Un agent désactivé est EXCLU du calcul de complétion (ne bloque pas la graduation).

ALTER TABLE client_parcours_agents
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_client_parcours_agents_is_enabled
  ON client_parcours_agents(is_enabled);
