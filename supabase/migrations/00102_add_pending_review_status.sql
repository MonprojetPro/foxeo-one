-- Migration 00102: Add 'pending_review' to parcours_steps status + 'step_submission' to validation_requests type
-- Story 14.7 — Bouton "Générer mon document" + soumission

-- ============================================================
-- 1. parcours_steps.status — ajouter 'pending_review'
-- ============================================================

ALTER TABLE parcours_steps DROP CONSTRAINT IF EXISTS parcours_steps_status_check;
ALTER TABLE parcours_steps
  ADD CONSTRAINT parcours_steps_status_check
  CHECK (status IN ('locked', 'current', 'completed', 'skipped', 'pending_review'));

-- ============================================================
-- 2. validation_requests.type — ajouter 'step_submission'
-- ============================================================

ALTER TABLE validation_requests DROP CONSTRAINT IF EXISTS validation_requests_type_check;
ALTER TABLE validation_requests
  ADD CONSTRAINT validation_requests_type_check
  CHECK (type IN ('brief_lab', 'evolution_one', 'step_submission'));
