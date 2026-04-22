-- Migration 00105: Visio activé par défaut pour tous les clients
-- Le module Visio est désormais inclus dans la liste de modules de base.

-- 1. Mettre à jour la valeur DEFAULT de la colonne
ALTER TABLE client_configs
  ALTER COLUMN active_modules
    SET DEFAULT ARRAY['core-dashboard', 'chat', 'documents', 'visio'];

-- 2. Ajouter visio à tous les clients existants qui ne l'ont pas encore
UPDATE client_configs
SET active_modules = array_append(active_modules, 'visio')
WHERE NOT ('visio' = ANY(active_modules));
