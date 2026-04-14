-- Migration: Create parcours_steps table
-- Story: 6.1 — Module Parcours Lab — Migration, structure & vue parcours progression

-- 1. Create parcours_steps table
CREATE TABLE parcours_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcours_id UUID NOT NULL REFERENCES parcours(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  brief_template TEXT,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'current', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  validation_required BOOLEAN DEFAULT TRUE,
  validation_id UUID, -- FK added later via migration 44 (validation_requests)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(parcours_id, step_number)
);

-- 2. Indexes
CREATE INDEX idx_parcours_steps_parcours_id ON parcours_steps(parcours_id);
CREATE INDEX idx_parcours_steps_status ON parcours_steps(status);

-- 3. Trigger updated_at
CREATE TRIGGER trg_parcours_steps_updated_at
  BEFORE UPDATE ON parcours_steps
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- 4. RLS Enable
ALTER TABLE parcours_steps ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Client voit ses propres étapes de parcours
CREATE POLICY parcours_steps_select_owner ON parcours_steps FOR SELECT
  USING (
    parcours_id IN (
      SELECT id FROM parcours WHERE client_id IN (
        SELECT id FROM clients WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Client peut mettre à jour ses étapes (pour update-step-status)
CREATE POLICY parcours_steps_update_owner ON parcours_steps FOR UPDATE
  USING (
    parcours_id IN (
      SELECT id FROM parcours WHERE client_id IN (
        SELECT id FROM clients WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Opérateur voit toutes les étapes des clients qu'il gère
CREATE POLICY parcours_steps_select_operator ON parcours_steps FOR SELECT
  USING (
    parcours_id IN (
      SELECT p.id FROM parcours p
      JOIN clients c ON p.client_id = c.id
      WHERE c.operator_id = auth.uid()
    )
  );

-- Opérateur peut mettre à jour les étapes (ex: valider)
CREATE POLICY parcours_steps_update_operator ON parcours_steps FOR UPDATE
  USING (
    parcours_id IN (
      SELECT p.id FROM parcours p
      JOIN clients c ON p.client_id = c.id
      WHERE c.operator_id = auth.uid()
    )
  );

-- 6. Helper function: create steps from template
CREATE OR REPLACE FUNCTION create_parcours_steps_from_template(
  p_parcours_id UUID,
  p_steps JSONB
) RETURNS VOID AS $$
DECLARE
  step_data JSONB;
  step_idx INTEGER := 0;
BEGIN
  FOR step_data IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    step_idx := step_idx + 1;
    INSERT INTO parcours_steps (
      parcours_id,
      step_number,
      title,
      description,
      brief_template,
      status,
      validation_required
    ) VALUES (
      p_parcours_id,
      step_idx,
      step_data->>'title',
      step_data->>'description',
      step_data->>'brief_template',
      CASE WHEN step_idx = 1 THEN 'current' ELSE 'locked' END,
      COALESCE((step_data->>'validation_required')::BOOLEAN, TRUE)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
