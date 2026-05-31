-- Migration 00132 — « Feuille de route Élio » unifiée
--
-- Remplace le modèle « bulle brute » (00131, type elio_questions) par une vraie
-- feuille de route CACHÉE : MiKL injecte des consignes que seul Élio voit, qui
-- orientent ses prochaines questions, et l'étape repart au client.
--
-- L'injection (depuis une soumission au Hub) fait 3 choses atomiquement :
--   1. Stocke la feuille de route dans client_step_contexts (consommée par Élio, jamais
--      montrée telle quelle au client).
--   2. Renvoie l'étape au client : client_parcours_agents pending_review → active,
--      step_submissions pending → rejected, validation_requests en cours → rejected.
--   3. Notifie le client.
--
-- p_step_id = client_parcours_agents.id (système courant, cf. 00115/00118).

CREATE OR REPLACE FUNCTION inject_elio_roadmap(
  p_step_id UUID,
  p_client_id UUID,
  p_content TEXT
) RETURNS UUID AS $$
DECLARE
  v_context_id UUID;
  v_client_auth_id UUID;
  v_step_order INTEGER;
BEGIN
  -- Autorisation : opérateurs uniquement (auth.uid() reflète l'appelant même en SECURITY DEFINER).
  IF NOT is_operator() THEN
    RAISE EXCEPTION 'Accès refusé — opérateurs uniquement' USING ERRCODE = 'P0001';
  END IF;

  -- 1. Stocker la feuille de route (contexte caché pour Élio)
  INSERT INTO client_step_contexts (client_id, client_parcours_agent_id, context_message, content_type)
  VALUES (p_client_id, p_step_id, p_content, 'text')
  RETURNING id INTO v_context_id;

  -- 2. Renvoyer l'étape au client (si elle est en attente d'examen)
  SELECT step_order INTO v_step_order
  FROM client_parcours_agents
  WHERE id = p_step_id;

  UPDATE client_parcours_agents
  SET status = 'active', updated_at = NOW()
  WHERE id = p_step_id
    AND status = 'pending_review';

  -- Marquer la soumission en cours comme à réviser
  UPDATE step_submissions
  SET status = 'rejected', feedback_at = NOW(), updated_at = NOW()
  WHERE parcours_step_id = p_step_id
    AND client_id = p_client_id
    AND status = 'pending';

  -- Clôturer la demande de validation en file (le Hub la retire de sa liste)
  UPDATE validation_requests
  SET status = 'rejected', reviewed_at = NOW(), updated_at = NOW()
  WHERE step_id = p_step_id
    AND client_id = p_client_id
    AND type = 'step_submission'
    AND status IN ('pending', 'needs_clarification');

  -- 3. Notifier le client
  SELECT auth_user_id INTO v_client_auth_id
  FROM clients
  WHERE id = p_client_id;

  IF v_client_auth_id IS NOT NULL THEN
    INSERT INTO notifications (recipient_type, recipient_id, type, title, body, link, created_at)
    VALUES (
      'client',
      v_client_auth_id,
      'validation',
      'Élio a de nouvelles questions pour toi',
      'Reprends ton étape : Élio va t''aider à affiner avant de resoumettre.',
      CASE
        WHEN v_step_order IS NOT NULL THEN '/modules/parcours/steps/' || v_step_order::TEXT
        ELSE '/modules/parcours'
      END,
      NOW()
    );
  END IF;

  RETURN v_context_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION inject_elio_roadmap(UUID, UUID, TEXT) TO authenticated;
