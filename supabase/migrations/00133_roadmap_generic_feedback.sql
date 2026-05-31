-- Migration 00133 — Feuille de route Élio : message client GÉNÉRIQUE (pas le texte brut)
--
-- Problème constaté (2026-05-31) : les questions injectées par MiKL apparaissaient EN CLAIR
-- dans le panneau « FEEDBACK MiKL » côté client (via d'anciennes lignes step_feedback_injections
-- de type elio_questions). MiKL veut un message générique encourageant, le texte brut restant
-- caché (il ne sert qu'à orienter Élio).
--
-- Fix :
--   1. inject_elio_roadmap insère désormais un step_feedback_injections de type 'text_feedback'
--      avec un message GÉNÉRIQUE (pas le contenu brut), et renseigne le feedback de la soumission.
--   2. Nettoyage des anciennes lignes step_feedback_injections de type 'elio_questions' (modèle
--      abandonné, jamais censé être visible).

CREATE OR REPLACE FUNCTION inject_elio_roadmap(
  p_step_id UUID,
  p_client_id UUID,
  p_content TEXT
) RETURNS UUID AS $$
DECLARE
  v_context_id UUID;
  v_client_auth_id UUID;
  v_step_order INTEGER;
  v_generic_feedback TEXT := 'MiKL a étudié ton document avec attention. Il manque encore quelques précisions pour que cette étape soit à la hauteur de tes ambitions — continue d''échanger avec Élio juste en dessous : il a été informé des points que MiKL souhaite approfondir, puis régénère ton document.';
BEGIN
  IF NOT is_operator() THEN
    RAISE EXCEPTION 'Accès refusé — opérateurs uniquement' USING ERRCODE = 'P0001';
  END IF;

  -- 1. Feuille de route CACHÉE (contenu brut, oriente Élio uniquement)
  INSERT INTO client_step_contexts (client_id, client_parcours_agent_id, context_message, content_type)
  VALUES (p_client_id, p_step_id, p_content, 'text')
  RETURNING id INTO v_context_id;

  SELECT step_order INTO v_step_order
  FROM client_parcours_agents
  WHERE id = p_step_id;

  -- 2. Renvoyer l'étape au client (si elle est en attente d'examen)
  UPDATE client_parcours_agents
  SET status = 'active', updated_at = NOW()
  WHERE id = p_step_id
    AND status = 'pending_review';

  -- Soumission en cours → à réviser, avec le message générique en feedback
  UPDATE step_submissions
  SET status = 'rejected', feedback = v_generic_feedback, feedback_at = NOW(), updated_at = NOW()
  WHERE parcours_step_id = p_step_id
    AND client_id = p_client_id
    AND status = 'pending';

  -- Demande de validation en file → clôturée (retirée du Hub)
  UPDATE validation_requests
  SET status = 'rejected', reviewer_comment = v_generic_feedback, reviewed_at = NOW(), updated_at = NOW()
  WHERE step_id = p_step_id
    AND client_id = p_client_id
    AND type = 'step_submission'
    AND status IN ('pending', 'needs_clarification');

  -- 3. Message VISIBLE générique dans le panneau historique (jamais le texte brut)
  INSERT INTO step_feedback_injections (step_id, operator_id, client_id, content, type)
  VALUES (p_step_id, auth.uid(), p_client_id, v_generic_feedback, 'text_feedback');

  -- 4. Notification client
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

-- Nettoyage : supprimer les anciennes injections brutes de type elio_questions (modèle abandonné)
DELETE FROM step_feedback_injections WHERE type = 'elio_questions';
