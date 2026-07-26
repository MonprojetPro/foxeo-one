-- Migration — Accès dégradé (lecture seule) pour un client qui a résilié
--
-- RÈGLE MÉTIER
-- Un client en `subscription_cancelled` ou `handed_off` n'est PAS expulsé : il garde
-- son espace en consultation (historique de parcours, documents) et surtout il peut
-- TOUJOURS écrire à MiKL (chat, support). Ce n'est pas une punition — c'est une porte
-- laissée ouverte pour qu'il revienne. Ce qu'il perd, c'est la capacité de FAIRE AVANCER
-- son parcours Lab : plus de soumission, plus de demande de validation, plus de
-- changement d'état d'étape. Son espace est « figé ».
--
-- POURQUOI EN BASE ET PAS SEULEMENT DANS L'INTERFACE
-- Masquer les boutons ne protège rien : les Server Actions et l'API PostgREST restent
-- appelables directement avec le JWT du client. Le verrou doit donc vivre dans la RLS.
--
-- POURQUOI DES POLICIES `RESTRICTIVE` PLUTÔT QUE RÉÉCRIRE LES POLICIES EXISTANTES
-- Une policy RESTRICTIVE se combine en ET avec les policies permissives déjà en place :
-- on ajoute une condition sans réécrire (donc sans risquer de mal retranscrire) les
-- policies qui font vivre TOUS les clients actifs. Le pire cas d'une erreur ici est un
-- refus d'écriture pour un client résilié — jamais une ouverture de données, jamais une
-- régression pour un client actif, dont le statut fait retourner TRUE à la fonction.

-- ============================================================
-- ① Helpers RLS — même style que is_owner() / is_operator() (00011)
-- ============================================================

-- Variante scopée à une ligne : « cette ligne appartient-elle à un client encore
-- autorisé à écrire ? ». Utilisée sur les tables qui portent une colonne client_id.
--
-- Deux noms distincts plutôt qu'une surcharge (une même fonction en 0 et 1 argument) :
-- une surcharge PostgREST se résout en erreur 300 « Multiple Choices » difficile à
-- diagnostiquer si la fonction est un jour appelée en RPC.
CREATE OR REPLACE FUNCTION is_client_write_allowed(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  -- MiKL n'est jamais bridé : il doit pouvoir continuer à gérer le dossier d'un client
  -- résilié (clôturer, archiver, répondre, réactiver).
  IF is_operator() THEN
    RETURN TRUE;
  END IF;

  -- Permissif par défaut : statut inconnu, client introuvable, ligne orpheline → TRUE.
  -- Seuls les deux statuts de fin d'abonnement ferment l'écriture.
  RETURN NOT EXISTS (
    SELECT 1 FROM clients
    WHERE id = p_client_id
      AND status IN ('subscription_cancelled', 'handed_off')
  );
END;
$$;

COMMENT ON FUNCTION is_client_write_allowed(UUID) IS
  'RLS helper: false si le client proprietaire de la ligne a resilie (subscription_cancelled/handed_off). Toujours true pour un operateur.';

-- Variante scopée à la session : pour les tables du parcours qui n'ont pas de colonne
-- client_id (parcours_steps, rattachée au client via parcours).
CREATE OR REPLACE FUNCTION is_current_client_write_allowed()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  IF is_operator() THEN
    RETURN TRUE;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 FROM clients
    WHERE auth_user_id = (SELECT auth.uid())
      AND status IN ('subscription_cancelled', 'handed_off')
  );
END;
$$;

COMMENT ON FUNCTION is_current_client_write_allowed() IS
  'RLS helper: false si le client connecte a resilie (subscription_cancelled/handed_off). Toujours true pour un operateur.';

GRANT EXECUTE ON FUNCTION is_client_write_allowed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_client_write_allowed() TO authenticated;

-- ============================================================
-- ② Verrous d'écriture — tables du parcours Lab qui doivent être « figées »
-- ============================================================

-- step_submissions — soumettre le travail d'une étape.
DROP POLICY IF EXISTS step_submissions_insert_not_cancelled ON public.step_submissions;
CREATE POLICY step_submissions_insert_not_cancelled
  ON public.step_submissions
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (is_client_write_allowed(client_id));

