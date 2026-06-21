-- LOT E — Mode de parcours « tracé » (séquentiel) vs « libre » (parallèle).
--
-- Choisi PAR MiKL, par client, depuis le Hub (jamais par le client).
--   - 'tracee' (défaut) : comportement historique. Étapes séquentielles, une seule `active`
--     à la fois, déverrouillage de la suivante à l'approbation. La réouverture (LOT B) sert
--     de marche arrière.
--   - 'libre' : toutes les étapes activées (is_enabled=true) sont navigables/soumissibles en
--     parallèle, dans l'ordre voulu. Le calcul de complétion reste identique (tous les agents
--     enabled terminés).
--
-- client_configs est déjà dans la publication realtime (broadcast) + REPLICA IDENTITY FULL,
-- donc la bascule de mode se propage instantanément aux lecteurs (cockpit Hub + parcours client).

ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS parcours_mode TEXT NOT NULL DEFAULT 'tracee'
  CHECK (parcours_mode IN ('tracee', 'libre'));

COMMENT ON COLUMN client_configs.parcours_mode IS
  'LOT E — tracee: étapes séquentielles (une active à la fois). libre: toutes les étapes activées navigables en parallèle.';
