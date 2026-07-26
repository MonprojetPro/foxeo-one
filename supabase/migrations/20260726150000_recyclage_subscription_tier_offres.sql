-- Migration — Recyclage de client_configs.subscription_tier vers les 3 offres commerciales
--
-- CONTEXTE (docs/one-vision-v2-2026-06-24.md §6, décision MiKL)
-- La colonne portait jusqu'ici un triplet TECHNIQUE historique ('base'/'essentiel'/'agentique')
-- que le code traduisait déjà en libellés commerciaux à chaque affichage (TIER_INFO dans
-- packages/modules/crm/utils/tier-helpers.ts, TIERS dans graduation-dialog.tsx, PLAN_TIER dans
-- packages/modules/facturation/config/subscription-plans.ts). Cette double couche de nommage
-- (identifiant technique ≠ libellé affiché) est la source de confusion à éliminer : la colonne
-- porte désormais DIRECTEMENT l'identifiant de l'offre commerciale.
--
-- Les 3 offres (inchangées sur le fond, seul l'identifiant change) :
--   'ponctuel'  : devis one-shot, pas d'abonnement, pas de dashboard One (ex-'base')
--   'one'       : 39 €/mois — socle relation + cockpits, Élio One (ex-'essentiel')
--   'one_plus'  : 99 €/mois — tout One + coaching humain (1 visio/mois) (ex-'agentique')
--
-- 1. Retirer l'ancienne contrainte CHECK ('base'/'essentiel'/'agentique') avant de réécrire
--    les données existantes, sinon l'UPDATE ci-dessous violerait la contrainte au repos.
ALTER TABLE client_configs
  DROP CONSTRAINT IF EXISTS client_configs_subscription_tier_check;

-- 2. Migrer les données existantes.
--    Mapping strictement sémantique — aucun client ne change d'offre, seul l'identifiant
--    change. Il est déduit de la table d'affichage TIER_INFO qui faisait déjà foi :
--      'base'      → prix « Ponctuel », Élio « Aucun »   → 'ponctuel'
--      'essentiel' → prix « 39€/mois », Élio One          → 'one'
--      'agentique' → prix « 99€/mois », Élio One+         → 'one_plus'
--    ⚠️ Un mapping 'base' → 'one' avait été envisagé : il aurait transformé des clients
--    SANS abonnement en abonnés 39 €/mois. Écarté après vérification de tier-helpers.ts.
UPDATE client_configs SET subscription_tier = 'ponctuel' WHERE subscription_tier = 'base';
UPDATE client_configs SET subscription_tier = 'one' WHERE subscription_tier = 'essentiel';
UPDATE client_configs SET subscription_tier = 'one_plus' WHERE subscription_tier = 'agentique';

-- 3. Poser la nouvelle contrainte CHECK sur les 3 identifiants d'offre.
ALTER TABLE client_configs
  ADD CONSTRAINT client_configs_subscription_tier_check
  CHECK (subscription_tier IN ('ponctuel', 'one', 'one_plus'));

-- 4. Nouveau DEFAULT — un client fraîchement créé n'a par défaut aucun abonnement actif
--    (cf. packages/modules/crm/actions/create-client.ts, qui insère client_configs sans
--    préciser subscription_tier). 'ponctuel' est l'équivalent direct de l'ancien défaut
--    'base' (pas d'abonnement, pas d'Élio) — voir mapTierToElio() dans tier-helpers.ts.
ALTER TABLE client_configs
  ALTER COLUMN subscription_tier SET DEFAULT 'ponctuel';

-- 5. Documentation — clarifie explicitement la différence avec les deux colonnes voisines
--    qui ont un rôle proche mais distinct, source historique de la confusion.
COMMENT ON COLUMN client_configs.subscription_tier IS
  'Offre commerciale du client : ponctuel (devis one-shot, pas d''abonnement) | one (39€/mois) | one_plus (99€/mois, + coaching humain). '
  'Piloté par l''opérateur (Hub) via changeClientTier / graduateClient / createSubscription — jamais par le client. '
  'À NE PAS CONFONDRE avec clients.client_type (comment le client est arrivé : complet/direct_one/ponctuel — son chemin d''acquisition, '
  'ne change jamais après coup) ni avec client_configs.elio_tier (niveau d''accès Élio associé : one/one_plus/null — dérivé de ce tier via mapTierToElio(), '
  'mais concerne uniquement l''assistant, pas la facturation).';
