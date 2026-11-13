-- ============================================================
-- T-084 — Les SECRETS de system_config ne sont plus lisibles par tous
-- ============================================================
-- Trouvé par CERBÈRE le 13/11 pendant le lot 1 de T-082 : la policy
-- `system_config_select_public` (00066) est `USING (true)` pour TOUS les rôles,
-- `anon` compris. Elle avait été ouverte pour que le middleware et la page
-- maintenance lisent `maintenance_mode` sans session. Mais la table a depuis
-- reçu des jetons OAuth (`google_drive_access_token`,
-- `google_drive_refresh_token`, `google_workspace_*`) : ils étaient lisibles
-- avec la seule clé publique du site.
--
-- Correctif MINIMAL, choisi pour ne rien casser : la lecture reste ouverte
-- pour toutes les clés SAUF celles qui portent un secret, réservées à
-- l'opérateur. Les lecteurs de ces jetons sont tous côté Hub (opérateur
-- connecté) ou des Edge Functions (service_role, qui contourne la RLS) —
-- vérifié par grep le 13/11. Les autres clés (maintenance, réglages Élio lus
-- par l'espace client) ne bougent pas.
--
-- ⚠️ CE CORRECTIF NE SUFFIT PAS : un jeton déjà exposé doit être considéré
--    comme compromis. Révoquer l'accès dans Google puis reconnecter le Drive
--    (action MiKL).
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS system_config_select_public ON public.system_config;
CREATE POLICY system_config_select_public ON public.system_config
  FOR SELECT
  USING (
    key !~* '(token|secret|password|api_key|apikey|credential)'
    OR is_operator()
  );

COMMENT ON POLICY system_config_select_public ON public.system_config IS
  'T-084 — Lecture ouverte (maintenance sans session), SAUF les clés de secret (jetons, mots de passe, clés API) réservées à l''opérateur.';

COMMIT;

-- ROLLBACK (rouvre la faille, à ne faire qu'en connaissance de cause) :
-- DROP POLICY system_config_select_public ON public.system_config;
-- CREATE POLICY system_config_select_public ON public.system_config FOR SELECT USING (true);
