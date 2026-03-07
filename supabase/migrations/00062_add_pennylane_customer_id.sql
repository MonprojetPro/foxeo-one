-- Migration: 00062_add_pennylane_customer_id.sql
-- Story: 11.1 — Module Facturation — Colonne pennylane_customer_id dans clients
-- Migration progressive : pas de NOT NULL (clients existants n'ont pas encore de mapping)

ALTER TABLE clients ADD COLUMN pennylane_customer_id TEXT;

-- Index partiel : uniquement les lignes avec une valeur (évite les nulls dans l'index)
CREATE INDEX idx_clients_pennylane ON clients(pennylane_customer_id)
  WHERE pennylane_customer_id IS NOT NULL;

COMMENT ON COLUMN clients.pennylane_customer_id IS 'ID client dans Pennylane — null si pas encore synchronisé';
