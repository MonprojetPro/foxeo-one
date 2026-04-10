# Story 13.1: Renommage "Factures" → "Comptabilité" (Hub + Lab + One)

Status: done

## Story

As a **MiKL (opérateur) et clients Lab/One**,
I want **que l'onglet "Factures" s'appelle "Comptabilité" partout sur la plateforme**,
so that **le label reflète la réalité de ce qu'on y trouve (devis, factures, relances, justificatifs) et prépare les futures fonctionnalités**.

## Acceptance Criteria

**Given** MiKL accède au Hub
**When** il regarde la navigation latérale
**Then** l'entrée "Factures" est remplacée par "Comptabilité" avec une icône adaptée (Calculator ou BookOpen)

**Given** un client One accède à son dashboard
**When** il regarde la navigation
**Then** l'entrée "Factures" / "Mes factures" est remplacée par "Comptabilité"

**Given** un client Lab accède à son dashboard
**When** il regarde la navigation (si l'entrée facturation existe dans Lab)
**Then** l'entrée est renommée "Comptabilité"

**Given** un utilisateur navigue vers une page de l'onglet
**When** il regarde le fil d'Ariane et le titre de page
**Then** il voit "Comptabilité" (pas "Factures")

**Given** le module facturation est chargé
**When** le manifest est lu par le registry
**Then** `manifest.name` retourne "Comptabilité" et `manifest.route` reste inchangé (`/modules/facturation`)

## Tasks / Subtasks

- [x] Mettre à jour le manifest du module facturation
  - [x] `packages/modules/facturation/manifest.ts` → `name: 'Comptabilité'`
  - [x] Vérifier que `route`, `icon` et autres champs sont cohérents (changer icône si "Receipt" → "Calculator")

- [x] Mettre à jour la navigation Hub
  - [x] Rechercher toutes occurrences de "Factures" dans `apps/hub/` (navigation, sidebar, liens)
  - [x] Remplacer par "Comptabilité"

- [x] Mettre à jour la navigation client (One + Lab)
  - [x] Rechercher toutes occurrences de "Factures" / "Mes factures" dans `apps/client/`
  - [x] Remplacer par "Comptabilité"

- [x] Mettre à jour les titres de page et breadcrumbs
  - [x] `apps/hub/app/(dashboard)/modules/facturation/page.tsx` → title "Comptabilité" (piloté par le manifest + BillingDashboard, pas de h1 standalone)
  - [x] `apps/client/app/(dashboard)/modules/facturation/page.tsx` → h1 "Comptabilité"
  - [x] Toute page enfant (devis, factures, abonnements) → breadcrumb parent "Comptabilité"

- [x] Mettre à jour les textes UI (labels, tooltips, messages vides)
  - [x] Grep sur "Factures" dans `packages/modules/facturation/` → labels visibles vérifiés (tabs internes "Factures" = sous-section factures = intentionnellement conservé)
  - [x] Garder les noms de variables/fonctions internes inchangés (pas de refacto technique)

- [x] Créer les tests
  - [x] Test manifest : `manifest.name === 'Comptabilité'`
  - [x] Test navigation Hub : lien "Comptabilité" présent dans le rendu
  - [x] Test navigation client : idem

## Dev Notes

### Règles importantes

- **Ne pas renommer le module** (`facturation`) ni ses chemins de route (`/modules/facturation`) — uniquement les labels visuels
- **Ne pas renommer les variables, fonctions, types** — c'est un renommage UI pur
- **Grep systématique** avant de déclarer terminé : `grep -r "Factures" apps/ packages/modules/facturation/components/` (hors commentaires et tests)

### Source Tree (fichiers probables à modifier)

```
packages/modules/facturation/
└── manifest.ts                           # MODIFIER: name, icon

apps/hub/
└── app/(dashboard)/                      # MODIFIER: nav items, page titles

apps/client/
└── app/(dashboard)/                      # MODIFIER: nav items, page titles

packages/ui/src/
└── dashboard-shell/                      # MODIFIER si nav hardcodée ici
```

### Existing Code Findings

- Module manifest pattern : voir `packages/modules/*/manifest.ts` — champ `name` contrôle le label nav
- Navigation : vérifier si elle est générée depuis le manifest (dynamique) ou hardcodée dans le shell

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Renommage UI pur : `name` + `navigation.label` + `icon` dans le manifest (Receipt → Calculator)
- Hub sidebar : icône `Receipt` → `Calculator`, label `'Factures'` → `'Comptabilité'`
- Page client One : h1 `'Mes factures'` → `'Comptabilité'`, description mise à jour
- Documentation page : `MODULE_NAMES['facturation']` → `'Comptabilité'`
- Hub error.tsx : titre `'Erreur du module Facturation'` → `'Erreur du module Comptabilité'`
- Tabs internes billing-dashboard (`'Factures'`) conservés : désignent les factures (sous-section), pas le module
- Fix bonus : bug pre-existant dans hub-sidebar-client.test.tsx (Proxy lucide-react causait un hang infini car retournait MockIcon pour la propriété `then`, rendant le module thenable). Résolu via `importOriginal`.
- Tests pré-existants mis à jour pour correspondre au composant actuel (prop `modules` supprimée du composant).
- 15 tests : 5 manifest + 9 hub-sidebar + 1 client page — tous ✅

### File List

- `packages/modules/facturation/manifest.ts`
- `packages/modules/facturation/manifest.test.ts`
- `apps/hub/components/hub-sidebar-client.tsx`
- `apps/hub/components/hub-sidebar-client.test.tsx`
- `apps/hub/app/(dashboard)/modules/facturation/error.tsx`
- `apps/client/app/(dashboard)/modules/facturation/page.tsx`
- `apps/client/app/(dashboard)/modules/facturation/page.test.tsx` _(nouveau)_
- `apps/client/app/(dashboard)/modules/documentation/page.tsx`
- `packages/modules/facturation/components/billing-dashboard.tsx` _(CR fix: h1 "Facturation" → "Comptabilité")_
- `packages/modules/facturation/index.ts` _(CR fix: commentaire mis à jour)_
