# Story 10.1: Dashboard One — Accueil personnalisé, navigation & modules actives

> ## ⚠️ REWORK REQUIRED — Décision architecturale 2026-04-13
>
> Cette story a été implémentée sous l'ancienne architecture (Lab et One déployés séparément). Le modèle a changé : Lab et One cohabitent désormais dans la même instance client avec un toggle persistant.
>
> **Référence** : [ADR-01](../../planning-artifacts/architecture/adr-01-lab-one-coexistence-same-instance.md) — Coexistence Lab+One dans une instance unique.
>
> **Impact sur cette story** : Ajouter le toggle Mode Lab / Mode One dans le header du shell (visible uniquement si `clientConfig.labModeAvailable === true`). Le toggle bascule le thème CSS, le jeu d'onglets, et l'état global sans rechargement de page.
>
> **À reworker** : Une story de refonte sera créée dans l'Epic 13 — Refonte coexistence Lab/One.

Status: done

## Story

As a **client One (établi)**,
I want **accéder à mon dashboard personnalisé avec les modules activés pour moi et une navigation adaptée**,
so that **j'ai un espace professionnel clair avec uniquement les outils dont j'ai besoin**.

## Acceptance Criteria

**Given** un client One se connecte à son dashboard (FR38)
**When** la page d'accueil se charge
**Then** le dashboard One affiche :
- Un header avec le logo MonprojetPro One (ou branding personnalisé si configuré)
- Un message d'accueil : "Bonjour {prénom}" avec la date du jour
- Une section "Actions rapides" avec raccourcis vers les modules les plus utilisés
- Une section "Activité récente" : derniers messages MiKL, derniers documents mis à jour, dernière activité Elio
- Un accès rapide à Elio One (widget chat ou bouton flottant)
**And** la page se charge en moins de 2 secondes (NFR-P1)
**And** le design suit la palette One (orange vif + bleu-gris, dark mode) ou le branding personnalisé

**Given** le client One a des modules actives (FR39)
**When** il consulte la navigation sidebar
**Then** seuls les modules actives pour ce client sont affichés dans la sidebar :
- La liste provient de `client_configs.active_modules`
- Chaque module affiche son icône et son label (depuis le module manifest)
- Les modules sont triés par catégorie : Communication, Documents, Outils métier, Paramètres
- Un module désactivé n'apparaît PAS dans la navigation
**And** le module registry résout les modules au chargement en vérifiant `active_modules` ∩ `module_manifests` avec `targets` incluant 'client-one'
**And** si aucun module n'est activé (cas improbable), un message invite à contacter MiKL

**Given** le dashboard One doit s'adapter au client
**When** le composant `dashboard-home.tsx` se charge
**Then** il utilise les données de `client_configs` pour personnaliser :
- Les modules affichés (via `active_modules`)
- Le branding (via `custom_branding` — logo, nom affiché) (FR139, Story 10.4)
- Le message d'accueil (via profil communication si disponible)
**And** les données client sont fetchées via TanStack Query avec queryKey `['client-config', clientId]`
**And** le layout est responsive : sidebar collapsible sur mobile, grille adaptative pour les widgets

## Tasks / Subtasks

