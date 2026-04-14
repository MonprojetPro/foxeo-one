-- Migration 00047: Create elio_config_history table
-- Story 8.3: Historique des configurations Élio (FR87)

-- ============================================================
-- 1. CREATE TABLE elio_config_history
-- ============================================================

CREATE TABLE elio_config_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE elio_config_history IS 'Historique des modifications de configuration Élio par client';
COMMENT ON COLUMN elio_config_history.field_changed IS 'Champ modifié (ex: model, temperature, custom_instructions, ou elio_config pour changement complet)';
COMMENT ON COLUMN elio_config_history.old_value IS 'Valeur JSONB avant modification';
COMMENT ON COLUMN elio_config_history.new_value IS 'Valeur JSONB après modification';
COMMENT ON COLUMN elio_config_history.changed_by IS 'UUID auth.users de l''utilisateur ayant fait la modification';

-- ============================================================
-- 2. INDEX
-- ============================================================

CREATE INDEX idx_elio_config_history_client_id ON elio_config_history(client_id);
CREATE INDEX idx_elio_config_history_changed_at ON elio_config_history(changed_at DESC);

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE elio_config_history ENABLE ROW LEVEL SECURITY;

-- Opérateurs voient l'historique de leurs clients
CREATE POLICY elio_config_history_select_operator ON elio_config_history
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT c.id FROM clients c
      INNER JOIN operators o ON o.id = c.operator_id
      WHERE o.auth_user_id = auth.uid()
    )
  );

-- Pas de policy INSERT pour les utilisateurs authentifiés.
-- Les insertions se font uniquement via le trigger SECURITY DEFINER
-- qui bypass RLS automatiquement.
-- Aucun utilisateur ne peut insérer directement dans cette table.

-- ============================================================
-- 4. TRIGGER — Enregistre les modifications de elio_configs
-- ============================================================

CREATE OR REPLACE FUNCTION log_elio_config_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Enregistrer le changement complet de config
  IF OLD.model IS DISTINCT FROM NEW.model
    OR OLD.temperature IS DISTINCT FROM NEW.temperature
    OR OLD.max_tokens IS DISTINCT FROM NEW.max_tokens
    OR OLD.custom_instructions IS DISTINCT FROM NEW.custom_instructions
    OR OLD.enabled_features IS DISTINCT FROM NEW.enabled_features
  THEN
    INSERT INTO elio_config_history (
      client_id,
      field_changed,
      old_value,
      new_value,
      changed_by
    ) VALUES (
      NEW.client_id,
      'elio_config',
      jsonb_build_object(
        'model', OLD.model,
        'temperature', OLD.temperature,
        'max_tokens', OLD.max_tokens,
        'custom_instructions', OLD.custom_instructions,
        'enabled_features', OLD.enabled_features
      ),
      jsonb_build_object(
        'model', NEW.model,
        'temperature', NEW.temperature,
        'max_tokens', NEW.max_tokens,
        'custom_instructions', NEW.custom_instructions,
        'enabled_features', NEW.enabled_features
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_elio_config_changes
  AFTER UPDATE ON elio_configs
  FOR EACH ROW
  EXECUTE FUNCTION log_elio_config_changes();
