-- Story 13.3 (correctif 2026-07-25) — Clôture d'une session d'impersonation avec
-- décompte RÉEL des actions.
--
-- Problème résolu : `actions_count` n'était jamais juste.
--   1. La fermeture normale (bouton « Fermer la session » de la bannière, exécutée avec
--      la session du CLIENT) ne mettait pas `actions_count` du tout.
--   2. La fermeture côté Hub comptait `activity_logs` filtré sur l'opérateur, ce qui
--      n'attrapait que les événements de cycle de vie → toujours 1.
--   3. Le client ne PEUT PAS compter lui-même : aucune policy SELECT sur activity_logs
--      ne lui est accordée (table interne opérateur, cf. 00007). Un count côté client
--      renverrait donc 0 en silence.
--
-- D'où cette fonction SECURITY DEFINER : elle compte côté serveur, hors RLS, et sert de
-- point d'entrée unique aux deux chemins de fermeture (bannière client ET Hub).
--
-- Autorisation : soit le client emprunté lui-même (fermeture depuis la bannière), soit
-- un opérateur (fermeture depuis le Hub). Personne d'autre.

CREATE OR REPLACE FUNCTION fn_close_impersonation_session(
  p_session_id UUID,
  p_status TEXT DEFAULT 'ended'
)
RETURNS TABLE (session_id UUID, actions_count INTEGER, closed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session   impersonation_sessions;
  v_count     INTEGER;
  v_is_client BOOLEAN;
BEGIN
  IF p_status NOT IN ('ended', 'expired') THEN
    RAISE EXCEPTION 'Statut de clôture invalide: %', p_status;
  END IF;

  SELECT * INTO v_session
  FROM impersonation_sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT p_session_id, 0, FALSE;
    RETURN;
  END IF;

  v_is_client := v_session.client_auth_user_id = auth.uid();

  IF NOT v_is_client AND NOT is_operator() THEN
    RAISE EXCEPTION 'Non autorisé à clore cette session';
  END IF;

  -- Actions réelles de la session : les mutations journalisées par le middleware,
  -- hors événements de cycle de vie (démarrage / fin), qui ne sont pas des actions.
  SELECT count(*)::INTEGER INTO v_count
  FROM activity_logs
  WHERE metadata->>'session_id' = p_session_id::TEXT
    AND actor_type = 'operator_impersonation'
    AND action NOT IN ('impersonation_started', 'impersonation_ended');

  -- Idempotent : une session déjà close garde son horodatage de fin, mais on
  -- rafraîchit le décompte (un log peut arriver juste avant la clôture).
  UPDATE impersonation_sessions
  SET status = CASE WHEN status = 'active' THEN p_status ELSE status END,
      ended_at = COALESCE(ended_at, now()),
      actions_count = v_count
  WHERE id = p_session_id;

  RETURN QUERY SELECT p_session_id, v_count, TRUE;
END;
$$;

COMMENT ON FUNCTION fn_close_impersonation_session(UUID, TEXT) IS
  'Clôt une session d''impersonation et recalcule actions_count depuis activity_logs. Appelable par le client emprunté ou un opérateur.';

REVOKE ALL ON FUNCTION fn_close_impersonation_session(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_close_impersonation_session(UUID, TEXT) TO authenticated;
