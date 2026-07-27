-- Pas de relance automatique pour un client qui n'est plus servi
--
-- CONSTAT DU 2026-07-27 — `find_inactive_parcours_clients` (cron de relance d'inactivité
-- Élio) ne regardait QUE l'état du parcours : étape active, agent activé,
-- `elio_lab_enabled`, cooldown. Jamais le statut du CLIENT.
--
-- Conséquence : un client dont l'abonnement est résilié (`subscription_cancelled` /
-- `handed_off`) — donc dont le parcours est justement figé — continuait d'être relancé
-- par Élio avec un « ça fait un moment qu'on n'a pas avancé, quand tu seras prêt à
-- reprendre… ». On invite à reprendre un parcours qu'on vient de verrouiller. Même
-- absurdité pour un client suspendu ou archivé, qui ne peut même plus se connecter.
--
-- On restreint donc aux clients réellement actifs. Whitelist plutôt que liste
-- d'exclusions : un statut ajouté plus tard ne doit pas se retrouver relancé par défaut
-- parce qu'on aura oublié de l'exclure ici.
--
-- Le reste de la fonction est inchangé (repris à l'identique).

-- ⚠️ Les DEFAULT 7 doivent être conservés à l'identique : les retirer est refusé par
-- Postgres (« cannot remove parameter defaults ») et casserait les appels qui comptent
-- dessus.
CREATE OR REPLACE FUNCTION public.find_inactive_parcours_clients(
  p_idle_days int DEFAULT 7,
  p_cooldown_days int DEFAULT 7
)
RETURNS TABLE (
  client_id uuid,
  auth_user_id uuid,
  agent_label text,
  idle_days int
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ON (cpa.client_id)
    cpa.client_id,
    c.auth_user_id,
    cpa.step_label AS agent_label,
    EXTRACT(DAY FROM (now() - cpa.updated_at))::int AS idle_days
  FROM public.client_parcours_agents cpa
  JOIN public.clients c ON c.id = cpa.client_id
  JOIN public.client_configs cc ON cc.client_id = cpa.client_id
  WHERE cpa.status = 'active'
    AND cpa.is_enabled = true
    AND cpa.updated_at < now() - make_interval(days => p_idle_days)
    AND cc.elio_lab_enabled = true
    AND c.auth_user_id IS NOT NULL
    -- Seuls les clients encore servis sont relancés : ni résilié, ni transféré,
    -- ni suspendu, ni archivé.
    AND c.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.parcours p
      WHERE p.client_id = cpa.client_id AND p.status = 'abandoned'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.client_concierge_messages ccm
      WHERE ccm.client_id = cpa.client_id
        AND ccm.dashboard_context = 'lab'
        AND ccm.created_at > now() - make_interval(days => p_cooldown_days)
    )
  ORDER BY cpa.client_id, cpa.step_order ASC;
$function$;

COMMENT ON FUNCTION public.find_inactive_parcours_clients(int, int) IS
  'Clients a relancer pour inactivite sur leur parcours Lab. Restreint aux clients status=active : un client resilie/transfere/suspendu/archive ne doit jamais recevoir de relance « reviens avancer ».';
