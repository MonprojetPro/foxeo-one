-- Story 11.6 — Colonnes Lab billing sur la table clients
-- Tracent si le client a payé le forfait Lab (199€), quand, et pour quel montant (centimes)

ALTER TABLE clients ADD COLUMN IF NOT EXISTS lab_paid BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lab_paid_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lab_amount INTEGER DEFAULT 0;
