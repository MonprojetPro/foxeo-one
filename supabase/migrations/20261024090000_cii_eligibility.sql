-- Migration: 20261024090000_cii_eligibility.sql
-- T-062a (reste-a-faire de T-062) — case d'eligibilite PME au sens CII sur la
-- fiche client. C'est une qualification MANUELLE (pas de calcul automatique :
-- l'effectif et le bilan ne sont pas des donnees que le Hub possede), valable
-- pour tous les projets de ce client. L'eligibilite du PROJET, elle, se coche
-- par devis/facture (voir quote-form.tsx / invoice-form.tsx) et n'est pas
-- persistee : seule la mention CII qu'elle fait apparaitre dans
-- pdf_invoice_free_text laisse une trace, exactement comme [FOXEO_LAB].

ALTER TABLE clients
  ADD COLUMN cii_pme_eligible BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN clients.cii_pme_eligible IS 'T-062a — coche manuelle : ce client remplit les criteres PME au sens CII (CONSIGNES-CII-HUB.md section 2.1). Jamais calcule automatiquement.';
