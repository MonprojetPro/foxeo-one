-- T-050 — Rattrapage des transcriptions de visio, toutes les 15 minutes.
--
-- CE QUE CE CRON RÉPARE : la récupération n'était tentée qu'une seule fois,
-- par `endMeeting`, IMMÉDIATEMENT après la fin de l'appel. Google met
-- plusieurs minutes à produire sa transcription — la tentative tombait donc
-- toujours trop tôt, et aucune reprise n'existait.
--
-- ⚠️ CE JOB APPELLE VERCEL, PAS UNE EDGE FUNCTION. Les secrets Google vivent
-- sur Vercel ; la route `/api/cron/sync-meeting-results` du Hub réutilise le
-- même cœur que le bouton « Récupérer maintenant ». Les autres crons du projet
-- appellent des Edge Functions avec la clé anon (publique) : ici il faut un
-- secret partagé, qui n'a RIEN À FAIRE DANS CE DÉPÔT.
--
-- 🔑 D'OÙ LA PLANIFICATION CONDITIONNELLE CI-DESSOUS : elle ne s'exécute que
-- si le secret a été fourni par un réglage de base (`app.hub_cron_secret`).
-- Sinon elle n'écrit rien et le dit. La planification réelle se fait une fois,
-- à la main, avec la valeur posée dans Vercel :
--
--   SELECT cron.schedule(
--     'visio-transcript-sync',
--     '*/15 * * * *',
--     $$SELECT net.http_post(
--         url := 'https://<domaine-du-hub>/api/cron/sync-meeting-results',
--         headers := jsonb_build_object(
--           'Content-Type','application/json',
--           'Authorization','Bearer <CRON_SECRET>')
--       )$$
--   );
--
-- Idempotent : rejouer cette migration ne crée jamais un doublon de job.

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  cron_secret text;
  hub_url     text;
BEGIN
  cron_secret := current_setting('app.hub_cron_secret', true);
  hub_url     := current_setting('app.hub_base_url', true);

  IF cron_secret IS NULL OR cron_secret = '' OR hub_url IS NULL OR hub_url = '' THEN
    RAISE NOTICE
      'visio-transcript-sync NON planifié : app.hub_cron_secret ou app.hub_base_url absent. Planifier à la main (voir l''en-tête du fichier).';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'visio-transcript-sync') THEN
    PERFORM cron.unschedule('visio-transcript-sync');
  END IF;

  PERFORM cron.schedule(
    'visio-transcript-sync',
    '*/15 * * * *',
    format($f$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'Authorization', %L)
      )
    $f$, hub_url || '/api/cron/sync-meeting-results', 'Bearer ' || cron_secret)
  );
END $$;
