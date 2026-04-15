-- Migration: 00084_quote_metadata_sent_at.sql
-- Story: 13.4 — patch Modification devis (cancel+recreate workflow)
--
-- Pennylane V2 PUT /quotes/{id} ne supporte pas correctement la modification
-- des invoice_lines (format documente nulle part, plusieurs essais 400 Bad Request).
-- Workaround : annuler le devis existant puis en creer un nouveau avec les modifs.
-- Pour distinguer les devis deja envoyes au client (renvoi automatique requis),
-- on track un timestamp sent_at dans quote_metadata.

ALTER TABLE quote_metadata
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

COMMENT ON COLUMN quote_metadata.sent_at IS
  'Story 13.4 — timestamp du dernier envoi par email au client (POST /quotes/:id/send_by_email). NULL = jamais envoye.';
