-- Migration 00131 — Fix injection des questions MiKL dans le chat Élio (type 'elio_questions')
--
-- Problème (Story 14.9) :
--   create-feedback-injection.ts tournait sous la session OPÉRATEUR (MiKL), mais
--   elio_conversations / elio_messages ont une RLS owner-only (auth.uid() = user_id).
--   → le SELECT de la conversation d'étape renvoyait 0 ligne pour l'opérateur
--   → le garde `if (conversation)` interprétait ça comme "client n'a pas commencé"
--   → l'INSERT dans elio_messages était sauté EN SILENCE (erreur jamais vérifiée)
--   → la question n'apparaissait jamais dans le chat client, malgré un toast de succès.
--
--   Le chemin 'text_feedback' fonctionnait, lui, car il passe par les RPC SECURITY DEFINER
--   (reject/approve_validation_request). Le chemin 'elio_questions' n'avait pas d'équivalent.
--
-- Fix :
--   1. RPC inject_elio_questions SECURITY DEFINER (garde is_operator() interne) qui
--      trouve OU crée la conversation d'étape du client, puis insère le message assistant.
--   2. Ajout de elio_messages à la publication Realtime → apparition instantanée côté client.

-- ============================================================
-- 1. RPC SECURITY DEFINER d'injection
-- ============================================================

CREATE OR REPLACE FUNCTION inject_elio_questions(
  p_step_id UUID,
  p_client_id UUID,
  p_content TEXT,
  p_injection_id UUID
) RETURNS UUID AS $$
DECLARE
  v_client_auth_id UUID;
  v_conversation_id UUID;
  v_step_label TEXT;
BEGIN
  -- Autorisation : opérateurs uniquement.
  -- auth.uid() reflète l'appelant (le JWT), même en SECURITY DEFINER.
  IF NOT is_operator() THEN
    RAISE EXCEPTION 'Accès refusé — opérateurs uniquement' USING ERRCODE = 'P0001';
  END IF;

  -- Compte auth du client = propriétaire des conversations Élio.
  SELECT auth_user_id INTO v_client_auth_id
  FROM clients
  WHERE id = p_client_id;

  IF v_client_auth_id IS NULL THEN
    RAISE EXCEPTION 'Client introuvable ou sans compte auth' USING ERRCODE = 'P0002';
  END IF;

  -- Conversation d'étape existante du client (step_id = client_parcours_agents.id, cf. 00115).
  SELECT id INTO v_conversation_id
  FROM elio_conversations
  WHERE step_id = p_step_id
    AND user_id = v_client_auth_id
  LIMIT 1;

  -- Sinon la créer (le client n'a pas encore ouvert le chat de cette étape).
  IF v_conversation_id IS NULL THEN
    SELECT step_label INTO v_step_label
    FROM client_parcours_agents
    WHERE id = p_step_id;

    INSERT INTO elio_conversations (user_id, dashboard_type, title, step_id)
    VALUES (
      v_client_auth_id,
      'lab',
      COALESCE('Étape — ' || v_step_label, 'Conversation étape'),
      p_step_id
    )
    RETURNING id INTO v_conversation_id;
  END IF;

  -- Insérer la question injectée comme message assistant (style orange côté client via metadata.source).
  INSERT INTO elio_messages (conversation_id, role, content, metadata)
  VALUES (
    v_conversation_id,
    'assistant',
    p_content,
    jsonb_build_object('source', 'operator_injection', 'injection_id', p_injection_id)
  );

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION inject_elio_questions(UUID, UUID, TEXT, UUID) TO authenticated;

-- ============================================================
-- 2. Ajouter elio_messages à la publication Realtime (idempotent)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'elio_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE elio_messages;
  END IF;
END $$;
