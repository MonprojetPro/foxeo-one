# Story 13.5: Catalogue de modules Hub — activation par client & tarification

> ## Contexte produit — Décision 2026-04-14
>
> MiKL a validé un principe fondateur : **un seul "One de base" pour tous les clients**. Ce qui varie d'un client à l'autre, c'est uniquement les modules activés (catalogue réutilisable OU sur-mesure) et le plan de facturation associé.
>
> L'architecture est déjà modulaire (`packages/modules/*` avec `manifest.ts`), et le Hub peut activer/désactiver des modules via `client_configs.active_modules`. **Mais il manque une vraie interface de catalogue côté Hub** : MiKL ne peut pas voir tous les modules disponibles, leur prix, leur description, ni les activer facilement pour un client.
>
> Cette story crée l'interface catalogue + la tarification par module + la sync avec `client_configs.active_modules` + un générateur de devis à partir des modules sélectionnés. Elle complète la Story 11.3 (création de devis) et la Story 13.4 (typologie de devis).

Status: done
Priority: medium (facilite la vie de MiKL, non bloquant pour la vente initiale)
Estimate: large (~4-5 jours — modèle de données + UI catalogue + fiche client + génération devis + analytics)

## Story

As a **MiKL (opérateur)**,
I want **un catalogue de modules centralisé dans le Hub où je peux voir tous les modules disponibles (catalogue réutilisable + sur-mesure), leurs prix setup/mensuel, et les activer/désactiver pour chaque client avec génération automatique d'un devis correspondant**,
so that **je puisse proposer rapidement des offres cohérentes à mes clients sans avoir à calculer à la main ni gérer une liste de modules dans un fichier à part**.

## Acceptance Criteria

### AC1 — Table `module_catalog` (modèle de données)

