-- Migration: support_tickets passe d'une pièce jointe unique à 3 maximum
-- Demande MiKL 2026-08-31 : reprendre le pattern GuardVeto (NB_PIECES_MAX = 3)
-- pour le signalement de problème du Lab/One.

-- 1. Nouvelle colonne tableau, plafonnée à 3 (même contrainte que GuardVeto)
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS screenshot_urls TEXT[] NOT NULL DEFAULT '{}'::text[]
  CHECK (cardinality(screenshot_urls) <= 3);

-- 2. Migration des données existantes (single -> array)
UPDATE support_tickets
  SET screenshot_urls = ARRAY[screenshot_url]
  WHERE screenshot_url IS NOT NULL AND cardinality(screenshot_urls) = 0;

-- 3. Suppression de l'ancienne colonne, remplacée par screenshot_urls
ALTER TABLE support_tickets DROP COLUMN IF EXISTS screenshot_url;

COMMENT ON COLUMN support_tickets.screenshot_urls IS
  'Jusqu''à 3 pièces jointes (captures/PDF), uploadées directement navigateur -> Supabase Storage. Cardinalité vérifiée aussi côté client (contraintes.ts).';
