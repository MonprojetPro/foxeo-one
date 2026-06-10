-- pg_cron : nettoyage quotidien des exports RGPD expirés (2h du matin).
-- Appelle l'Edge Function cleanup-expired-exports (verify_jwt=true, anon accepté).
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-exports-daily') THEN
    PERFORM cron.unschedule('cleanup-expired-exports-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-expired-exports-daily',
  '0 2 * * *',
  $$SELECT net.http_post(
      url := 'https://mpgpwcpeqfwknohhqdmd.supabase.co/functions/v1/cleanup-expired-exports',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZ3B3Y3BlcWZ3a25vaGhxZG1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTY2NTEsImV4cCI6MjA4ODczMjY1MX0.s1qgsw_duwUyiajUnNu09uaYF3Wm0fAbg8wPzC24n_k'
      )
  )$$
);
