-- Migration 00119 — Sync rétroactif step_submissions.status
-- Les soumissions créées avant migration 00118 ont status='pending' même si déjà décidées.
-- On synchronise avec la décision de la validation_request correspondante.

UPDATE step_submissions ss
SET
  status       = vr.status,
  feedback     = vr.reviewer_comment,
  feedback_at  = vr.reviewed_at,
  updated_at   = NOW()
FROM validation_requests vr
WHERE vr.step_id   = ss.parcours_step_id
  AND vr.client_id = ss.client_id
  AND vr.type      = 'step_submission'
  AND vr.status    IN ('approved', 'rejected')
  AND ss.status    = 'pending';
