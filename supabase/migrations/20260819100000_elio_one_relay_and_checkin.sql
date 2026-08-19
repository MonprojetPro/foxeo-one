-- Élio One — intermédiaire vers MiKL + prise de nouvelles proactive (2026-08-19)
--
-- Décision produit MiKL du 2026-08-19 : Élio One est identique en offre One et One+
-- (aucune notion agentique ne sépare les deux tiers — seul le coaching HUMAIN les sépare).
-- Élio One est « une extension de MiKL » : il encourage, propose de l'aide sur l'usage de
-- l'outil, prend des nouvelles du projet, et — avec l'ACCORD explicite du client — relaie
-- à MiKL ce qui ne va pas, sous forme d'un vrai message dans le Chat MiKL.
--
-- Trois volets ici :
--   1. messages.via_elio  — marqueur DÉRIVÉ (jamais du texte en dur dans le contenu) pour
--      afficher « Relayé par Élio One » côté Hub ET côté client.
--   2. find_one_clients_for_checkin() — candidats à la prise de nouvelles proactive (cron).
--   3. system_config.elio_one_checkin — fréquence réglable par MiKL au Hub (pas de valeur
--      codée en dur dans l'Edge Function).

-- ============================================================
-- 1. Marqueur « relayé par Élio One » sur les messages
-- ============================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS via_elio BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.messages.via_elio IS
  'true = message posté par Elio One comme intermediaire, avec accord du client. Sert a afficher le badge « Relaye par Elio One ». Ecrit uniquement par la Server Action relayToMiklChat (service role) : la policy client interdit de le positionner soi-meme.';

-- Un client ne doit pas pouvoir se faire passer pour Élio en insérant via_elio = true
-- directement via l'API. Le relais légitime passe par le service role, qui n'est pas
-- soumis aux policies.
DROP POLICY IF EXISTS messages_insert_client ON public.messages;

CREATE POLICY messages_insert_client ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    via_elio = false
    AND (
      (sender_type = 'client' AND client_id IN (
        SELECT id FROM public.clients WHERE auth_user_id = (SELECT auth.uid())
      ))
      OR
      (sender_type = 'operator' AND operator_id IN (
        SELECT id FROM public.operators WHERE auth_user_id = (SELECT auth.uid())
      ))
    )
  );

-- ============================================================
-- 2. Réglage de fréquence — piloté par MiKL, jamais en dur
-- ============================================================

INSERT INTO public.system_config (key, value)
VALUES (
  'elio_one_checkin',
  jsonb_build_object(
    'enabled', true,
    'idle_days', 14,
    'cooldown_days', 14
  )
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 3. Candidats à la prise de nouvelles proactive
-- ============================================================

-- Whitelist stricte, sur le modèle de find_inactive_parcours_clients : un statut client
-- ajouté plus tard ne doit pas se retrouver relancé par défaut faute d'avoir été exclu ici.
-- On ne prend des nouvelles QUE d'un client One réellement servi.
CREATE OR REPLACE FUNCTION public.find_one_clients_for_checkin(
  p_idle_days int DEFAULT 14,
  p_cooldown_days int DEFAULT 14
)
RETURNS TABLE (
  client_id uuid,
  auth_user_id uuid,
  client_name text,
  idle_days int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id AS client_id,
    c.auth_user_id,
    c.name AS client_name,
    COALESCE(
      EXTRACT(DAY FROM (now() - GREATEST(
        COALESCE(last_word.created_at, c.created_at),
        c.created_at
      )))::int,
      p_idle_days
    ) AS idle_days
  FROM public.clients c
  JOIN public.client_configs cc ON cc.client_id = c.id
  LEFT JOIN LATERAL (
    SELECT ccm.created_at
    FROM public.client_concierge_messages ccm
    WHERE ccm.client_id = c.id
      AND ccm.dashboard_context = 'one'
    ORDER BY ccm.created_at DESC
    LIMIT 1
  ) last_word ON true
  WHERE c.auth_user_id IS NOT NULL
    -- Seuls les clients encore servis : ni résilié, ni transféré, ni suspendu, ni archivé.
    AND c.status = 'active'
    -- Le One doit être réellement ouvert au client.
    AND cc.dashboard_type = 'one'
    AND cc.subscription_tier IN ('one', 'one_plus')
    -- Le client doit avoir eu le temps de s'installer avant qu'on prenne de ses nouvelles.
    AND c.created_at < now() - make_interval(days => p_idle_days)
    -- Anti-harcèlement : aucun mot d'Élio One récent (quelle qu'en soit la cause — une
    -- livraison ou une évolution annoncée cette semaine tient déjà lieu de contact).
    AND NOT EXISTS (
      SELECT 1 FROM public.client_concierge_messages ccm
      WHERE ccm.client_id = c.id
        AND ccm.dashboard_context = 'one'
        AND ccm.created_at > now() - make_interval(days => p_cooldown_days)
    )
    -- Ne pas prendre de nouvelles d'un client qui vient déjà de nous écrire : le lien
    -- est vivant, une relance automatique serait à côté de la plaque.
    AND NOT EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.client_id = c.id
        AND m.created_at > now() - make_interval(days => p_cooldown_days)
    );
$function$;

COMMENT ON FUNCTION public.find_one_clients_for_checkin(int, int) IS
  'Clients One actifs dont Elio doit prendre des nouvelles (cron one-project-checkin). Whitelist status=active + dashboard_type=one : jamais de relance a un client resilie, suspendu ou archive. Cooldown sur les mots d Elio One ET sur les messages du chat.';

REVOKE EXECUTE ON FUNCTION public.find_one_clients_for_checkin(int, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.find_one_clients_for_checkin(int, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_one_clients_for_checkin(int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.find_one_clients_for_checkin(int, int) TO service_role;
