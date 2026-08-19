-- pg_cron : prise de nouvelles proactive d'Élio One (tous les jours à 8h15).
--
-- Décalé de 15 min après concierge-inactivity-relance-daily (8h00) pour ne pas empiler
-- deux vagues d'appels à elio-chat au même instant.
--
-- La fréquence RÉELLE d'envoi n'est pas ici : elle vit dans system_config.elio_one_checkin
-- (idle_days / cooldown_days / enabled), réglable par MiKL depuis le Hub sans redéploiement.
-- Ce cron ne fait que « proposer » quotidiennement ; la RPC filtre les candidats.
--
-- Auth : on copie le header Authorization EXACT d'un cron existant qui fonctionne
--   (clé anon publique) plutôt que de le coder en dur — aucun secret dans le fichier.

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  auth_header text;
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'one-project-checkin-daily') THEN
    PERFORM cron.unschedule('one-project-checkin-daily');
  END IF;

  SELECT (regexp_match(command, 'Bearer [A-Za-z0-9._-]+'))[1]
  INTO auth_header
  FROM cron.job
  WHERE jobname = 'cleanup-expired-exports-daily'
  LIMIT 1;

  IF auth_header IS NULL THEN
    RAISE NOTICE 'Cron de référence introuvable — one-project-checkin-daily non planifié. À rejouer une fois un cron de référence présent.';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'one-project-checkin-daily',
    '15 8 * * *',
    format($f$
      SELECT net.http_post(
        url := 'https://mpgpwcpeqfwknohhqdmd.supabase.co/functions/v1/one-project-checkin',
        headers := jsonb_build_object('Content-Type','application/json','Authorization', %L)
      )
    $f$, auth_header)
  );
END $$;