- [x] Implémenter sidebar dynamique basée sur `active_modules` (AC: #2)
  - [x] Modifier `apps/client/app/(dashboard)/layout.tsx`
  - [x] Fetcher `client_configs` (active_modules, dashboard_type, custom_branding) depuis DB
  - [x] Remplacer le hardcode `'client-lab'` → déterminer target dynamiquement : `dashboard_type === 'one' ? 'client-one' : 'client-lab'`
  - [x] Enregistrer tous les modules dans `discoverModules()` (pas seulement core-dashboard)
  - [x] Filtrer les modules : `getModulesForTarget(target).filter(m => activeModules.includes(m.id))`
  - [x] Si `activeModules` vide → afficher message "Contactez MiKL pour activer vos modules"
  - [x] Passer density `'comfortable'` pour dashboard_type `'one'`, `'spacious'` pour `'lab'`

- [x] Créer hook `useClientConfig` pour TanStack Query (AC: #3)
  - [x] Créer `packages/modules/core-dashboard/hooks/use-client-config.ts`
  - [x] `queryKey: ['client-config', clientId]`
  - [x] Fetch via Server Component (passage prop depuis RSC → client) OU via server action
  - [x] Type: `ClientConfig` de `@monprojetpro/types`
  - [x] Stale time: 5 minutes (config peu volatile)

- [x] Implémenter page d'accueil One personnalisée (AC: #1)
  - [x] Refactorer `packages/modules/core-dashboard/components/core-dashboard.tsx`
  - [x] Composant **client** — props: `{ clientConfig: ClientConfig, clientName: string }`
  - [x] Section header: "Bonjour {prenom}" + date du jour (`new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date())`)
  - [x] Section "Actions rapides" : cards cliquables pour les 4 modules les plus utilisés (liste depuis `active_modules`)
  - [x] Section "Activité récente" : 3 widgets skeleton si données non disponibles (Epic 10 scope = structure + skeleton)
  - [x] Accès rapide Elio : bouton flottant ou card (composant `ElioFloatingButton` depuis `@monprojetpro/modules-elio`)
  - [x] Si `custom_branding.logoUrl` → afficher logo client, sinon logo MonprojetPro One

- [x] Créer Server Component page accueil avec data fetching (AC: #1, #3)
  - [x] Modifier `apps/client/app/(dashboard)/page.tsx`
  - [x] Fetcher client via `createServerSupabaseClient()` → `clients.first_name`
  - [x] Fetcher `client_configs` → passer props à `CoreDashboard`
  - [x] Loading state via `loading.tsx` avec skeleton adapté
  - [x] Error boundary via `error.tsx`

- [x] Enregistrer tous les modules dans le registry (AC: #2)
  - [x] Modifier `packages/utils/src/module-registry.ts`
  - [x] `discoverModules()` : enregistrer dynamiquement TOUS les modules disponibles (`chat`, `documents`, `elio`, `parcours`, `validation-hub`, `crm`, `notifications`, `visio`, `support`, `admin`)
  - [x] Chaque module est importé via dynamic import avec try/catch (tolérant aux modules absents)
  - [x] Un module avec `targets` ne contenant pas `'client-one'` n'est pas retourné par `getModulesForTarget('client-one')`

- [x] Créer tests unitaires (TDD)
  - [x] Test `module-registry.ts` : `discoverModules` + `getModulesForTarget` avec active_modules filter
  - [x] Test `core-dashboard.tsx` : rendu avec/sans branding, message d'accueil, sections
  - [x] Test `use-client-config.ts` : queryKey correct, données mappées
  - [x] Test `dashboard/page.tsx` : données client fetchées et passées correctement

## Dev Notes

### Architecture Patterns
- **Pattern RSC + TanStack Query** : données initiales fetchées en Server Component, hydratées pour cache TanStack Query côté client
- **Pattern module registry dynamique** : `discoverModules()` doit charger tous les modules ; actuellement stub ne charge que `core-dashboard`
- **Pattern sidebar filtrée** : `getModulesForTarget(target).filter(m => activeModules.includes(m.id))` — double filtre : target + active_modules
- **Pattern density** : dashboard_type 'one' → density 'comfortable', 'lab' → 'spacious' (cf. DashboardShell)

### Source Tree Components
```
apps/client/
├── app/(dashboard)/
│   ├── layout.tsx                           # MODIFIER: sidebar dynamique + density
│   ├── page.tsx                             # MODIFIER: RSC avec data fetching client
│   └── loading.tsx                          # MODIFIER: skeleton dashboard accueil
packages/modules/core-dashboard/
├── components/
│   ├── core-dashboard.tsx                   # REFACTORER: accueil personnalisé One
│   └── core-dashboard.test.ts              # CRÉER: tests
├── hooks/
│   └── use-client-config.ts                # CRÉER: TanStack Query hook
packages/utils/src/
└── module-registry.ts                      # MODIFIER: discoverModules() complet
```

### Existing Code Findings
- `apps/client/app/(dashboard)/layout.tsx` — hardcode `client-lab` target → à dynamiser
- `packages/utils/src/module-registry.ts` — `discoverModules()` stub ne charge que `core-dashboard`
- `packages/modules/core-dashboard/components/core-dashboard.tsx` — stub minimal sans data
- `ClientConfig` type dans `@monprojetpro/types/src/client-config.types.ts` : `activeModules: string[]`, `customBranding?: CustomBranding`, `dashboardType`
- `client_configs` table : `active_modules TEXT[] DEFAULT ARRAY['core-dashboard']`, `dashboard_type TEXT DEFAULT 'one'`, `custom_branding JSONB DEFAULT '{}'`

### Technical Constraints
- `discoverModules()` utilise des dynamic imports → OK côté serveur Next.js, MAIS côté client doit passer par RSC props
- Les modules désactivés par MiKL ne doivent JAMAIS apparaître dans la sidebar client — filtre critique
- `dashboard_type` détermine à la fois le target ('client-lab'/'client-one') ET la density ('spacious'/'comfortable')
- Le composant `CoreDashboard` reste 'use client' pour interactivité (date, Elio button) — props passées depuis RSC

### UI Patterns
- Palette One : `--accent` orange `#F7931E`, dark mode par défaut
- `DashboardShell` accepte `density="comfortable"` pour One
- `ModuleSidebar` de `@monprojetpro/ui` accepte `modules: ModuleManifest[]` et `target`
- Skeleton loaders : utiliser `Skeleton` de `@monprojetpro/ui` dans `loading.tsx`
- Message "Bonjour {prénom}" : `clients.first_name` ou fallback sur `clients.name`

### Previous Story Learnings (Epic 9)
- Pattern RLS: toujours vérifier `auth_user_id` puis joindre la table cliente
- `supabase.from('clients').select('id, first_name, operator_id').eq('auth_user_id', user.id).maybeSingle()` — pattern standard layout client
- `Array.isArray(x) ? x[0] : x` pour normaliser retours Supabase avec relations jointes
- Tests co-localisés `.test.ts` à côté du source

### References
- [Source: docs/project-context.md#Module Structure] — contrat ModuleManifest
- [Source: docs/project-context.md#Data Fetching] — 3 patterns uniquement
- [Source: packages/types/src/client-config.types.ts] — ClientConfig, CustomBranding
- [Source: supabase/migrations/00003_create_client_configs.sql] — schema client_configs
- [Source: apps/client/app/(dashboard)/layout.tsx] — layout existant à modifier
- [Source: packages/utils/src/module-registry.ts] — module registry à compléter
- [Source: _bmad-output/planning-artifacts/epics/epic-10-dashboard-one-modules-commerciaux-stories-detaillees.md#Story 10.1]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `discoverModules()` étendu : 11 modules enregistrés (core-dashboard + 10) via dynamic imports avec try/catch
- Sidebar dynamique : target calculé depuis `dashboard_type`, density depuis `dashboard_type`, filtrage par `active_modules`
- `CoreDashboard` refactoré : props `{ clientConfig, clientName }`, greeting FR, actions rapides (4 premiers modules hors core-dashboard), skeletons activité, fallback branding
- Server action `getClientConfig` créée, hook `useClientConfig` avec staleTime 5min
- `ElioFloatingButton` créé dans `@monprojetpro/module-elio`
- `error.tsx` créé pour le dashboard
- 34 tests passants (module-registry: 13, core-dashboard: 8, use-client-config: 7, get-client-config: 6)

**Code Review Fixes (Opus):**
- [H1] Ajout accès rapide Élio dans CoreDashboard (section inline, pas import inter-module)
- [M1] Remplacement `<a>` par `next/link` dans QuickAccessCard + section Élio
- [M2+M3] Fusion queries layout.tsx : single query `clients + client_configs` via join Supabase
- [M2] page.tsx : même pattern join pour éviter le double fetch
- [M4] core-dashboard.test.ts : ajout section `rendering` avec tests de rendu réel (createElement mocks)
- [M5] loading.tsx : skeleton adapté au layout dashboard (header, actions rapides, activité)
- [L2] Parenthèses clarificatrices dans get-client-config.ts
- 40 tests passants après CR fixes

### File List

- `packages/utils/src/module-registry.ts` (modifié — discoverModules complet)
- `packages/utils/src/module-registry.test.ts` (modifié — tests client-one + discoverModules)
- `apps/client/app/(dashboard)/layout.tsx` (modifié — sidebar dynamique)
- `apps/client/app/(dashboard)/page.tsx` (modifié — RSC avec data fetching)
- `apps/client/app/(dashboard)/error.tsx` (créé)
- `packages/modules/core-dashboard/components/core-dashboard.tsx` (refactoré)
- `packages/modules/core-dashboard/components/core-dashboard.test.ts` (créé)
- `packages/modules/core-dashboard/hooks/use-client-config.ts` (créé)
- `packages/modules/core-dashboard/hooks/use-client-config.test.ts` (créé)
- `packages/modules/core-dashboard/actions/get-client-config.ts` (créé)
- `packages/modules/core-dashboard/actions/get-client-config.test.ts` (créé)
- `packages/modules/core-dashboard/index.ts` (modifié — nouveaux exports)
- `packages/modules/core-dashboard/package.json` (modifié — dépendances)
- `packages/modules/elio/components/elio-floating-button.tsx` (créé)
- `packages/modules/elio/index.ts` (modifié — export ElioFloatingButton)
- `apps/client/app/(dashboard)/loading.tsx` (modifié — skeleton adapté dashboard)
