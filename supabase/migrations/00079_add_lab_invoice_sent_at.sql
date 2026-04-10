-- Migration 00079: ajouter lab_invoice_sent_at sur clients
-- Permet de tracer quand la facture Lab a été envoyée (séparé de lab_paid)

ALTER TABLE clients ADD COLUMN IF NOT EXISTS lab_invoice_sent_at TIMESTAMPTZ;
