-- Story 13.5: Catalogue de modules Hub — activation par client & tarification
-- Table module_catalog + RLS + trigger updated_at

CREATE TABLE module_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('catalog', 'custom')),
  setup_price_ht NUMERIC(10, 2) NOT NULL DEFAULT 0,
  monthly_price_ht NUMERIC(10, 2),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_modules TEXT[] NOT NULL DEFAULT '{}',
  manifest_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour filtrage rapide
CREATE INDEX idx_module_catalog_category ON module_catalog(category);
CREATE INDEX idx_module_catalog_kind ON module_catalog(kind);
CREATE INDEX idx_module_catalog_is_active ON module_catalog(is_active);

-- RLS: seul l'operateur peut acceder au catalogue
ALTER TABLE module_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_catalog_select_operator"
  ON module_catalog FOR SELECT
  USING (is_operator());

CREATE POLICY "module_catalog_insert_operator"
  ON module_catalog FOR INSERT
  WITH CHECK (is_operator());

CREATE POLICY "module_catalog_update_operator"
  ON module_catalog FOR UPDATE
  USING (is_operator());

CREATE POLICY "module_catalog_delete_operator"
  ON module_catalog FOR DELETE
  USING (is_operator());

-- Trigger updated_at
CREATE TRIGGER trg_module_catalog_updated_at
  BEFORE UPDATE ON module_catalog
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- RPC pour mise a jour atomique des modules client (AC8)
CREATE OR REPLACE FUNCTION apply_client_module_config(
  p_client_id UUID,
  p_module_keys TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifier que l'appelant est operateur
  IF NOT is_operator() THEN
    RAISE EXCEPTION 'Unauthorized: operator only';
  END IF;

  -- Verifier que tous les module_keys existent dans le catalogue actif
  IF EXISTS (
    SELECT 1 FROM unnest(p_module_keys) AS k
    WHERE k NOT IN (SELECT module_key FROM module_catalog WHERE is_active = true)
  ) THEN
    RAISE EXCEPTION 'Invalid module keys: some keys not found in active catalog';
  END IF;

  -- Mise a jour atomique
  UPDATE client_configs
  SET active_modules = p_module_keys,
      updated_at = NOW()
  WHERE client_id = p_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client config not found for client_id: %', p_client_id;
  END IF;
END;
$$;
