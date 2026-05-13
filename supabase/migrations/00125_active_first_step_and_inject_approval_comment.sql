-- Migration 00125 — Activation étape 1 au lancement + injection commentaire validation
--
-- 2 corrections cumulées :
-- 1. launchClientParcours créait toutes les étapes en 'pending' → le client ne pouvait rien faire.
--    Fix rétroactif : pour les clients dont aucune étape n'est encore active/completed/pending_review,
--    on bascule l'étape step_order=1 à 'active'.
-- 2. Le commentaire optionnel de validation MiKL n'était pas injecté dans step_feedback_injections
--    → client ne voyait jamais le message d'encouragement / contextualisation.
--    Fix : modifier la RPC approve_validation_request pour insérer le commentaire s'il est non vide.

-- ============================================================
-- 1. Sync rétroactif : activer l'étape 1 des parcours bloqués
-- ============================================================

UPDATE client_parcours_agents cpa
SET status = 'active', updated_at = NOW()
WHERE cpa.step_order = 1
  AND cpa.status = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM client_parcours_agents cpa2
    WHERE cpa2.client_id = cpa.client_id
      AND cpa2.status IN ('active', 'completed', 'pending_review')
  );

-- ============================================================
-- 2. RPC approve_validation_request — injecter commentaire en feedback
-- ============================================================

CREATE OR REPLACE FUNCTION approve_validation_request(
  p_request_id UUID,
  p_comment TEXT,
  p_operator_id UUID
) RETURNS validation_requests AS $$
DECLARE
  v_request validation_requests;
  v_client_auth_id UUID;
  v_next_step_id UUID;
  v_step_order INTEGER;
  v_trimmed_comment TEXT;
BEGIN
  SELECT * INTO v_request
  FROM validation_requests
  WHERE id = p_request_id
    AND operator_id = p_operator_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or unauthorized' USING ERRCODE = 'P0001';
  END IF;

  IF v_request.status NOT IN ('pending', 'needs_clarification') THEN
    RAISE EXCEPTION 'Request cannot be approved in status: %', v_request.status USING ERRCODE = 'P0002';
  END IF;

  UPDATE validation_requests
  SET
    status = 'approved',
    reviewer_comment = p_comment,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  v_trimmed_comment := NULLIF(TRIM(COALESCE(p_comment, '')), '');

  -- Soumission étape (nouveau système)
  IF v_request.type = 'step_submission' AND v_request.step_id IS NOT NULL THEN
    SELECT step_order INTO v_step_order
    FROM client_parcours_agents
    WHERE id = v_request.step_id;

    -- Marquer l'étape comme complétée
    UPDATE client_parcours_agents
    SET status = 'completed', updated_at = NOW()
    WHERE id = v_request.step_id;

    -- Marquer la soumission comme approuvée
    UPDATE step_submissions
    SET
      status = 'approved',
      feedback = p_comment,
      feedback_at = NOW(),
      updated_at = NOW()
    WHERE parcours_step_id = v_request.step_id
      AND client_id = v_request.client_id
      AND status = 'pending';

    -- Injecter le commentaire de validation dans la sidebar étape (visible côté client)
    IF v_trimmed_comment IS NOT NULL THEN
      INSERT INTO step_feedback_injections (step_id, operator_id, client_id, content, type)
      VALUES (v_request.step_id, p_operator_id, v_request.client_id, v_trimmed_comment, 'text_feedback');
    END IF;

    -- Activer la prochaine étape 'pending'
    SELECT id INTO v_next_step_id
    FROM client_parcours_agents
    WHERE client_id = v_request.client_id
      AND status = 'pending'
    ORDER BY step_order ASC
    LIMIT 1;

    IF v_next_step_id IS NOT NULL THEN
      UPDATE client_parcours_agents
      SET status = 'active', updated_at = NOW()
      WHERE id = v_next_step_id;
    END IF;
  END IF;

  -- Brief Lab (ancien système) — inchangé
  IF v_request.type = 'brief_lab'
    AND v_request.step_id IS NOT NULL
    AND v_request.parcours_id IS NOT NULL
  THEN
    UPDATE parcours_steps
    SET status = 'completed', completed_at = NOW(), updated_at = NOW()
    WHERE id = v_request.step_id;

    SELECT id INTO v_next_step_id
    FROM parcours_steps
    WHERE parcours_id = v_request.parcours_id
      AND status = 'locked'
    ORDER BY step_number ASC
    LIMIT 1;

    IF v_next_step_id IS NOT NULL THEN
      UPDATE parcours_steps
      SET status = 'current', updated_at = NOW()
      WHERE id = v_next_step_id;
    ELSE
      UPDATE parcours
      SET status = 'termine', completed_at = NOW(), updated_at = NOW()
      WHERE id = v_request.parcours_id;
    END IF;
  END IF;

  -- Notification client
  SELECT auth_user_id INTO v_client_auth_id
  FROM clients
  WHERE id = v_request.client_id;

  IF v_client_auth_id IS NOT NULL THEN
    INSERT INTO notifications (recipient_type, recipient_id, type, title, body, link, created_at)
    VALUES (
      'client',
      v_client_auth_id,
      'validation',
      'Votre document a été validé ! — ' || v_request.title,
      COALESCE(v_trimmed_comment, 'Félicitations, votre document a été validé.'),
      CASE
        WHEN v_request.type = 'step_submission' AND v_step_order IS NOT NULL
          THEN '/modules/parcours/steps/' || v_step_order::TEXT
        WHEN v_request.type = 'brief_lab' THEN '/modules/parcours-lab'
        ELSE '/modules/parcours'
      END,
      NOW()
    );
  END IF;

  RETURN v_request;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
