-- ============================================================
-- Fix pré-existant découvert pendant le chantier 2026-07-06 :
-- les hooks front (use-billing.ts et co) s'abonnent en Realtime
-- postgres_changes sur billing_sync, mais la table n'a jamais été
-- ajoutée à la publication supabase_realtime → aucun événement émis.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'billing_sync'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE billing_sync;
  END IF;
END $$;

ALTER TABLE billing_sync REPLICA IDENTITY FULL;
