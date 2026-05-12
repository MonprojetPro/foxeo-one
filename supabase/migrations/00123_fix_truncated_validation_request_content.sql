-- Migration 00123 — Corriger les contenus tronqués dans validation_requests
-- Cause : submit-generated-document.ts stockait content.substring(0, 500)
-- Fix   : restaurer le contenu complet depuis step_submissions.submission_content

UPDATE validation_requests vr
SET content = ss.submission_content,
    updated_at = NOW()
FROM step_submissions ss
WHERE vr.step_id = ss.parcours_step_id
  AND vr.client_id = ss.client_id
  AND vr.type = 'step_submission'
  AND length(vr.content) = 500
  AND length(ss.submission_content) > 500;