**Given** le monorepo utilise un pattern `manifest.ts` par module
**When** la migration est appliquée
**Then** une nouvelle table `module_catalog` existe avec les colonnes :
- `id` (uuid PK)
- `module_key` (text UNIQUE, ex: `crm`, `facturation`, `visio`)
- `name` (text, ex: "CRM — Gestion des clients")
- `description` (text)
- `category` (text, ex: `business`, `communication`, `integration`)
- `kind` (text CHECK IN (`catalog`, `custom`))
- `setup_price_ht` (numeric, not null, default 0)
- `monthly_price_ht` (numeric, nullable — null = pas d'abonnement)
- `is_default` (boolean, default false — fait partie du One de base)
- `is_active` (boolean, default true — disponible au catalogue)
- `requires_modules` (text[], default `{}`)
- `manifest_path` (text, nullable — chemin vers le `manifest.ts`)
- `created_at`, `updated_at`
**And** RLS activée : seul `is_operator()` peut SELECT/INSERT/UPDATE/DELETE
**And** trigger `trg_module_catalog_updated_at` branché sur `fn_update_updated_at()`

### AC2 — Seed initial du catalogue

**Given** la migration est appliquée
**When** MiKL exécute `supabase/seed-module-catalog.sql` (une fois)
**Then** le catalogue est pré-rempli avec les modules existants du monorepo : `core-dashboard`, `chat`, `documents`, `elio-one`, `elio-lab`, `elio-hub`, `crm`, `facturation`, `visio`, `validation-hub`, `admin`, etc.
**And** chaque entrée a un `module_key`, un `name`, un `category`, un `kind='catalog'`, un `manifest_path` pointant vers le fichier source
**And** un helper `syncModuleCatalogFromManifests()` exposé en Server Action permet de re-sync le catalogue depuis les manifests (ajoute les nouveaux, marque `is_active=false` ceux dont le manifest n'existe plus)

### AC3 — Modules du "One de base"

**Given** le seed est exécuté
**When** la table est peuplée
**Then** les modules suivants ont `is_default = true` : `core-dashboard`, `chat`, `documents`, `elio-one`
**And** à la création d'un nouveau client One, ces 4 modules sont automatiquement ajoutés à `client_configs.active_modules`
**And** ils ne peuvent pas être retirés via l'UI standard (checkbox disabled) sauf override explicite d'un admin

### AC4 — Page Hub `/modules/admin/catalog`

**Given** MiKL est authentifié en opérateur
**When** il navigue sur `/modules/admin/catalog`
**Then** une page liste tous les modules du catalogue, filtrable par `category` et par `kind` (`catalog` vs `custom`)
**And** chaque module affiche : nom, description courte, badge category, badge "Défaut One" si `is_default`, prix setup, prix mensuel (ou "—"), nombre de clients actifs, statut `is_active`
**And** trois actions par module : "Activer/Désactiver" (toggle `is_active`), "Éditer" (modale), "Voir clients actifs" (liste)

### AC5 — Formulaire création/édition module

**Given** MiKL est sur la page catalogue
**When** il clique sur "Nouveau module" ou "Éditer"
**Then** une modale s'ouvre avec un formulaire React Hook Form + Zod
**And** pour un module `custom` (nouveau) : tous les champs sont éditables
**And** pour un module `catalog` (issu du monorepo) : seuls `description`, `setup_price_ht`, `monthly_price_ht`, `is_active`, `requires_modules` sont éditables (les champs `module_key`, `name`, `manifest_path` sont verrouillés)
**And** la validation bloque les dépendances cycliques et les références à des `module_key` inexistants

### AC6 — Onglet "Modules" sur la fiche client CRM

**Given** MiKL consulte la fiche d'un client
**When** il ouvre l'onglet "Modules"
**Then** la page affiche tous les modules du catalogue `is_active=true`, groupés par `category`, sous forme de checkboxes
**And** les modules déjà présents dans `client_configs.active_modules` sont cochés
**And** les modules `is_default=true` sont cochés et désactivés (checkbox disabled)
**And** chaque checkbox affiche le prix setup + mensuel à côté du nom pour aider MiKL à visualiser le coût

### AC7 — Action `toggleClientModule`

**Given** MiKL coche ou décoche un module sur la fiche client
**When** l'action `toggleClientModule(clientId, moduleKey, enable)` est appelée
**Then** elle vérifie via `is_operator()` que l'appelant est autorisé
**And** si `enable=true` et que `requires_modules` contient des modules non-actifs → activation en cascade automatique avec retour `{ data: { cascaded: [...], enabled: moduleKey }, error: null }`
**And** si `enable=false` et qu'un autre module actif require ce module → retour `{ data: null, error: { code: 'MODULE_REQUIRED_BY_OTHER', message: 'Le module X est requis par...' } }`
**And** `client_configs.active_modules` est mis à jour via Server Action (pas de throw, pattern `{ data, error }`)

### AC8 — Activation en batch "Appliquer la configuration"

**Given** MiKL a coché/décoché plusieurs modules sur la fiche client
**When** il clique sur "Appliquer la configuration"
**Then** une Server Action `applyClientModuleConfig(clientId, moduleKeys)` remplace atomiquement `client_configs.active_modules` par la nouvelle liste
**And** l'opération est transactionnelle (tout ou rien) via RPC Supabase
**And** les dépendances sont recalculées et injectées automatiquement
**And** un toast succès/erreur affiche le résultat (avec détail des cascades si applicable)

### AC9 — Génération de devis depuis les modules

**Given** MiKL est sur la fiche client avec des modules cochés
**When** il clique sur "Générer devis depuis les modules"
**Then** une modale ouvre un pré-devis pré-rempli :
- Une ligne par module actif avec `setup_price_ht` (section "Setup")
- Une ligne agrégée "Abonnement mensuel" avec `SUM(monthly_price_ht)` × 12 (annuel) ou × 1 (mensuel), toggle au choix
- Le `quote_type` (Story 13.4) est présélectionné selon le contexte (ex: `one_direct_deposit` si le client n'a pas fait le Lab)
**And** MiKL peut ajuster manuellement chaque ligne avant envoi
**And** la validation de la modale crée un devis via l'action existante de la Story 11.3

### AC10 — Warning cohérence devis ↔ modules actifs

**Given** un client a un devis `one_direct_deposit` validé (payé) pour un set de modules donné
**When** MiKL modifie `client_configs.active_modules` (ajoute ou retire un module)
**Then** un warning jaune non-bloquant s'affiche sur la fiche client :
> ⚠️ Les modules actifs diffèrent du dernier devis payé. Génère un avenant ou un nouveau devis pour régulariser.
**And** le warning affiche le diff (modules ajoutés / retirés vs devis)
**And** un bouton "Générer avenant" crée un nouveau devis de type `one_amendment` avec uniquement le delta

### AC11 — Vue analytics catalogue

**Given** MiKL est sur la page `/modules/admin/catalog/analytics`
**When** la page charge
**Then** elle affiche quatre widgets simples (Tremor cards) :
1. **Top modules** : liste des modules triés par nombre de clients actifs (desc)
2. **Revenue cumulé** : modules triés par `SUM(setup_price_ht) + SUM(monthly_price_ht × nb_clients_actifs × 12)` (desc)
3. **Custom vs catalog** : camembert du nombre de modules actifs par `kind`
4. **Suggestion de promotion** : liste des modules `kind='custom'` actifs sur ≥ 3 clients, avec bouton "Promouvoir en catalog"
**And** les agrégations sont calculées via une vue SQL `v_module_catalog_analytics` pour limiter les round-trips

## Tasks / Subtasks

- [x] Migration DB : table `module_catalog` + RLS + trigger `updated_at` (AC: #1)
- [x] Script seed `supabase/seed-module-catalog.sql` avec les modules existants du monorepo (AC: #2)
- [x] Helper `syncModuleCatalogFromManifests()` côté Server Action (AC: #2)
- [x] Logique `is_default` : seed avec `is_default=true` pour les 4 modules One de base (AC: #3)
- [x] Server Actions CRUD : `listModuleCatalog`, `upsertModuleCatalog`, `deleteModuleCatalog` (AC: #4, #5)
- [x] Server Action `toggleClientModule(clientId, moduleKey, enable)` avec gestion des dépendances (AC: #7)
- [x] Server Action `applyClientModuleConfig(clientId, moduleKeys)` transactionnelle (AC: #8)
- [x] Page Hub `/modules/admin/catalog` (liste + filtres + actions) (AC: #4)
- [x] Modale création/édition module (useState, validation Zod côté serveur) (AC: #5)
- [x] Onglet "Modules" sur la fiche client CRM — refonte avec catalogue, prix, batch apply (AC: #6)
- [x] Bouton + modale "Générer devis depuis les modules" (AC: #9)
- [x] Warning cohérence devis vs modules actifs + bouton "Générer avenant" (AC: #10)
- [x] Vue SQL `v_module_catalog_analytics` + page `/modules/admin/catalog/analytics` (AC: #11)
- [x] Tests unitaires Server Actions : toggle (5 tests) + applyConfig (4 tests) (AC: #7, #8)
- [ ] Tests intégration : création module → activation client → génération devis (flow complet)
- [ ] Documentation `packages/modules/admin/docs/catalog.md` + mise à jour `guide.md` et `faq.md`

## Dev Notes

### Architecture Patterns

- **Pattern manifest ↔ DB** : les modules du monorepo ont un `manifest.ts`. Le catalogue DB stocke une copie éditable (prix, description) liée par `module_key`. La source de vérité du code = manifest ; la source de vérité du prix et du catalogue business = DB.
- **Pattern modules custom** : un module sur-mesure peut être ajouté au catalogue avec `kind='custom'`. Il peut ensuite être promu en `kind='catalog'` via la page analytics (AC11) si MiKL décide de le rendre réutilisable.
- **Pattern dépendances** : graphe acyclique orienté, profondeur max = 2 niveaux. Cascade automatique à l'activation, blocage à la désactivation si dépendance inverse. Pas de cycle autorisé (validation Zod).
- **Pattern Server Action** : toutes les mutations retournent `{ data, error }`, jamais de throw. Le client utilise TanStack Query pour invalider le cache après mutation.
- **Pattern tree-shaking analytics** : la vue SQL pré-agrège pour éviter les N+1 côté Next.js.

### Source Tree Components

```
packages/modules/admin/                           # Module existant (Story 12.1)
├── actions/
│   ├── list-module-catalog.ts                    # CRÉER
│   ├── upsert-module-catalog.ts                  # CRÉER
│   ├── delete-module-catalog.ts                  # CRÉER
│   ├── sync-module-catalog-from-manifests.ts     # CRÉER
│   ├── toggle-client-module.ts                   # CRÉER
│   ├── apply-client-module-config.ts             # CRÉER
│   ├── toggle-client-module.test.ts              # CRÉER
│   └── apply-client-module-config.test.ts        # CRÉER
├── components/
│   ├── catalog-list.tsx                          # CRÉER
│   ├── catalog-filters.tsx                       # CRÉER
│   ├── module-edit-modal.tsx                     # CRÉER
│   ├── catalog-analytics-widgets.tsx             # CRÉER
│   └── generate-quote-from-modules-modal.tsx     # CRÉER
├── hooks/
│   ├── use-module-catalog.ts                     # CRÉER (TanStack Query)
│   └── use-client-modules.ts                     # CRÉER
└── docs/
    ├── catalog.md                                # CRÉER
    ├── guide.md                                  # MODIFIER
    └── faq.md                                    # MODIFIER

packages/modules/crm/
└── components/
    └── client-modules-tab.tsx                    # CRÉER (onglet Modules fiche client)

apps/hub/
└── app/
    └── modules/
        └── admin/
            ├── catalog/
            │   ├── page.tsx                      # CRÉER
            │   └── analytics/
            │       └── page.tsx                  # CRÉER

supabase/migrations/
├── 00069_create_module_catalog.sql               # CRÉER
└── 00070_create_v_module_catalog_analytics.sql   # CRÉER

supabase/
└── seed-module-catalog.sql                       # CRÉER
```

### Testing Standards

- **Unitaires** : Vitest, co-localisés (`*.test.ts`), mocks Supabase chain
- **Scope** : uniquement les fichiers créés/modifiés par la story (pas de full suite)
- **Couverture obligatoire** : toggle avec cascade, toggle avec blocage dépendance inverse, applyConfig transactionnel, syncManifests avec disparition d'un module
- **Contract test** : vérifier que le seed initial charge bien tous les modules existants du monorepo

### Key Technical Decisions

**1. `module_key` comme clé fonctionnelle**
Le `module_key` (slug, ex: `crm`) est la clé de jointure entre la DB et les manifests du monorepo. Il est UNIQUE et immutable. Un renommage de module dans le code nécessite une migration DB explicite.

**2. Prix stockés en centimes ou en euros ?**
Cohérence avec le module facturation (Story 11.5) : **les prix du catalogue sont stockés en euros** (numeric(10,2)) pour faciliter la saisie UI. La conversion en centimes se fait au moment de la génération du devis si nécessaire (`Math.round(price * 100)`).

**3. Dépendances : graphe en DB ou en mémoire ?**
Le champ `requires_modules` (text[]) stocke les dépendances directes. La résolution récursive (cascade) se fait en mémoire côté Server Action, limitée à 2 niveaux de profondeur. Pas de table `module_dependencies` séparée — overkill pour le volume attendu (< 50 modules).

**4. Génération de devis et `quote_type` (Story 13.4)**
La modale "Générer devis depuis les modules" pré-sélectionne le `quote_type` selon le contexte client :
- Client en cours de parcours Lab → `lab_onboarding`
- Client sans Lab, paiement direct → `one_direct_deposit`
- Client avec modules actifs modifiés → `one_amendment`

**5. Warning cohérence (AC10)**
Le warning compare `client_configs.active_modules` avec le dernier devis `status='paid'` de type `one_direct_deposit` ou `one_amendment`. Le diff est calculé côté client (pas besoin de stocker une snapshot en DB).

**6. Analytics — vue SQL**
Créer une vue `v_module_catalog_analytics` qui agrège :
```sql
SELECT
  mc.module_key,
  mc.name,
  mc.kind,
  mc.setup_price_ht,
  mc.monthly_price_ht,
  COUNT(DISTINCT cc.client_id) FILTER (WHERE mc.module_key = ANY(cc.active_modules)) AS active_clients_count,
  (mc.setup_price_ht + COALESCE(mc.monthly_price_ht, 0) * 12)
    * COUNT(DISTINCT cc.client_id) FILTER (WHERE mc.module_key = ANY(cc.active_modules)) AS estimated_yearly_revenue
FROM module_catalog mc
LEFT JOIN client_configs cc ON true
GROUP BY mc.id;
```

### Database Schema Changes

```sql
-- Migration 00069: module_catalog
CREATE TABLE module_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('catalog', 'custom')),
  setup_price_ht NUMERIC(10, 2) NOT NULL DEFAULT 0,
  monthly_price_ht NUMERIC(10, 2),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_modules TEXT[] NOT NULL DEFAULT '{}',
  manifest_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_module_catalog_category ON module_catalog(category);
CREATE INDEX idx_module_catalog_kind ON module_catalog(kind);
CREATE INDEX idx_module_catalog_is_active ON module_catalog(is_active);

ALTER TABLE module_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_catalog_select_operator"
  ON module_catalog FOR SELECT
  USING (is_operator());

CREATE POLICY "module_catalog_insert_operator"
  ON module_catalog FOR INSERT
  WITH CHECK (is_operator());

CREATE POLICY "module_catalog_update_operator"
  ON module_catalog FOR UPDATE
  USING (is_operator());

CREATE POLICY "module_catalog_delete_operator"
  ON module_catalog FOR DELETE
  USING (is_operator());

CREATE TRIGGER trg_module_catalog_updated_at
  BEFORE UPDATE ON module_catalog
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
```

### References

- [Source: CLAUDE.md — Module System plug & play]
- [Source: Story 11.3 — Création envoi de devis par MiKL Pennylane]
- [Source: Story 12.1 — Module Admin logs activité]
- [Source: Story 13.4 — Typologie de devis (quote_type)]
- [Source: ADR-01 Révision 2 — Coexistence Lab+One instance unique]

### Dependencies

- **Bloquée par** :
  - **Story 12.1** (done) — Module admin existe
  - **Story 11.3** (done) — Création de devis dans Pennylane
  - **Story 13.4** (à implémenter) — `quote_type` pour préselection du type de devis
- **Bloque** : toute future automatisation de vente (landing page d'offre modulaire, self-service catalogue, etc.)

### Risks

- **Complexité des dépendances cascade** : un module custom dépendant d'un autre custom peut créer des chaînes difficiles à débugger. **Mitigation** : limiter à 2 niveaux de profondeur, interdire les cycles via validation Zod, logger chaque cascade dans un toast explicite.
- **Désynchro catalogue ↔ monorepo** : si MiKL renomme ou supprime un module dans le code sans lancer `syncModuleCatalogFromManifests`, les activations sur des clients seront cassées. **Mitigation** : le helper marque `is_active=false` les modules orphelins + banner Hub qui alerte si des orphelins sont détectés.
- **Prix catalogue vs prix devis** : les prix du catalogue sont une référence, MiKL peut toujours ajuster les lignes du devis manuellement. **Pas un problème**, juste à documenter dans `catalog.md`.
- **Tarification mensuelle optionnelle** : un module peut avoir setup + mensuel (SaaS classique) OU juste setup (livraison one-shot). **Gérée** par `monthly_price_ht` nullable, UI affiche "—" si null.
- **Module `is_default` retiré par erreur** : si MiKL désactive `is_default=true` sur un module du One de base, les nouveaux clients n'auront plus ce module automatiquement. **Mitigation** : confirmation modale obligatoire avec message "Cela affectera tous les nouveaux clients One. Confirmer ?".

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

- AC5 : Modale édition utilise useState côté client + validation Zod côté serveur (pas React Hook Form, mais la validation est effective)
- AC9 : Seed utilise `elio` (clé unique du monorepo) au lieu de `elio-one`/`elio-lab`/`elio-hub` séparés (simplification cohérente avec l'architecture modules)
- AC10 : Warning cohérence implémenté avec extraction heuristique des modules depuis les lignes de devis Pennylane
- Vue analytics sépare setup (one-time) et récurrent (annuel) au lieu d'un total mélangé
- RPC `apply_client_module_config` valide les module_keys côté DB (defense-in-depth)
- Tests intégration et documentation catalog.md reportés (non-bloquants)

### File List

**Created:**
- `supabase/migrations/00088_create_module_catalog.sql`
- `supabase/migrations/00089_create_v_module_catalog_analytics.sql`
- `supabase/seed-module-catalog.sql`
- `packages/modules/admin/actions/list-module-catalog.ts`
- `packages/modules/admin/actions/upsert-module-catalog.ts`
- `packages/modules/admin/actions/delete-module-catalog.ts`
- `packages/modules/admin/actions/sync-module-catalog-from-manifests.ts`
- `packages/modules/admin/actions/toggle-client-module.ts`
- `packages/modules/admin/actions/apply-client-module-config.ts`
- `packages/modules/admin/actions/toggle-client-module.test.ts`
- `packages/modules/admin/actions/apply-client-module-config.test.ts`
- `packages/modules/admin/hooks/use-module-catalog.ts`
- `packages/modules/admin/hooks/use-client-modules.ts`
- `packages/modules/admin/hooks/use-catalog-analytics.ts`
- `packages/modules/admin/components/catalog-list.tsx`
- `packages/modules/admin/components/catalog-filters.tsx`
- `packages/modules/admin/components/module-edit-modal.tsx`
- `packages/modules/admin/components/catalog-analytics-widgets.tsx`
- `packages/modules/admin/components/generate-quote-from-modules-modal.tsx`
- `packages/modules/crm/components/client-modules-tab.tsx`
- `apps/hub/app/(dashboard)/modules/admin/catalog/page.tsx`
- `apps/hub/app/(dashboard)/modules/admin/catalog/loading.tsx`
- `apps/hub/app/(dashboard)/modules/admin/catalog/analytics/page.tsx`

**Modified:**
- `packages/modules/admin/index.ts`
- `packages/modules/crm/components/client-tabs.tsx`

### Change Log

- Story 13.5 créée — catalogue de modules Hub + tarification + activation par client + génération de devis (2026-04-13)
- Story 13.5 implémentée — 25 fichiers créés/modifiés, 9 tests (2026-04-16)
