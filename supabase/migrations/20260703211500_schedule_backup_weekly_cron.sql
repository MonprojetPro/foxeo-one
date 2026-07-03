-- pg_cron : backup hebdomadaire applicatif (cold) — tous les dimanches à 3h.
-- Appelle l'Edge Function backup-weekly (déployée le 2026-07-03, bucket `backups`).
-- Même pattern que health-check-cron / concierge-inactivity-relance (Bearer = clé anon publique).
-- body {"triggeredBy":"cron"} → l'historique distingue Auto vs Manuel dans l'onglet Backups du Hub.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'backup-weekly-sunday') THEN
    PERFORM cron.unschedule('backup-weekly-sunday');
  END IF;
END $$;

SELECT cron.schedule(
  'backup-weekly-sunday',
  '0 3 * * 0',
  $$SELECT net.http_post(
      url := 'https://mpgpwcpeqfwknohhqdmd.supabase.co/functions/v1/backup-weekly',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ3B3Y3BlcWZ3a25vaGhxZG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTY2NTEsImV4cCI6MjA4ODczMjY1MX0.s1qgsw_duwUyiajUnNu09uaYF3Wm0fAbg8wPzC24n_k'
      ),
      body := jsonb_build_object('triggeredBy', 'cron')
  )$$
);
