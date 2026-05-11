-- Migration 00117 — Flux Lab complet : statut pending_review + RPCs approve/reject
-- Problème résolu : submit → completed (incorrect), refus ne réactivait pas l'étape
-- Flux correct : active → pending_review (soumis) → completed (approuvé) ou active (refusé)

-- 1. Ajouter 'pending_review' au CHECK de client_parcours_agents
ALTER TABLE client_parcours_agents
  DROP CONSTRAINT IF EXISTS client_parcours_agents_status_check;

ALTER TABLE client_parcours_agents
  ADD CONSTRAINT client_parcours_agents_status_check
    CHECK (status IN ('pending', 'active', 'pending_review', 'completed', 'skipped'));

-- 2. Mettre à jour approve_validation_request
--    → gère step_submission : set 'completed' sur client_parcours_agents
CREATE OR REPLACE FUNCTION approve_validation_request(
  p_request_id UUID,
  p_comment TEXT,
  p_operator_id UUID
) RETURNS validation_requests AS $$
DECLARE
  v_request validation_requests;
  v_client_auth_id UUID;
  v_next_step_id UUID;
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

  -- Soumission étape (nouveau système) : marquer l'étape completed
  IF v_request.type = 'step_submission' AND v_request.step_id IS NOT NULL THEN
    UPDATE client_parcours_agents
    SET status = 'completed', updated_at = NOW()
    WHERE id = v_request.step_id;

    -- Activer la prochaine étape 'pending' du même client
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

  -- Brief Lab (ancien système) : avance les parcours_steps
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
      'Votre document "' || v_request.title || '" a été validé !',
      p_comment,
      CASE
        WHEN v_request.type = 'step_submission' THEN '/modules/parcours'
        WHEN v_request.type = 'brief_lab' THEN '/modules/parcours-lab'
        ELSE NULL
      END,
      NOW()
    );
  END IF;

  RETURN v_request;
END;
$$ LANGUAGE plpgsql;

-- 3. Mettre à jour reject_validation_request
--    → gère step_submission : remet l'étape à 'active' pour que le client puisse resoumettre
CREATE OR REPLACE FUNCTION reject_validation_request(
  p_request_id UUID,
  p_comment TEXT,
  p_operator_id UUID
) RETURNS validation_requests AS $$
DECLARE
  v_request validation_requests;
  v_client_auth_id UUID;
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
    RAISE EXCEPTION 'Request cannot be rejected in status: %', v_request.status USING ERRCODE = 'P0002';
  END IF;

  UPDATE validation_requests
  SET
    status = 'rejected',
    reviewer_comment = p_comment,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  -- Soumission étape : réactiver l'étape pour que le client puisse resoumettre
  IF v_request.type = 'step_submission' AND v_request.step_id IS NOT NULL THEN
    UPDATE client_parcours_agents
    SET status = 'active', updated_at = NOW()
    WHERE id = v_request.step_id;
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
      'MiKL a demandé des modifications sur "' || v_request.title || '"',
      p_comment,
      CASE
        WHEN v_request.type = 'step_submission' THEN '/modules/parcours'
        WHEN v_request.type = 'brief_lab' THEN '/modules/parcours-lab'
        ELSE NULL
      END,
      NOW()
    );
  END IF;

  RETURN v_request;
END;
$$ LANGUAGE plpgsql;
