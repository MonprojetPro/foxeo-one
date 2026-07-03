-- Migration — Catalogue FORGE : famille Relation/Cockpit + purge des modules internes Hub
-- Vision One v2 (2026-06-24), §2 « Relation vs Cockpit » + §3 « bibliothèque FORGE ».
--
-- 1. `family` : distinction structurante de la v2.
--    'relation' = socle universel (lien client ↔ MiKL, identique pour tous)
--    'cockpit'  = brique sur-mesure (pilote les livrables du client, au devis)
--
-- 2. Purge FORGE : les entrées du catalogue qui sont des OUTILS INTERNES du Hub
--    (jamais développées comme modules client vendables) sortent du rayon :
--    admin, analytics, crm, email, templates, validation-hub.
--    Leur code reste dans packages/modules/ (utilisé par le Hub) — seule
--    l'entrée catalogue disparaît. Aucune FK ne référence module_catalog (vérifié).
--
-- 3. suivi-outil : module client One RÉEL (fil Hub→client) absent du catalogue → ajouté.
--
-- 4. Prix mensuels par module → NULL : la v2 remplace l'abonnement à la carte par
--    deux offres fixes (One 39 € / One+ 99 €). Le prix setup reste (base de devis).

-- ① Colonne family
ALTER TABLE module_catalog
  ADD COLUMN IF NOT EXISTS family text NOT NULL DEFAULT 'relation';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'module_catalog_family_check'
  ) THEN
    ALTER TABLE module_catalog
      ADD CONSTRAINT module_catalog_family_check
      CHECK (family IN ('relation', 'cockpit'));
  END IF;
END $$;

COMMENT ON COLUMN module_catalog.family IS
  'Famille vision v2 : relation (socle universel, lien client↔MiKL) | cockpit (brique sur-mesure au devis).';

-- ② Purge FORGE — outils internes Hub hors du rayon
DELETE FROM module_catalog
WHERE module_key IN ('admin', 'analytics', 'crm', 'email', 'templates', 'validation-hub');

-- ③ suivi-outil — module One réel manquant au catalogue
INSERT INTO module_catalog (module_key, name, description, category, kind, family, setup_price_ht, monthly_price_ht, is_default, is_active, manifest_path)
VALUES (
  'suivi-outil',
  'Suivi de l''outil',
  'Fil d''avancement du développement de l''outil du client — posts Hub, images, commentaires',
  'communication',
  'catalog',
  'relation',
  0, NULL, true, true,
  'packages/modules/suivi-outil/manifest.ts'
)
ON CONFLICT (module_key) DO NOTHING;

-- ④ Familles + socle One
UPDATE module_catalog SET family = 'cockpit' WHERE module_key = 'facturation';
UPDATE module_catalog SET family = 'relation' WHERE module_key <> 'facturation';

-- Socle One (is_default = « inclus dans l'abonnement One/One+ ») :
UPDATE module_catalog SET is_default = true
WHERE module_key IN ('core-dashboard', 'chat', 'documents', 'elio', 'visio', 'support', 'notifications', 'suivi-outil');
UPDATE module_catalog SET is_default = false
WHERE module_key IN ('parcours', 'facturation');

-- ⑤ Fin de l'abonnement à la carte par module
UPDATE module_catalog SET monthly_price_ht = NULL;

-- ⑥ Le socle relation est inclus dans l'abonnement — pas de prix setup résiduel v1
UPDATE module_catalog SET setup_price_ht = 0 WHERE is_default = true AND family = 'relation';
