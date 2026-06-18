-- Broadcast realtime des changements du parcours, par client.
--
-- Pourquoi broadcast et non postgres_changes (RSC-009) : la policy RLS de
-- `client_parcours_agents` (et parcours / step_submissions) filtre sur `client_id` via une
-- SOUS-REQUÊTE vers `clients`. Realtime applique la RLS par-ligne sur les events postgres_changes,
-- et n'évalue pas correctement ce type de policy (référence à une autre table) sur les UPDATE
-- → l'event n'est JAMAIS délivré (canal SUBSCRIBED mais rien reçu). Observé : couper un agent
-- depuis le Hub ne se voyait qu'au rechargement / changement d'onglet (refetch focus TanStack).
--
-- Le broadcast depuis la base (`realtime.send`) contourne cette RLS par-ligne : il pousse un
-- simple signal de refetch sur un canal public par client. Aucune donnée sensible n'est
-- transmise (juste l'op + la table) — la donnée réelle est re-fetchée côté client via une
-- requête serveur RLS-protégée. Même pattern éprouvé que `broadcast_documents_change`.

CREATE OR REPLACE FUNCTION public.broadcast_parcours_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  cid uuid;
BEGIN
  cid := COALESCE(NEW.client_id, OLD.client_id);
  IF cid IS NOT NULL THEN
    BEGIN
      PERFORM realtime.send(
        jsonb_build_object('op', TG_OP, 'table', TG_TABLE_NAME),  -- payload non sensible
        'parcours_changed',                                        -- event
        'parcours:' || cid::text,                                  -- topic : un canal par client
        false                                                      -- canal public (signal de refetch)
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;  -- ne JAMAIS bloquer le DML si le broadcast échoue
    END;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_client_parcours_agents ON public.client_parcours_agents;
CREATE TRIGGER trg_broadcast_client_parcours_agents
AFTER INSERT OR UPDATE OR DELETE ON public.client_parcours_agents
FOR EACH ROW EXECUTE FUNCTION public.broadcast_parcours_change();

DROP TRIGGER IF EXISTS trg_broadcast_parcours ON public.parcours;
CREATE TRIGGER trg_broadcast_parcours
AFTER INSERT OR UPDATE OR DELETE ON public.parcours
FOR EACH ROW EXECUTE FUNCTION public.broadcast_parcours_change();

DROP TRIGGER IF EXISTS trg_broadcast_step_submissions ON public.step_submissions;
CREATE TRIGGER trg_broadcast_step_submissions
AFTER INSERT OR UPDATE OR DELETE ON public.step_submissions
FOR EACH ROW EXECUTE FUNCTION public.broadcast_parcours_change();
