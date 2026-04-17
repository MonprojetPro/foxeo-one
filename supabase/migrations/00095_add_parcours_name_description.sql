-- Migration 00095: Add name and description to parcours table
-- These fields are required by ParcoursDB type (parcours-mappers.ts) and the UI
-- Added to support named parcours with custom descriptions per client

ALTER TABLE parcours
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Mon Parcours',
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN parcours.name IS 'Nom du parcours (ex: Mon Parcours Entrepreneurial)';
COMMENT ON COLUMN parcours.description IS 'Description courte du parcours visible par le client';
