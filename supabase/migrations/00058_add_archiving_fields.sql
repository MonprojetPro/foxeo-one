-- Migration: add archiving fields for Story 9.5c (RGPD anonymisation)
-- Adds retention_until, previous_status columns and 'deleted' status enum value

-- Add columns to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS previous_status TEXT;

-- Update CHECK constraint to include 'deleted' status
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check
  CHECK (status IN ('active', 'suspended', 'archived', 'deleted'));

-- Index for cleanup cron: efficiently find clients whose retention has expired
CREATE INDEX IF NOT EXISTS idx_clients_retention_until
  ON clients(retention_until)
  WHERE status = 'archived';

-- Comment on columns
COMMENT ON COLUMN clients.retention_until IS 'RGPD: date after which client data will be anonymized (set when status→archived)';
COMMENT ON COLUMN clients.previous_status IS 'Status before archiving, used to restore on reactivation';
