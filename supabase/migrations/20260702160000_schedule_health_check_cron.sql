-- Story 12.5a (finalisation) — Planification du monitoring santé système.
--
-- Contexte : l'Edge Function health-check-cron existait sur le disque mais n'avait
--   JAMAIS été déployée ni planifiée → system_config.health_checks restait vide ({})
--   depuis sa création, et l'onglet Monitoring du Hub affichait un faux « OK » avec
--   tous les services à « — ». La fonction est désormais déployée ; ce cron la déclenche
--   toutes les 5 minutes pour remplir les données.
--
-- Auth : on copie le header Authorization EXACT d'un cron existant qui fonctionne
--   (clé anon publique) plutôt que de le coder en dur ici — évite toute erreur de saisie
--   et tout secret dans le fichier. Le service role est auto-injecté DANS la fonction
--   (Deno.env) pour l'écriture DB en bypass RLS.

DO $$
DECLARE
  auth_header text;
BEGIN
  SELECT (regexp_match(command, 'Bearer [A-Za-z0-9._-]+'))[1]
  INTO auth_header
  FROM cron.job
  WHERE jobname = 'cleanup-expired-exports-daily'
  LIMIT 1;

  IF auth_header IS NULL THEN
    RAISE NOTICE 'Cron de référence introuvable — health-check-cron-5min non planifié. À rejouer une fois un cron de référence présent.';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'health-check-cron-5min',
    '*/5 * * * *',
    format($f$
      SELECT net.http_post(
        url := 'https://mpgpwcpeqfwknohhqdmd.supabase.co/functions/v1/health-check-cron',
        headers := jsonb_build_object('Content-Type','application/json','Authorization', %L)
      )
    $f$, auth_header)
  );
END $$;
