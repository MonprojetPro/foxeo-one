-- Migration 00124 — Sync rétroactif : step_feedback_injections pour demandes de précision
-- Cause : request-clarification.ts n'insérait pas dans step_feedback_injections
-- Fix   : créer les injections manquantes pour les validation_requests needs_clarification

INSERT INTO step_feedback_injections (step_id, operator_id, client_id, content, type, injected_at)
SELECT
  vr.step_id,
  vr.operator_id,
  vr.client_id,
  vr.reviewer_comment,
  'text_feedback',
  COALESCE(vr.reviewed_at, vr.updated_at)
FROM validation_requests vr
WHERE vr.type = 'step_submission'
  AND vr.status = 'needs_clarification'
  AND vr.step_id IS NOT NULL
  AND vr.reviewer_comment IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM step_feedback_injections fi
    WHERE fi.step_id   = vr.step_id
      AND fi.client_id = vr.client_id
      AND fi.content   = vr.reviewer_comment
      AND fi.type      = 'text_feedback'
  );
