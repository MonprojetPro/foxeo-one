-- Élio Concierge One (Vision One v2, 2026-06-24) — « le dernier mot d'Élio » côté One.
--
-- On RÉUTILISE la table client_concierge_messages (créée pour le Lab, migration
-- 20260618150000) en y ajoutant une colonne discriminante `dashboard_context` : la même
-- table sert désormais les deux dashboards (Lab : parcours d'incubation ; One : outil
-- métier quotidien). La lecture Lab (get-parcours) filtre dashboard_context='lab', la
-- lecture One (getOneConciergeWord) filtre dashboard_context='one' → aucun mélange.
--
-- Realtime : un trigger DÉDIÉ aux messages One pousse un signal de refetch sur le canal
-- `one:{client_id}` (event `one_concierge_changed`), distinct du broadcast Lab
-- (`parcours:{client_id}` / `parcours_changed`). Même pattern que broadcast_parcours_change
-- (RSC-009 : broadcast DB pour contourner la RLS par sous-requête, payload non sensible).
--
-- ⚠️ Le trigger Lab existant (trg_broadcast_concierge_messages → broadcast_parcours_change)
-- reste en place et continue de broadcaster TOUS les INSERT sur le canal parcours. Pour ne
-- PAS notifier le bandeau Lab lors d'un message One, ce trigger Lab est filtré pour ne
-- broadcaster que les rows dashboard_context='lab'. Le nouveau trigger One ne broadcaste,
-- lui, que les rows dashboard_context='one'.

-- ============================================================
-- 1. Colonne discriminante (idempotente)
-- ============================================================

ALTER TABLE public.client_concierge_messages
  ADD COLUMN IF NOT EXISTS dashboard_context text NOT NULL DEFAULT 'lab';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_concierge_messages_dashboard_context_check'
  ) THEN
    ALTER TABLE public.client_concierge_messages
      ADD CONSTRAINT client_concierge_messages_dashboard_context_check
      CHECK (dashboard_context IN ('lab', 'one'));
  END IF;
END $$;

COMMENT ON COLUMN public.client_concierge_messages.dashboard_context IS
  'Dashboard d''origine du mot d''Élio : lab (parcours d''incubation) | one (outil métier). '
  'Sert à isoler les lectures (le bandeau Lab ne lit que lab, l''accueil One ne lit que one).';

-- Index ciblé pour la lecture « dernier mot par dashboard » (getOneConciergeWord / get-parcours).
CREATE INDEX IF NOT EXISTS idx_concierge_messages_client_context_created
  ON public.client_concierge_messages(client_id, dashboard_context, created_at DESC);

-- ============================================================
-- 2. Broadcast Realtime — canal One dédié
-- ============================================================

-- Fonction de broadcast spécifique One : ne pousse QUE pour les messages One, sur un canal
-- propre `one:{client_id}` avec l'event `one_concierge_changed`. Calquée sur
-- broadcast_parcours_change (SECURITY DEFINER, search_path vide, échec silencieux).
CREATE OR REPLACE FUNCTION public.broadcast_one_concierge_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cid uuid;
BEGIN
  -- Ne concerne que les messages du dashboard One.
  IF NEW.dashboard_context IS DISTINCT FROM 'one' THEN
    RETURN NEW;
  END IF;

  cid := NEW.client_id;
  IF cid IS NOT NULL THEN
    BEGIN
      PERFORM realtime.send(
        jsonb_build_object('op', TG_OP, 'table', TG_TABLE_NAME),  -- payload non sensible
        'one_concierge_changed',                                   -- event
        'one:' || cid::text,                                       -- topic : un canal One par client
        false                                                      -- canal public (signal de refetch)
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;  -- ne JAMAIS bloquer le DML si le broadcast échoue
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_one_concierge_messages ON public.client_concierge_messages;
CREATE TRIGGER trg_broadcast_one_concierge_messages
  AFTER INSERT ON public.client_concierge_messages
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_one_concierge_change();

-- ============================================================
-- 3. Filtrage du broadcast Lab existant (ne broadcaste plus les messages One)
-- ============================================================

-- Wrapper qui n'appelle le broadcast Lab que pour les rows dashboard_context='lab'.
-- Évite qu'un message One ne déclenche un refetch inutile du bandeau Lab.
CREATE OR REPLACE FUNCTION public.broadcast_lab_concierge_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cid uuid;
BEGIN
  -- Ne concerne que les messages du dashboard Lab (défaut historique).
  IF NEW.dashboard_context IS DISTINCT FROM 'lab' THEN
    RETURN NEW;
  END IF;

  cid := NEW.client_id;
  IF cid IS NOT NULL THEN
    BEGIN
      PERFORM realtime.send(
        jsonb_build_object('op', TG_OP, 'table', TG_TABLE_NAME),
        'parcours_changed',
        'parcours:' || cid::text,
        false
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Remplace le trigger Lab historique (qui appelait broadcast_parcours_change sans filtre)
-- par la version filtrée. broadcast_parcours_change reste utilisée par les triggers parcours.
DROP TRIGGER IF EXISTS trg_broadcast_concierge_messages ON public.client_concierge_messages;
CREATE TRIGGER trg_broadcast_concierge_messages
  AFTER INSERT ON public.client_concierge_messages
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_lab_concierge_change();

-- ============================================================
-- 4. Consumer protégé : cooldown anti-spam de la relance Lab
-- ============================================================

-- find_inactive_parcours_clients (relance Lab) compte les mots d'Élio récents pour son
-- cooldown. Avec la table désormais partagée Lab/One, un mot d'Élio ONE récent supprimerait
-- à tort une relance LAB légitime. On filtre donc le cooldown sur dashboard_context='lab'.
-- Fonction strictement identique à 20260618160000, seul le NOT EXISTS gagne le filtre.
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
        AND ccm.dashboard_context = 'lab'
        AND ccm.created_at > now() - make_interval(days => p_cooldown_days)
    )
  ORDER BY cpa.client_id, cpa.step_order ASC;
$$;
