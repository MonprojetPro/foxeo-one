-- ============================================================================
-- Migration : sécurisation des RPC validation + Realtime validation_requests
-- Date : 2026-07-03
--
-- Problème 1 (CRITIQUE) : approve_validation_request et reject_validation_request
-- sont SECURITY DEFINER, exposées en RPC à anon+authenticated, sans AUCUN garde
-- interne vérifiant que l'appelant est l'opérateur. Un client authentifié qui
-- connaît l'operator_id (visible dans validation_requests) pouvait auto-approuver
-- ses propres demandes de validation.
-- → Fix : garde is_operator(p_operator_id) en tête de chaque fonction (la
--   surcharge à paramètre vérifie id = p_operator_id AND auth_user_id = auth.uid(),
--   donc SEUL l'utilisateur authentifié qui EST cet opérateur passe) + REVOKE anon.
--
-- Problème 2 : la table validation_requests est absente de la publication
-- supabase_realtime alors que 4 hooks l'écoutent en postgres_changes.
-- → Fix : ajout idempotent à la publication.
--
-- Les corps des fonctions ci-dessous reprennent STRICTEMENT les définitions
-- réellement en base au 2026-07-03 (pg_get_functiondef), seul le garde est ajouté.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1a. approve_validation_request — ajout du garde opérateur
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_validation_request(p_request_id uuid, p_comment text, p_operator_id uuid, p_notification_title text DEFAULT NULL::text, p_notification_body text DEFAULT NULL::text)
 RETURNS validation_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request validation_requests;
  v_client_auth_id UUID;
  v_next_step_id UUID;
  v_step_order INTEGER;
  v_trimmed_comment TEXT;
  v_parcours_mode TEXT;
BEGIN
  -- Garde sécurité : seul un utilisateur authentifié qui EST l'opérateur
  -- p_operator_id peut exécuter (auth.uid() vérifié dans is_operator(uuid)).
  IF NOT is_operator(p_operator_id) THEN
    RAISE EXCEPTION 'Accès refusé : opérateur requis';
  END IF;

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
$function$;

-- ----------------------------------------------------------------------------
-- 1b. reject_validation_request — ajout du garde opérateur
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_validation_request(p_request_id uuid, p_comment text, p_operator_id uuid)
 RETURNS validation_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request validation_requests;
  v_client_auth_id UUID;
  v_step_order INTEGER;
BEGIN
  -- Garde sécurité : seul un utilisateur authentifié qui EST l'opérateur
  -- p_operator_id peut exécuter (auth.uid() vérifié dans is_operator(uuid)).
  IF NOT is_operator(p_operator_id) THEN
    RAISE EXCEPTION 'Accès refusé : opérateur requis';
  END IF;

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
$function$;

-- ----------------------------------------------------------------------------
-- 1c. REVOKE anon — ces RPC n'ont aucun usage non-authentifié
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.approve_validation_request(uuid, text, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_validation_request(uuid, text, uuid) FROM anon;

-- ----------------------------------------------------------------------------
-- 2. Realtime : ajout idempotent de validation_requests à la publication
--    (4 hooks écoutent cette table en postgres_changes)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'validation_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.validation_requests;
  END IF;
END $$;
