-- Broadcast realtime des changements de `client_configs`, par client.
--
-- Pourquoi (RSC-009) : la config client (elio_lab_enabled = pause globale des agents,
-- dashboard_type = graduation, active_modules, thème…) est lue en SSR par le layout/les pages.
-- RealtimeDashboardRefresh voulait faire un router.refresh() sur un postgres_changes de
-- client_configs, mais la RLS de cette table référence d'autres tables (sous-requête) →
-- l'event UPDATE n'est pas délivré (cf. RSC-009). Résultat : couper le Lab globalement depuis
-- le Hub ne se voyait qu'au rechargement.
--
-- Fix : broadcast DB (même pattern que documents / parcours). Payload non sensible (juste un
-- signal) → le serveur re-rend en SSR au router.refresh() côté client et relit la config fraîche.

CREATE OR REPLACE FUNCTION public.broadcast_client_config_change()
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
        jsonb_build_object('op', TG_OP),
        'client_configs_changed',
        'client_configs:' || cid::text,
        false
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;  -- ne JAMAIS bloquer le DML config si le broadcast échoue
    END;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_client_config_change ON public.client_configs;
CREATE TRIGGER trg_broadcast_client_config_change
AFTER INSERT OR UPDATE OR DELETE ON public.client_configs
FOR EACH ROW EXECUTE FUNCTION public.broadcast_client_config_change();
