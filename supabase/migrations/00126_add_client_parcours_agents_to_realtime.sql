-- Migration 00126 — Ajouter client_parcours_agents au Realtime
--
-- Cause : la table client_parcours_agents n'était pas dans la publication supabase_realtime.
--   → Quand MiKL validait/refusait une soumission, le statut de l'étape côté client
--     ne se rafraîchissait qu'au prochain refresh de page (pas de Realtime).
-- Fix : ajouter à la publication pour propager les changements de statut.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'client_parcours_agents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_parcours_agents;
  END IF;
END $$;
