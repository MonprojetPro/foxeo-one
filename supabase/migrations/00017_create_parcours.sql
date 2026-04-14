-- Migration 00017: Create parcours_templates and parcours tables
-- Story 2.4 — Assignation parcours Lab & gestion des acces
-- Convention: snake_case, pluriel pour tables; {table}_{action}_{role} pour policies

-- ============================================================
-- TABLE: parcours_templates
-- ============================================================

CREATE TABLE parcours_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  name TEXT NOT NULL,
  description TEXT,
  parcours_type TEXT NOT NULL CHECK (parcours_type IN ('complet', 'partiel', 'ponctuel')),
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE parcours_templates IS 'Templates de parcours Lab configurables par operateur';

-- ============================================================
-- TABLE: parcours
-- ============================================================

CREATE TABLE parcours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES parcours_templates(id),
  operator_id UUID NOT NULL REFERENCES operators(id),
  active_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'en_cours' CHECK (status IN ('en_cours', 'suspendu', 'termine')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  suspended_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE parcours IS 'Parcours Lab assignes aux clients avec suivi de progression';

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_parcours_client_id ON parcours(client_id);
CREATE INDEX idx_parcours_operator_id ON parcours(operator_id);
CREATE INDEX idx_parcours_templates_operator_id ON parcours_templates(operator_id);

-- ============================================================
-- TRIGGERS updated_at (reuse fn_update_updated_at from 00006)
-- ============================================================

CREATE TRIGGER trg_parcours_templates_updated_at
  BEFORE UPDATE ON parcours_templates
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_updated_at();

CREATE TRIGGER trg_parcours_updated_at
  BEFORE UPDATE ON parcours
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_updated_at();

-- ============================================================
-- RLS: parcours_templates
-- ============================================================

ALTER TABLE parcours_templates ENABLE ROW LEVEL SECURITY;

-- Operateur voit ses propres templates
CREATE POLICY parcours_templates_select_operator
  ON parcours_templates
  FOR SELECT
  TO authenticated
  USING (is_operator(operator_id));

-- Operateur peut creer des templates
CREATE POLICY parcours_templates_insert_operator
  ON parcours_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (is_operator(operator_id));

-- Operateur peut modifier ses templates
CREATE POLICY parcours_templates_update_operator
  ON parcours_templates
  FOR UPDATE
  TO authenticated
  USING (is_operator(operator_id))
  WITH CHECK (is_operator(operator_id));

-- ============================================================
-- RLS: parcours
-- ============================================================

ALTER TABLE parcours ENABLE ROW LEVEL SECURITY;

-- Operateur voit les parcours de ses clients
CREATE POLICY parcours_select_operator
  ON parcours
  FOR SELECT
  TO authenticated
  USING (is_operator(operator_id));

-- Operateur peut creer des parcours
CREATE POLICY parcours_insert_operator
  ON parcours
  FOR INSERT
  TO authenticated
  WITH CHECK (is_operator(operator_id));

-- Operateur peut modifier les parcours
CREATE POLICY parcours_update_operator
  ON parcours
  FOR UPDATE
  TO authenticated
  USING (is_operator(operator_id))
  WITH CHECK (is_operator(operator_id));

-- ============================================================
-- SEED DATA: 1 template "Parcours Complet" (5 etapes)
-- ============================================================

-- Note: Insere avec un operator_id placeholder. En production, le seed
-- devra etre adapte a l'operateur reel. Pour le dev local, on utilise
-- une insertion conditionnelle qui prend le premier operateur existant.
DO $$
DECLARE
  v_operator_id UUID;
BEGIN
  SELECT id INTO v_operator_id FROM operators LIMIT 1;
  IF v_operator_id IS NOT NULL THEN
    INSERT INTO parcours_templates (operator_id, name, description, parcours_type, stages)
    VALUES (
      v_operator_id,
      'Parcours Complet',
      'Parcours complet de creation d''entreprise en 5 etapes : de la vision a la graduation vers MonprojetPro One.',
      'complet',
      '[
        {"key": "vision", "name": "Vision", "description": "Definir la vision business", "order": 1},
        {"key": "positionnement", "name": "Positionnement", "description": "Positionner l''offre sur le marche", "order": 2},
        {"key": "offre", "name": "Offre", "description": "Structurer l''offre commerciale", "order": 3},
        {"key": "identite", "name": "Identite", "description": "Creer l''identite visuelle", "order": 4},
        {"key": "graduation", "name": "Graduation", "description": "Diplomer vers MonprojetPro One", "order": 5}
      ]'::jsonb
    );
  END IF;
END;
$$;
