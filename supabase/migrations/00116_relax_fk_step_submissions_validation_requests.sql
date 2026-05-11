-- Migration 00116 — Relax FK constraints pour le nouveau système client_parcours_agents
-- step_submissions.parcours_step_id et validation_requests.step_id pointaient vers parcours_steps(id)
-- Le nouveau système utilise client_parcours_agents.id comme stepId → FK violation
-- Solution : supprimer ces FK (les IDs restent stockés, juste sans contrainte d'intégrité référentielle)

-- 1. Supprimer FK sur step_submissions.parcours_step_id
ALTER TABLE step_submissions
  DROP CONSTRAINT IF EXISTS step_submissions_parcours_step_id_fkey;

-- 2. Supprimer FK sur validation_requests.step_id
ALTER TABLE validation_requests
  DROP CONSTRAINT IF EXISTS validation_requests_step_id_fkey;

-- 3. Supprimer FK sur validation_requests.parcours_id (nullable, mais FK quand même)
ALTER TABLE validation_requests
  DROP CONSTRAINT IF EXISTS validation_requests_parcours_id_fkey;

-- 4. Ajouter 'step_submission' au type CHECK de validation_requests
ALTER TABLE validation_requests
  DROP CONSTRAINT IF EXISTS validation_requests_type_check;

ALTER TABLE validation_requests
  ADD CONSTRAINT validation_requests_type_check
  CHECK (type IN ('brief_lab', 'evolution_one', 'step_submission'));
