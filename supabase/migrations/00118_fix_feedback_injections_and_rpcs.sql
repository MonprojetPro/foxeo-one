-- Migration 00118 — Fix complet flux Lab : feedback MiKL + step_submissions + liens notifs
-- Problèmes résolus :
-- 1. step_feedback_injections.step_id avait FK → parcours_steps (bloquait insert nouveaux steps)
-- 2. reject/approve RPC ne mettaient pas à jour step_submissions.status
-- 3. reject RPC n'insérait pas le commentaire dans step_feedback_injections
-- 4. Liens notifs client pointaient vers /modules/parcours (générique)

-- ============================================================
-- 1. Supprimer la FK step_feedback_injections.step_id → parcours_steps
--    step_id peut maintenant référencer client_parcours_agents.id aussi
-- ============================================================

ALTER TABLE step_feedback_injections
  DROP CONSTRAINT IF EXISTS step_feedback_injections_step_id_fkey;

-- ============================================================
-- 2. Mettre à jour reject_validation_request
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

  -- Soumission étape (nouveau système)
  IF v_request.type = 'step_submission' AND v_request.step_id IS NOT NULL THEN
    -- Récupérer le numéro d'étape pour le lien de notification
    SELECT step_order INTO v_step_order
    FROM client_parcours_agents
    WHERE id = v_request.step_id;

    -- Réactiver l'étape pour que le client puisse resoumettre
    UPDATE client_parcours_agents
    SET status = 'active', updated_at = NOW()
    WHERE id = v_request.step_id;

    -- Marquer la soumission comme rejetée
    UPDATE step_submissions
    SET
      status = 'rejected',
      feedback = p_comment,
      feedback_at = NOW(),
      updated_at = NOW()
    WHERE parcours_step_id = v_request.step_id
      AND client_id = v_request.client_id
      AND status = 'pending';

    -- Insérer le feedback de MiKL (visible dans panneau historique étape)
    INSERT INTO step_feedback_injections (step_id, operator_id, client_id, content, type)
    VALUES (v_request.step_id, p_operator_id, v_request.client_id, p_comment, 'text_feedback');
  END IF;

  -- Brief Lab (ancien système) — inchangé
  IF v_request.type = 'brief_lab' AND v_request.step_id IS NOT NULL THEN
    INSERT INTO step_feedback_injections (step_id, operator_id, client_id, content, type)
    VALUES (v_request.step_id, p_operator_id, v_request.client_id, p_comment, 'text_feedback');
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
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Mettre à jour approve_validation_request
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
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. Mettre à jour le CHECK step_submissions.status pour inclure 'rejected' et 'approved'
--    (si le CHECK existe — certaines versions de la migration peuvent ne pas l'avoir)
-- ============================================================

DO $$
BEGIN
  -- Vérifier si la colonne status a un CHECK restrictif
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'step_submissions_status_check'
      AND contype = 'c'
  ) THEN
    ALTER TABLE step_submissions DROP CONSTRAINT step_submissions_status_check;
    ALTER TABLE step_submissions ADD CONSTRAINT step_submissions_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision'));
  END IF;
END $$;
