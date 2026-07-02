-- Migration — Ajouter system_config au Realtime
--
-- Cause : la table system_config (qui porte maintenance_mode) n'était pas dans la
--   publication supabase_realtime. → Quand MiKL activait le mode maintenance depuis le
--   Hub, les clients déjà connectés ne voyaient rien tant qu'ils ne changeaient pas de
--   page / ne rechargeaient pas (le middleware ne relit system_config qu'à chaque
--   navigation). Idem à la sortie de maintenance.
-- Fix : ajouter la table à la publication. RLS SELECT = USING (true) → aucune référence
--   à une autre table, donc les événements postgres_changes SONT bien délivrés (pas
--   besoin du contournement broadcast utilisé pour client_configs). PK = key
--   (replica identity default) → le filtre key=eq.maintenance_mode matche sur UPDATE.
--   Couplé à l'écoute branchée dans MaintenanceRealtimeGuard côté client.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'system_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE system_config;
  END IF;
END $$;
