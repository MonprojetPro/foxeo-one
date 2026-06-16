-- Broadcast realtime des changements de la table `documents`, par client.
--
-- Pourquoi : l'app cliente (Lab/One) doit invalider son cache TanStack Query
-- quand un document change — y compris au RETRAIT DE PARTAGE. Or la policy RLS
-- `documents_select_merged` ne laisse le client voir un doc que si `visibility='shared'` :
-- après un unshare (shared -> private) le client perd l'accès SELECT et ne reçoit donc
-- PAS l'event `postgres_changes` (Realtime applique RLS sur la ligne livrée).
-- Le broadcast depuis la base (`realtime.send`) contourne cette visibilité de ligne :
-- il pousse un simple signal de refetch sur un canal par client.

CREATE OR REPLACE FUNCTION public.broadcast_documents_change()
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
        jsonb_build_object('op', TG_OP),       -- payload non sensible : juste le type d'op
        'documents_changed',                    -- event
        'documents:' || cid::text,              -- topic : un canal par client
        false                                   -- canal public (aucune donnée sensible transmise)
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;  -- ne JAMAIS bloquer le DML documents si le broadcast échoue
    END;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_documents_change ON public.documents;
CREATE TRIGGER trg_broadcast_documents_change
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_documents_change();
