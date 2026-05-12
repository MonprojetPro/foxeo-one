-- Migration 00122 — Fix RLS step_submissions + SECURITY DEFINER sur RPCs validation
-- Problème : step_submissions_update_operator utilisait auth.uid() pour comparer à
--   clients.operator_id qui stocke operators.id (UUID interne ≠ auth_user_id).
--   → UPDATE silencieusement ignoré → badge statut jamais mis à jour côté client.
-- Fix 1 : RLS policy corrigée avec fn_get_operator_id() (retourne operators.id depuis JWT).
-- Fix 2 : reject/approve_validation_request passés en SECURITY DEFINER → bypass RLS
--   (fonctions internes avec leur propre vérification d'autorisation).
-- Fix 3 : sync rétroactif de la soumission actuellement bloquée.

-- ============================================================
-- 1. Corriger les RLS policies step_submissions
-- ============================================================

DROP POLICY IF EXISTS step_submissions_select_operator ON step_submissions;
DROP POLICY IF EXISTS step_submissions_update_operator ON step_submissions;

CREATE POLICY step_submissions_select_operator ON step_submissions
  FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE operator_id = fn_get_operator_id()
  ));

CREATE POLICY step_submissions_update_operator ON step_submissions
  FOR UPDATE
  USING (client_id IN (
    SELECT id FROM clients WHERE operator_id = fn_get_operator_id()
  ));

-- ============================================================
-- 2. Passer reject_validation_request en SECURITY DEFINER
-- ============================================================

CREATE OR REPLACE FUNCTION reject_validation_request(
  p_request_id UUID,
  p_comment TEXT,
  p_operator_id UUID
) RETURNS validation_requests AS $$
DECLARE
  v_request validation_requests;
  v_client_auth_id UUID;
  v_step_order INTEGER;
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

  IF v_request.type = 'step_submission' AND v_request.step_id IS NOT NULL THEN
    SELECT step_order INTO v_step_order
    FROM client_parcours_agents
    WHERE id = v_request.step_id;

    UPDATE client_parcours_agents
    SET status = 'active', updated_at = NOW()
    WHERE id = v_request.step_id;

    UPDATE step_submissions
    SET
      status = 'rejected',
      feedback = p_comment,
      feedback_at = NOW(),
      updated_at = NOW()
    WHERE parcours_step_id = v_request.step_id
      AND client_id = v_request.client_id
      AND status = 'pending';

    INSERT INTO step_feedback_injections (step_id, operator_id, client_id, content, type)
    VALUES (v_request.step_id, p_operator_id, v_request.client_id, p_comment, 'text_feedback');
  END IF;

  IF v_request.type = 'brief_lab' AND v_request.step_id IS NOT NULL THEN
    INSERT INTO step_feedback_injections (step_id, operator_id, client_id, content, type)
    VALUES (v_request.step_id, p_operator_id, v_request.client_id, p_comment, 'text_feedback');
  END IF;

  SELECT auth_user_id INTO v_client_auth_id
  FROM clients
  WHERE id = v_request.client_id;

  IF v_client_auth_id IS NOT NULL THEN
    INSERT INTO notifications (recipient_type, recipient_id, type, title, body, link, created_at)
    VALUES (
      'client',
      v_client_auth_id,
      'validation',
      'MiKL a demandé des corrections — ' || v_request.title,
      p_comment,
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

-- ============================================================
-- 3. Passer approve_validation_request en SECURITY DEFINER
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

  IF v_request.type = 'step_submission' AND v_request.step_id IS NOT NULL THEN
    SELECT step_order INTO v_step_order
    FROM client_parcours_agents
    WHERE id = v_request.step_id;

    UPDATE client_parcours_agents
    SET status = 'completed', updated_at = NOW()
    WHERE id = v_request.step_id;

    UPDATE step_submissions
    SET
      status = 'approved',
      feedback = p_comment,
      feedback_at = NOW(),
      updated_at = NOW()
    WHERE parcours_step_id = v_request.step_id
      AND client_id = v_request.client_id
      AND status = 'pending';

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
      COALESCE(p_comment, 'Félicitations, votre document a été validé.'),
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

-- ============================================================
-- 4. Sync rétroactif : corriger les soumissions bloquées en 'pending'
--    alors que leur validation_request est 'rejected' ou 'approved'
-- ============================================================

UPDATE step_submissions ss
SET
  status      = vr.status,
  feedback    = vr.reviewer_comment,
  feedback_at = vr.reviewed_at,
  updated_at  = NOW()
FROM validation_requests vr
WHERE vr.step_id   = ss.parcours_step_id
  AND vr.client_id = ss.client_id
  AND vr.type      = 'step_submission'
  AND vr.status    IN ('approved', 'rejected')
  AND ss.status    = 'pending';
