-- Migration : corriger la plage de température des agents Élio Lab
-- L'API Anthropic (Claude 4) n'accepte que temperature dans [0..1].
-- La contrainte précédente autorisait [0..2], ce qui causait des erreurs 400.

-- 1. Ramener toutes les temperatures hors plage à 1.0
UPDATE elio_lab_agents SET temperature = 1.0 WHERE temperature > 1.0;
UPDATE elio_configs     SET temperature = 1.0 WHERE temperature > 1.0;

-- 2. Corriger la contrainte CHECK sur elio_lab_agents
ALTER TABLE elio_lab_agents DROP CONSTRAINT IF EXISTS elio_lab_agents_temperature_check;
ALTER TABLE elio_lab_agents
  ADD CONSTRAINT elio_lab_agents_temperature_check
  CHECK (temperature >= 0 AND temperature <= 1);

-- 3. Corriger la contrainte CHECK sur elio_configs si elle existe
ALTER TABLE elio_configs DROP CONSTRAINT IF EXISTS elio_configs_temperature_check;
ALTER TABLE elio_configs
  ADD CONSTRAINT elio_configs_temperature_check
  CHECK (temperature >= 0 AND temperature <= 1);
