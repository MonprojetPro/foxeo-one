-- LOT E — approve_validation_request : auto-activation de l'étape suivante UNIQUEMENT en mode tracé.
--
-- En mode 'libre', toutes les étapes activées sont déjà 'active' (navigables en parallèle) :
-- approuver une soumission ne doit PAS déverrouiller « la prochaine pending » (il n'y en a pas,
-- et si une étape réactivée traînait en 'pending', on ne veut surtout pas la promouvoir
-- automatiquement). On lit client_configs.parcours_mode et on saute le déverrouillage en libre.
--
-- Signature identique à 00128 (5 args, 2 DEFAULT NULL) → rétrocompatible avec l'appel à 3 args
-- depuis approve-request.ts. On remplace seulement le corps.

CREATE OR REPLACE FUNCTION approve_validation_request(
  p_request_id UUID,
  p_comment TEXT,
  p_operator_id UUID,
  p_notification_title TEXT DEFAULT NULL,
  p_notification_body TEXT DEFAULT NULL
) RETURNS validation_requests AS $$
DECLARE
  v_request validation_requests;
  v_client_auth_id UUID;
  v_next_step_id UUID;
  v_step_order INTEGER;
  v_trimmed_comment TEXT;
  v_parcours_mode TEXT;
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

    IF v_trimmed_comment IS NOT NULL THEN
      INSERT INTO step_feedback_injections (step_id, operator_id, client_id, content, type)
      VALUES (v_request.step_id, p_operator_id, v_request.client_id, v_trimmed_comment, 'text_feedback');
    END IF;

    -- LOT E — déverrouillage séquentiel UNIQUEMENT en mode tracé.
    SELECT parcours_mode INTO v_parcours_mode
    FROM client_configs
    WHERE client_id = v_request.client_id;

    IF COALESCE(v_parcours_mode, 'tracee') <> 'libre' THEN
      SELECT id INTO v_next_step_id
      FROM client_parcours_agents
      WHERE client_id = v_request.client_id
        AND status = 'pending'
        AND is_enabled = true
      ORDER BY step_order ASC
      LIMIT 1;

      IF v_next_step_id IS NOT NULL THEN
        UPDATE client_parcours_agents
        SET status = 'active', updated_at = NOW()
        WHERE id = v_next_step_id;
      END IF;
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

  -- Notification client (wording personnalisé si fourni, sinon défaut "validation")
  SELECT auth_user_id INTO v_client_auth_id
  FROM clients
  WHERE id = v_request.client_id;

  IF v_client_auth_id IS NOT NULL THEN
    INSERT INTO notifications (recipient_type, recipient_id, type, title, body, link, created_at)
    VALUES (
      'client',
      v_client_auth_id,
      'validation',
      COALESCE(p_notification_title, 'Votre document a été validé ! — ' || v_request.title),
      COALESCE(p_notification_body, v_trimmed_comment, 'Félicitations, votre document a été validé.'),
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
