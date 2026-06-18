-- Élio Concierge vivant (LOT F, Incrément 3) — détection des clients inactifs sur leur parcours.
--
-- Renvoie un client par ligne (son 1ʳᵉ agent actif resté sans mouvement depuis > p_idle_days),
-- pour que le cron `concierge-inactivity-relance` génère une relance proactive d'Élio.
--
-- Garde-fous (anti-spam + pertinence) :
--   • agent ACTIVE + is_enabled + non touché depuis p_idle_days,
--   • Lab non en pause (client_configs.elio_lab_enabled = true),
--   • parcours non abandonné,
--   • AUCUN mot d'Élio récent (< p_cooldown_days) → évite de relancer un client déjà actif/relancé.

CREATE OR REPLACE FUNCTION public.find_inactive_parcours_clients(
  p_idle_days int DEFAULT 7,
  p_cooldown_days int DEFAULT 7
)
RETURNS TABLE(client_id uuid, auth_user_id uuid, agent_label text, idle_days int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
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
    AND NOT EXISTS (
      SELECT 1 FROM public.parcours p
      WHERE p.client_id = cpa.client_id AND p.status = 'abandoned'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.client_concierge_messages ccm
      WHERE ccm.client_id = cpa.client_id
        AND ccm.created_at > now() - make_interval(days => p_cooldown_days)
    )
  ORDER BY cpa.client_id, cpa.step_order ASC;
$$;
