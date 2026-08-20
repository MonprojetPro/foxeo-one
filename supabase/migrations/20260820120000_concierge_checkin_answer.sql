-- Élio One — la prise de nouvelles devient une QUESTION à laquelle le client répond (2026-08-20)
--
-- Décision produit MiKL du 2026-08-20 : le mot « project_checkin » ne doit plus enterrer
-- définitivement le mot précédent. Il pose une question, le client y répond en un clic :
--   • « Oui, tout va bien »   → le mot est marqué répondu et DISPARAÎT du bandeau,
--                                le mot précédent (livraison, évolution…) reprend sa place ;
--   • « Non, c'est pas top »  → même effet côté bandeau, mais le chat Élio s'ouvre pour
--                                que le client raconte — et Élio relaie à MiKL AVEC son accord
--                                (jeton [[prevenir-mikl:…]], garde-fou inchangé).
--
-- Trois volets ici :
--   1. Colonnes de réponse (answered_at / answer_choice) + lien vers la notification cloche.
--   2. RPC answer_one_checkin() — le SEUL chemin d'écriture côté client (pas de policy UPDATE
--      ouverte : une policy UPDATE laisserait le client réécrire le `body` du mot d'Élio).
--   3. Broadcast Realtime élargi à l'UPDATE de réponse → le bandeau se met à jour en direct.
--
-- ⚠️ Le cooldown de find_one_clients_for_checkin n'est VOLONTAIREMENT pas filtré sur
-- answered_at : un mot répondu doit continuer de compter comme « contact récent », sinon le
-- cron reprendrait des nouvelles dès le lendemain de la réponse.

-- ============================================================
-- 1. Colonnes de réponse
-- ============================================================

ALTER TABLE public.client_concierge_messages
  ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS answer_choice TEXT,
  ADD COLUMN IF NOT EXISTS notification_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_concierge_messages_answer_choice_check'
  ) THEN
    ALTER TABLE public.client_concierge_messages
      ADD CONSTRAINT client_concierge_messages_answer_choice_check
      CHECK (answer_choice IS NULL OR answer_choice IN ('ok', 'not_ok'));
  END IF;
END $$;

COMMENT ON COLUMN public.client_concierge_messages.answered_at IS
  'Horodatage de la reponse du client a une prise de nouvelles (event_type=project_checkin). NULL = pas encore repondu. Un mot repondu n est plus affiche dans le bandeau One : le mot precedent reprend sa place.';

COMMENT ON COLUMN public.client_concierge_messages.answer_choice IS
  'Reponse du client : ok (tout va bien) | not_ok (quelque chose ne va pas, le chat Elio s ouvre). NULL tant que non repondu.';

COMMENT ON COLUMN public.client_concierge_messages.notification_id IS
  'Notification cloche emise avec ce mot (cron one-project-checkin). Permet de l eteindre quand le client repond : un badge doit s eteindre quand l evenement est traite.';

-- Lecture « dernier mot AFFICHABLE » (getOneConciergeWord) : filtre answered_at IS NULL.
CREATE INDEX IF NOT EXISTS idx_concierge_messages_client_context_unanswered
  ON public.client_concierge_messages(client_id, dashboard_context, created_at DESC)
  WHERE answered_at IS NULL;

-- Lecture Hub « qui a repondu quoi » (listCheckinAnswers).
CREATE INDEX IF NOT EXISTS idx_concierge_messages_checkin_answered
  ON public.client_concierge_messages(answered_at DESC)
  WHERE event_type = 'project_checkin' AND answered_at IS NOT NULL;

-- ============================================================
-- 2. RPC de réponse — seul chemin d'écriture côté client
-- ============================================================

-- SECURITY DEFINER plutôt qu'une policy UPDATE : on veut autoriser le client à écrire
-- EXACTEMENT deux colonnes sur SON mot, sans lui ouvrir la possibilité de réécrire le texte
-- d'Élio (une policy UPDATE porte sur la ligne entière, pas sur un sous-ensemble de colonnes).
CREATE OR REPLACE FUNCTION public.answer_one_checkin(
  p_message_id uuid,
  p_answer text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_client_id uuid;
  v_notification_id uuid;
  v_auth_user_id uuid;
BEGIN
  IF p_answer NOT IN ('ok', 'not_ok') THEN
    RAISE EXCEPTION 'Reponse invalide: %', p_answer USING ERRCODE = '22023';
  END IF;

  -- Ownership : le mot doit appartenir au client connecté, être une prise de nouvelles,
  -- et ne pas avoir déjà été répondu (une réponse est définitive — pas de va-et-vient).
  SELECT ccm.client_id, ccm.notification_id
    INTO v_client_id, v_notification_id
  FROM public.client_concierge_messages ccm
  JOIN public.clients c ON c.id = ccm.client_id
  WHERE ccm.id = p_message_id
    AND ccm.event_type = 'project_checkin'
    AND ccm.answered_at IS NULL
    AND c.auth_user_id = (SELECT auth.uid());

  IF v_client_id IS NULL THEN
    RETURN false;  -- inexistant, déjà répondu, ou pas à lui : silencieux, jamais d'oracle
  END IF;

  UPDATE public.client_concierge_messages
     SET answered_at = now(),
         answer_choice = p_answer
   WHERE id = p_message_id;

  -- Le badge de la cloche s'éteint : l'événement a été traité par le client.
  -- (Règle « un badge = un événement non lu, jamais un état ».)
  IF v_notification_id IS NOT NULL THEN
    SELECT c.auth_user_id INTO v_auth_user_id
    FROM public.clients c WHERE c.id = v_client_id;

    UPDATE public.notifications
       SET read_at = now()
     WHERE id = v_notification_id
       AND recipient_id = v_auth_user_id
       AND read_at IS NULL;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.answer_one_checkin(uuid, text) IS
  'Le client repond a une prise de nouvelles d Elio One (ok | not_ok). Verifie l ownership via clients.auth_user_id, marque le mot repondu (il disparait du bandeau au profit du precedent) et eteint la notification cloche associee. Retourne false sans rien reveler si le mot n existe pas, est deja repondu ou appartient a un autre client.';

REVOKE EXECUTE ON FUNCTION public.answer_one_checkin(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.answer_one_checkin(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.answer_one_checkin(uuid, text) TO authenticated;

-- ============================================================
-- 3. Broadcast Realtime — inclure l'UPDATE de réponse
-- ============================================================

-- Le trigger One ne broadcastait que l'INSERT. Sans ce complément, le client cliquerait
-- « Oui, tout va bien » sans que le bandeau ne change avant un rechargement de page —
-- exactement le symptôme « faut que je rafraîchisse pour voir ».
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

  -- Sur UPDATE : ne broadcaster que si la réponse a changé. Les autres UPDATE (pose du
  -- notification_id par le cron, juste après l'INSERT) ne changent rien à l'affichage.
  IF TG_OP = 'UPDATE' AND NEW.answered_at IS NOT DISTINCT FROM OLD.answered_at THEN
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
  AFTER INSERT OR UPDATE ON public.client_concierge_messages
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_one_concierge_change();

-- Le trigger Lab reste strictement AFTER INSERT : le Lab n'a pas de mot répondable.
