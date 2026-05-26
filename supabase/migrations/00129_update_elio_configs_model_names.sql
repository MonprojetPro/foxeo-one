-- Migration : remplacer les anciens IDs de modèles Anthropic devenus invalides
-- claude-sonnet-4-20250514 / claude-haiku-4-20250122 / claude-opus-4-20250514
-- → remplacés par claude-sonnet-4-6 / claude-haiku-4-5-20251001 / claude-opus-4-6

-- 1. Supprimer l'ancien CHECK constraint sur elio_configs
ALTER TABLE elio_configs DROP CONSTRAINT IF EXISTS elio_configs_model_check;

-- 2. Mettre à jour les lignes existantes
UPDATE elio_configs SET model = 'claude-sonnet-4-6'       WHERE model = 'claude-sonnet-4-20250514';
UPDATE elio_configs SET model = 'claude-haiku-4-5-20251001' WHERE model = 'claude-haiku-4-20250122';
UPDATE elio_configs SET model = 'claude-opus-4-6'          WHERE model = 'claude-opus-4-20250514';

-- 3. Modifier le DEFAULT de la colonne
ALTER TABLE elio_configs ALTER COLUMN model SET DEFAULT 'claude-sonnet-4-6';

-- 4. Ajouter le nouveau CHECK constraint
ALTER TABLE elio_configs
  ADD CONSTRAINT elio_configs_model_check
  CHECK (model IN ('claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'));
