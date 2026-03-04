-- Migration: 00049_client_configs_elio_tier.sql
-- Story 8.9a: Élio One+ — Système de tiers & actions modules
-- Adds elio_tier column to client_configs (dedicated column, faster than JSON lookup)
-- Extends activity_logs.actor_type to include elio_one_plus

-- 1. Add elio_tier column to client_configs
ALTER TABLE client_configs
  ADD COLUMN IF NOT EXISTS elio_tier TEXT DEFAULT 'one'
    CHECK (elio_tier IN ('one', 'one_plus'));

CREATE INDEX IF NOT EXISTS idx_client_configs_elio_tier ON client_configs(elio_tier);

COMMENT ON COLUMN client_configs.elio_tier IS 'Tier Élio du client : one (FAQ + guidance + collecte évolutions) ou one_plus (actions modules + génération + alertes proactives). Défaut : one.';

-- 2. Extend activity_logs.actor_type to include elio_one_plus
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_actor_type_check;

ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_actor_type_check
  CHECK (actor_type IN ('client', 'operator', 'system', 'elio', 'elio_one_plus'));

COMMENT ON COLUMN activity_logs.actor_type IS 'Type acteur : client, operator, system, elio ou elio_one_plus';
