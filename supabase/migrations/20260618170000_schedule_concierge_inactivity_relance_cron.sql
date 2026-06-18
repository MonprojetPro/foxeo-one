-- pg_cron : relance proactive d'Élio pour les clients inactifs sur leur parcours (tous les jours à 8h).
-- Appelle l'Edge Function concierge-inactivity-relance (verify_jwt=false, anon accepté par la gateway).
-- LOT F, Incrément 3.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'concierge-inactivity-relance-daily') THEN
    PERFORM cron.unschedule('concierge-inactivity-relance-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'concierge-inactivity-relance-daily',
  '0 8 * * *',
  $$SELECT net.http_post(
      url := 'https://mpgpwcpeqfwknohhqdmd.supabase.co/functions/v1/concierge-inactivity-relance',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ3B3Y3BlcWZ3a25vaGhxZG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTY2NTEsImV4cCI6MjA4ODczMjY1MX0.s1qgsw_duwUyiajUnNu09uaYF3Wm0fAbg8wPzC24n_k'
      )
  )$$
);
