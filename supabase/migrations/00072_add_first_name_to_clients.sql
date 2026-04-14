-- Migration 00072: Add first_name column to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS first_name TEXT;

COMMENT ON COLUMN clients.first_name IS 'Prénom du client (optionnel)';
