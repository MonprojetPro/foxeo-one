-- Migration — Cycle de vie visuel du One : « en chantier » → « livré »
-- Vision One v2 (2026-06-24), §6 "Cycle de vie visuel".
--
-- Quand un client signe, son outil sur-mesure (cockpits) n'existe pas encore : MiKL le
-- développe. Pendant cette phase, le One affiche un état visuel « en chantier ». Quand
-- l'outil est prêt, MiKL bascule le flag → état « livré » (cockpits qui s'allument).
--
-- ⚠️ CONTRAINTE FORTE : c'est PUREMENT VISUEL. Les onglets du socle restent IDENTIQUES dans
-- les deux états — le client a tout le socle relation dès le départ. Aucune restriction d'accès
-- n'est dérivée de ce flag (ne JAMAIS l'utiliser pour masquer un module du socle).
--
-- Valeurs :
--   'construction' (défaut) : outil en cours de développement → bandeau + accueil "chantier"
--   'delivered'             : outil livré → comportement normal (cockpits visibles)
--
-- Realtime : aucune action supplémentaire requise. La table client_configs possède déjà un
-- trigger broadcast (20260618140000_client_configs_realtime_broadcast.sql) qui émet sur
-- 'client_configs:{client_id}' à chaque UPDATE → RealtimeDashboardRefresh fait router.refresh()
-- et le layout SSR relit one_status. La bascule Hub → One est donc instantanée côté client.

ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS one_status text NOT NULL DEFAULT 'construction';

-- Garde-fou : seules les deux valeurs prévues sont autorisées.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_configs_one_status_check'
  ) THEN
    ALTER TABLE client_configs
      ADD CONSTRAINT client_configs_one_status_check
      CHECK (one_status IN ('construction', 'delivered'));
  END IF;
END $$;

COMMENT ON COLUMN client_configs.one_status IS
  'Cycle de vie visuel du One : construction (outil en cours de dev) | delivered (outil livré). Purement visuel, ne restreint jamais l''accès au socle.';
