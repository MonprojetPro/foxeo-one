-- Migration — Ajouter client_configs au Realtime
--
-- Cause : la table client_configs n'était pas dans la publication supabase_realtime.
--   → Quand MiKL activait/désactivait l'accès Lab/One d'un client (ou un module, ou
--     déclenchait une graduation Lab→One), le client connecté ne voyait rien changer
--     (thème, sidebar, modules visibles, toggle Mode Lab/One, Élio Lab) tant qu'il ne
--     rechargeait pas sa page : le layout client lit client_configs en SSR sans Realtime.
-- Fix : ajouter la table à la publication. RLS SELECT déjà OK (is_owner(client_id)),
--   PK = client_id (replica identity default) → le filtre client_id=eq.x matche sur UPDATE.
--   Couplé à l'écoute branchée dans RealtimeDashboardRefresh.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'client_configs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_configs;
  END IF;
END $$;
