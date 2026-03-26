-- Migration: Add contact fields to clients table
-- Bug fix: phone, website, notes columns referenced in CRM actions but missing from schema

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN clients.phone IS 'Numéro de téléphone du client (format libre)';
COMMENT ON COLUMN clients.website IS 'Site web du client';
COMMENT ON COLUMN clients.notes IS 'Notes privées opérateur sur le client';