-- validation_requests — demander une validation à MiKL sur une étape.
-- ⚠️ Ne concerne QUE la demande de validation du parcours : le chat et le support,
-- eux, restent grands ouverts (voir §③).
DROP POLICY IF EXISTS validation_requests_insert_not_cancelled ON public.validation_requests;
CREATE POLICY validation_requests_insert_not_cancelled
  ON public.validation_requests
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (is_client_write_allowed(client_id));

-- parcours — le client ne peut écrire ici que pour demander l'abandon de son parcours
-- (status = 'abandoned'). Un parcours figé n'a plus à être abandonné.
DROP POLICY IF EXISTS parcours_insert_not_cancelled ON public.parcours;
CREATE POLICY parcours_insert_not_cancelled
  ON public.parcours
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (is_client_write_allowed(client_id));

DROP POLICY IF EXISTS parcours_update_not_cancelled ON public.parcours;
CREATE POLICY parcours_update_not_cancelled
  ON public.parcours
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (is_client_write_allowed(client_id))
  WITH CHECK (is_client_write_allowed(client_id));

-- parcours_steps — changement d'état d'une étape (ancien système). Pas de colonne
-- client_id sur cette table → variante scopée à la session.
DROP POLICY IF EXISTS parcours_steps_update_not_cancelled ON public.parcours_steps;
CREATE POLICY parcours_steps_update_not_cancelled
  ON public.parcours_steps
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (is_current_client_write_allowed())
  WITH CHECK (is_current_client_write_allowed());

-- client_parcours_agents — avancement des agents (nouveau système). Aujourd'hui les
-- policies d'écriture sont déjà réservées à l'opérateur ; le verrou est posé par
-- anticipation, pour qu'une future policy client n'ouvre pas le parcours d'un résilié
-- sans qu'on y repense.
DROP POLICY IF EXISTS client_parcours_agents_insert_not_cancelled ON public.client_parcours_agents;
CREATE POLICY client_parcours_agents_insert_not_cancelled
  ON public.client_parcours_agents
  AS RESTRICTIVE
  FOR INSERT
  TO public
  WITH CHECK (is_client_write_allowed(client_id));

DROP POLICY IF EXISTS client_parcours_agents_update_not_cancelled ON public.client_parcours_agents;
CREATE POLICY client_parcours_agents_update_not_cancelled
  ON public.client_parcours_agents
  AS RESTRICTIVE
  FOR UPDATE
  TO public
  USING (is_client_write_allowed(client_id))
  WITH CHECK (is_client_write_allowed(client_id));

-- ============================================================
-- ③ Tables VOLONTAIREMENT laissées ouvertes — ne pas « compléter » cette migration
-- ============================================================
--
-- Le besoin est explicite : « comme ça il peut toujours consulter ses documents, et me
-- contacter s'il veut autre chose ». Verrouiller l'une de ces tables casserait le seul
-- canal qui permet au client de revenir.
--
--   messages                    → chat MiKL. Le canal de retour. Intouchable.
--   support_tickets             → support. Idem.
--   notifications               → doit continuer à recevoir (et marquer comme lu).
--   notification_preferences    → réglages personnels, sans effet sur le parcours.
--   client_concierge_messages   → Élio Concierge, module de famille « relation ».
--   elio_conversations/messages → Élio reste accessible (One ET Lab). Le bridage des
--                                 écritures Élio LIÉES AU PARCOURS est fait côté
--                                 Server Action, car la RLS ne distingue pas ici un
--                                 échange Élio One d'un échange Élio d'étape.
--   documents / document_folders→ le client doit pouvoir télécharger ET joindre un
--                                 fichier à un message pour MiKL. L'upload ne fait
--                                 avancer aucune étape puisque step_submissions est
--                                 verrouillé en amont.
--   tool_post_comments          → module « suivi de l'outil », famille relation :
--                                 commenter = parler à MiKL.
--   client_step_contexts        → la branche client est limitée à `consumed_at`, un
--                                 simple accusé de lecture.
--   step_feedback_injections    → branche client limitée à `read_at`, accusé de lecture.
--   consents / user_preferences → consentements et préférences, jamais du parcours.
