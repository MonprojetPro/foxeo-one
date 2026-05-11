-- Migration 00120 — Sync rétroactif step_feedback_injections
-- Les refus créés avant migration 00118 n'ont pas de ligne dans step_feedback_injections
-- car l'ancien reject RPC ne l'insérait pas. On comble ce manque ici.

INSERT INTO step_feedback_injections (step_id, operator_id, client_id, content, type)
SELECT
  vr.step_id,
  vr.operator_id,
  vr.client_id,
  vr.reviewer_comment,
  'text_feedback'
FROM validation_requests vr
WHERE vr.type = 'step_submission'
  AND vr.status IN ('rejected', 'needs_clarification')
  AND vr.reviewer_comment IS NOT NULL
  AND vr.step_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM step_feedback_injections sfi
    WHERE sfi.step_id = vr.step_id
      AND sfi.client_id = vr.client_id
  );
