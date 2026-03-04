-- Migration: Add graduation fields + create client_instances table
-- Story: 9.1 — Graduation Lab vers One — Déclenchement & migration automatique du contexte

-- ============================================================
-- 1. Add graduation_notes to clients
-- (graduated_at already added in 00036)
-- ============================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS graduation_notes TEXT;

COMMENT ON COLUMN clients.graduation_notes IS 'Notes de MiKL lors de la graduation vers One';

-- ============================================================
-- 2. Add graduation_source to client_configs
-- ============================================================

ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS graduation_source TEXT
    CHECK (graduation_source IN ('lab', 'direct', 'upgrade'));

COMMENT ON COLUMN client_configs.graduation_source IS 'Source de la graduation : lab (depuis Lab), direct (accès direct One), upgrade (upgrade ponctuel)';

-- ============================================================
-- 3. Create client_instances table (provisioning One instances)
-- ============================================================

CREATE TABLE IF NOT EXISTS client_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  instance_url TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('provisioning', 'active', 'suspended', 'failed', 'transferred')),
  tier TEXT NOT NULL
    CHECK (tier IN ('base', 'essentiel', 'agentique')),
  active_modules TEXT[] NOT NULL DEFAULT ARRAY['core-dashboard'],
  supabase_project_id TEXT,
  vercel_project_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_client_instances_client_id ON client_instances(client_id);
CREATE INDEX IF NOT EXISTS idx_client_instances_status ON client_instances(status);

CREATE TRIGGER trg_client_instances_updated_at
  BEFORE UPDATE ON client_instances
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_updated_at();

COMMENT ON TABLE client_instances IS 'Instances One dédiées par client — provisionnées lors de la graduation Lab → One';
COMMENT ON COLUMN client_instances.slug IS 'Sous-domaine unique : {slug}.foxeo.io';
COMMENT ON COLUMN client_instances.tier IS 'base = Ponctuel, essentiel = Élio One (49€/mois), agentique = Élio One+ (99€/mois)';
COMMENT ON COLUMN client_instances.status IS 'provisioning → active (normal), failed (erreur), suspended, transferred (client sortant)';

-- ============================================================
-- 4. RLS policies for client_instances
-- ============================================================

ALTER TABLE client_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_instances_select_operator
  ON client_instances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_instances.client_id
        AND clients.operator_id IN (
          SELECT id FROM operators WHERE auth_user_id = auth.uid()
        )
    )
    OR is_admin()
  );

CREATE POLICY client_instances_insert_operator
  ON client_instances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_instances.client_id
        AND clients.operator_id IN (
          SELECT id FROM operators WHERE auth_user_id = auth.uid()
        )
    )
    OR is_admin()
  );

CREATE POLICY client_instances_update_operator
  ON client_instances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_instances.client_id
        AND clients.operator_id IN (
          SELECT id FROM operators WHERE auth_user_id = auth.uid()
        )
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_instances.client_id
        AND clients.operator_id IN (
          SELECT id FROM operators WHERE auth_user_id = auth.uid()
        )
    )
    OR is_admin()
  );
