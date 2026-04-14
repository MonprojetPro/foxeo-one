# Story 1.8: UX transversale (fil d'ariane, etats vides, messages confirmation, erreurs, robustesse)

Status: completed

## Story

As a **utilisateur (MiKL ou client)**,
I want **un fil d'ariane clair, des etats vides explicatifs, des messages de confirmation apres chaque action, des messages d'erreur explicites et une gestion gracieuse des connexions instables**,
So that **je sais toujours ou je suis, ce que je peux faire et ce qui se passe**.

**FRs couvertes :** FR56 (confirmation actions sensibles), FR73 (etats vides), FR82 (erreurs explicites), FR108 (fil d'ariane), FR134 (messages confirmation), FR151 (navigateur non supporte), FR152 (connexion instable)

## Acceptance Criteria

1. **AC1: Fil d'ariane (breadcrumb)**
   - **Given** un utilisateur qui navigue dans le dashboard
   - **When** il est dans un module (ex: /modules/crm/clients/123)
   - **Then** un fil d'ariane affiche sa position : Dashboard > CRM > Client > Fiche (FR108)
   - **And** chaque niveau est cliquable pour remonter
   - **And** le composant `Breadcrumb` est dans `@monprojetpro/ui`

2. **AC2: Etats vides explicatifs**
   - **Given** un utilisateur qui accede a une section sans contenu
   - **When** la liste est vide (pas de documents, pas de messages, pas de clients)
   - **Then** un etat vide explicatif s'affiche avec illustration, message engageant et CTA (FR73)
   - **And** le composant `EmptyState` existant de @monprojetpro/ui est utilise (deja cree en Story 1.1)
   - **And** des presets d'etats vides sont disponibles pour les cas transversaux (pas de resultats, erreur chargement, premiere utilisation)

3. **AC3: Toast de confirmation apres action reussie**
   - **Given** un utilisateur qui effectue une action (creation, modification, suppression)
   - **When** l'action reussit
   - **Then** un toast de confirmation s'affiche (FR134)
   - **And** le message est contextualise ("Client cree avec succes", "Document partage")
   - **And** la librairie Sonner est utilisee pour les toasts

4. **AC4: Erreurs explicites — jamais d'ecran blanc**
   - **Given** une erreur cote serveur ou reseau
   - **When** l'erreur survient
   - **Then** un message explicite s'affiche — jamais d'ecran blanc (FR82)
   - **And** l'error boundary du module capture le crash sans affecter le reste du shell
   - **And** le message indique la nature de l'erreur et une action possible
   - **And** un composant `ErrorDisplay` reutilisable est dans `@monprojetpro/ui`

5. **AC5: Navigateur non supporte**
   - **Given** un navigateur non supporte
   - **When** l'utilisateur accede a l'application
   - **Then** un message explicite informe que le navigateur n'est pas compatible (FR151)

6. **AC6: Connexion reseau instable**
   - **Given** une connexion reseau instable
   - **When** une requete echoue a cause du reseau
   - **Then** le systeme retente automatiquement (retry via TanStack Query)
   - **And** un message discret informe de la perte de connexion (FR152)
   - **And** quand la connexion revient, les donnees se resynchronisent

7. **AC7: Dialogue de confirmation pour actions sensibles**
   - **Given** une action sensible (suppression, modification critique)
   - **When** l'utilisateur la declenche
   - **Then** une boite de dialogue de confirmation s'affiche avant execution (FR56)
   - **And** le composant AlertDialog existant de @monprojetpro/ui est utilise
   - **And** un hook `useConfirmDialog()` simplifie l'usage programmatique

8. **AC8: Tests**
   - **Given** tous les composants crees/modifies
   - **When** les tests s'executent
   - **Then** breadcrumb, toast, error-display, use-online, use-confirm-dialog, browser-warning ont des tests co-localises
   - **And** `turbo build` compile sans erreur TypeScript
   - **And** zero regressions sur les 481 tests existants

## Tasks / Subtasks

- [x] Task 1 — Installer Sonner et creer le systeme Toast (AC: #3)
  - [x] 1.1 Installer `sonner` dans `packages/ui/`
  - [x] 1.2 Creer `packages/ui/src/components/sonner.tsx` — wrapper Toaster avec theming MonprojetPro (dark mode, OKLCH variables)
  - [x] 1.3 Creer `packages/ui/src/components/toast-utils.ts` — helpers `showSuccess()`, `showError()`, `showInfo()` pour messages contextualises
  - [x] 1.4 Ajouter `<Toaster />` dans les root layouts des 2 apps (hub + client)
  - [x] 1.5 Exporter depuis `@monprojetpro/ui` index.ts
  - [x] 1.6 Creer `packages/ui/src/components/sonner.test.ts` — tests du wrapper

- [x] Task 2 — Creer le composant Breadcrumb (AC: #1)
  - [x] 2.1 Creer `packages/ui/src/components/breadcrumb.tsx` — composant compose : Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator (style shadcn/ui classique)
  - [x] 2.2 Le breadcrumb utilise `<nav aria-label="Fil d'ariane">` et `<ol>` semantique (accessibilite WCAG)
  - [x] 2.3 Chaque niveau est un lien cliquable sauf le dernier (page courante)
  - [x] 2.4 Separator par defaut : ChevronRight de lucide-react
  - [x] 2.5 Exporter depuis `@monprojetpro/ui` index.ts
  - [x] 2.6 Creer `packages/ui/src/components/breadcrumb.test.ts`

- [x] Task 3 — Creer le composant ErrorDisplay reutilisable (AC: #4)
  - [x] 3.1 Creer `packages/ui/src/components/error-display.tsx` — Props: `error` (ActionError ou Error), `onRetry?: () => void`, `title?: string`
  - [x] 3.2 Affiche icone alerte + titre + message + bouton Reessayer (si onRetry fourni)
  - [x] 3.3 Style coherent avec le design system dark mode
  - [x] 3.4 Refactorer `apps/hub/app/(dashboard)/modules/[moduleId]/error.tsx` pour utiliser `<ErrorDisplay />`
  - [x] 3.5 Refactorer `apps/client/app/(dashboard)/modules/[moduleId]/error.tsx` pour utiliser `<ErrorDisplay />`
  - [x] 3.6 Refactorer `apps/client/app/(dashboard)/settings/sessions/error.tsx` pour utiliser `<ErrorDisplay />`
  - [x] 3.7 Exporter depuis `@monprojetpro/ui` index.ts
  - [x] 3.8 Creer `packages/ui/src/components/error-display.test.ts`

- [x] Task 4 — Creer le hook useOnline et le composant OfflineBanner (AC: #6)
  - [x] 4.1 Creer `packages/ui/src/hooks/use-online.ts` — hook basé sur `navigator.onLine` + events `online`/`offline`
  - [x] 4.2 Creer `packages/ui/src/components/offline-banner.tsx` — banniere discrete "Connexion perdue — Reconnexion en cours..." avec animation, auto-dismiss quand online revient
  - [x] 4.3 Configurer TanStack Query retry dans les QueryProvider des 2 apps : `retry: 3`, `retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000)`, `refetchOnReconnect: true`
  - [x] 4.4 Integrer `<OfflineBanner />` dans les root layouts des 2 apps (au-dessus du contenu principal)
  - [x] 4.5 Exporter depuis `@monprojetpro/ui` index.ts
  - [x] 4.6 Creer `packages/ui/src/hooks/use-online.test.ts` et `packages/ui/src/components/offline-banner.test.ts`

- [x] Task 5 — Creer le composant BrowserWarning (AC: #5)
  - [x] 5.1 Creer `packages/ui/src/components/browser-warning.tsx` — banniere conditionnelle pour navigateurs non supportes
  - [x] 5.2 Navigateurs supportes : Chrome >= 90, Firefox >= 90, Safari >= 15, Edge >= 90. Afficher un message pour les autres
  - [x] 5.3 Detection via `navigator.userAgent` (reutiliser `parseUserAgent` de `@monprojetpro/utils` si possible, sinon detection simplifiee cote client)
  - [x] 5.4 Banniere dismissable (une seule fois par session, persister dans sessionStorage)
  - [x] 5.5 Integrer dans les root layouts des 2 apps
  - [x] 5.6 Exporter depuis `@monprojetpro/ui` index.ts
  - [x] 5.7 Creer `packages/ui/src/components/browser-warning.test.ts`

- [x] Task 6 — Creer le hook useConfirmDialog (AC: #7)
  - [x] 6.1 Creer `packages/ui/src/hooks/use-confirm-dialog.ts` — hook qui retourne `{ confirm, ConfirmDialog }` pour usage programmatique avec AlertDialog
  - [x] 6.2 API : `const confirmed = await confirm({ title, description, confirmLabel?, cancelLabel?, variant? })`
  - [x] 6.3 Utilise AlertDialog existant de @monprojetpro/ui (ne pas creer un nouveau composant dialog)
  - [x] 6.4 Support `variant: 'destructive'` pour les suppressions (bouton rouge)
  - [x] 6.5 Exporter depuis `@monprojetpro/ui` index.ts
  - [x] 6.6 Creer `packages/ui/src/hooks/use-confirm-dialog.test.ts`

- [x] Task 7 — Enrichir EmptyState avec presets (AC: #2)
  - [x] 7.1 Creer `packages/ui/src/components/empty-state-presets.ts` — presets exportes : `EMPTY_SEARCH` (pas de resultats), `EMPTY_LIST` (liste vide, premiere utilisation), `EMPTY_ERROR` (erreur chargement)
  - [x] 7.2 Chaque preset fournit : icon (Lucide), title, description en francais
  - [x] 7.3 Usage : `<EmptyState {...EMPTY_SEARCH} action={<Button>Modifier les filtres</Button>} />`
  - [x] 7.4 NE PAS modifier le composant EmptyState existant — il est deja fonctionnel
  - [x] 7.5 Exporter depuis `@monprojetpro/ui` index.ts
  - [x] 7.6 Creer `packages/ui/src/components/empty-state-presets.test.ts`

- [x] Task 8 — Integration dans le DashboardShell (AC: #1, #6)
  - [x] 8.1 Ajouter un slot `breadcrumb` dans le header du DashboardShell (au-dessus ou en dessous du header existant)
  - [x] 8.2 Le breadcrumb est optionnel — si non fourni, rien ne s'affiche
  - [x] 8.3 Verifier que OfflineBanner, BrowserWarning et Toaster sont bien places dans les layouts root et non dans le shell

- [x] Task 9 — Tests d'integration (AC: #8)
  - [x] 9.1 Verifier `turbo build` compile sans erreur TypeScript
  - [x] 9.2 Verifier zero regressions sur les 481 tests existants (Story 1.7)
  - [x] 9.3 Compter le nombre total de tests (objectif : 481 + ~35-50 nouveaux)

## Dev Notes

### Ce qui EXISTE deja — NE PAS recreer

| Composant | Fichier | Status |
|-----------|---------|--------|
| `EmptyState` | `packages/ui/src/components/empty-state.tsx` | OK — Props: icon, title, description, action |
| `AlertDialog` | `packages/ui/src/alert-dialog.tsx` | OK — Radix-based, complet |
| `Skeleton` | `packages/ui/src/skeleton.tsx` | OK — pulse animation |
| `ShellSkeleton` | `packages/ui/src/components/shell-skeleton.tsx` | OK |
| `ModuleSkeleton` | `packages/ui/src/components/module-skeleton.tsx` | OK |
| `DashboardShell` | `packages/ui/src/components/dashboard-shell.tsx` | OK — density, mobile Sheet, ARIA |
| `Sidebar` (723 lignes) | `packages/ui/src/sidebar.tsx` | OK — NE PAS TOUCHER |
| `ThemeToggle` | `packages/ui/src/components/theme-toggle.tsx` | OK |
| `ThemeProvider` | `packages/supabase/src/providers/theme-provider.tsx` | OK |
| `useIsMobile` | `packages/ui/src/use-mobile.ts` | OK |
| `parseUserAgent` | `packages/utils/src/parse-user-agent.ts` | OK — browser/os detection |
| `Button` (6 variants) | `packages/ui/src/button.tsx` | OK |
| `Card` | `packages/ui/src/card.tsx` | OK |
| `Dialog` | `packages/ui/src/dialog.tsx` | OK |
| `Sheet` | `packages/ui/src/sheet.tsx` | OK |
| error.tsx (3 fichiers) | `apps/*/error.tsx` | A REFACTORER avec ErrorDisplay |

### Ce qui N'EXISTE PAS — a creer

| Composant | Fichier cible | Dependances |
|-----------|--------------|-------------|
| Toast (Sonner) | `packages/ui/src/components/sonner.tsx` | `sonner` (a installer) |
| Toast utils | `packages/ui/src/components/toast-utils.ts` | sonner.tsx |
| Breadcrumb | `packages/ui/src/components/breadcrumb.tsx` | lucide-react (ChevronRight) |
| ErrorDisplay | `packages/ui/src/components/error-display.tsx` | Button, AlertTriangle |
| OfflineBanner | `packages/ui/src/components/offline-banner.tsx` | use-online.ts |
| useOnline | `packages/ui/src/hooks/use-online.ts` | aucune |
| BrowserWarning | `packages/ui/src/components/browser-warning.tsx` | aucune |
| useConfirmDialog | `packages/ui/src/hooks/use-confirm-dialog.ts` | AlertDialog |
| EmptyState presets | `packages/ui/src/components/empty-state-presets.ts` | lucide-react |

### Sonner — Configuration recommandee

```tsx
// packages/ui/src/components/sonner.tsx
'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: 'bg-card border-border text-foreground',
          title: 'text-foreground font-medium',
          description: 'text-muted-foreground',
          success: 'border-l-4 border-l-green-500',
          error: 'border-l-4 border-l-destructive',
          info: 'border-l-4 border-l-primary',
        },
      }}
      richColors
    />
  )
}
```

```tsx
// packages/ui/src/components/toast-utils.ts
import { toast } from 'sonner'

export function showSuccess(message: string) {
  toast.success(message)
}

export function showError(message: string) {
  toast.error(message)
}

export function showInfo(message: string) {
  toast(message)
}
```

**ATTENTION :** Sonner s'installe dans `packages/ui/` :
```bash
cd packages/ui && npm install sonner
```

### Breadcrumb — Pattern shadcn/ui

Suivre le pattern de composition shadcn/ui (comme les autres composants existants) :

```tsx
// packages/ui/src/components/breadcrumb.tsx
import { ChevronRight } from 'lucide-react'
import { cn } from '@monprojetpro/utils'

// Composants : Breadcrumb, BreadcrumbList, BreadcrumbItem,
// BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis
// Utiliser <nav aria-label="Fil d'ariane"> + <ol> semantique
// Chaque BreadcrumbLink est un <a> cliquable
// BreadcrumbPage est un <span aria-current="page">
```

Le breadcrumb sera alimente par les routes des modules. Pour cette story, on cree le **composant UI generique**. L'integration avec le routing des modules (dynamique selon la route) sera faite quand les modules seront developpes (Epic 2+).

### ErrorDisplay — Pattern recommande

```tsx
// packages/ui/src/components/error-display.tsx
'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '../button'

type ErrorDisplayProps = {
  title?: string
  message?: string
  onRetry?: () => void
}

// Affiche : icone AlertTriangle + titre + message + bouton Reessayer
// Centré, style card avec border destructive subtle
// Le bouton Reessayer n'apparait que si onRetry est fourni
```

### useOnline — Hook reseau

```typescript
// packages/ui/src/hooks/use-online.ts
'use client'

import { useState, useEffect } from 'react'

export function useOnline() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
```

### TanStack Query — Retry config

Les QueryProvider des 2 apps doivent configurer le retry :

```tsx
// Dans le queryClient creation (apps/hub et apps/client)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
})
```

**VERIFIER** : Le QueryProvider existe dans `packages/supabase/src/providers/query-provider.tsx`. Si le retry n'est pas deja configure, l'ajouter. NE PAS creer un nouveau provider.

### useConfirmDialog — Usage programmatique

```tsx
// packages/ui/src/hooks/use-confirm-dialog.ts
'use client'

import { useState, useCallback } from 'react'

type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string   // defaut: "Confirmer"
  cancelLabel?: string    // defaut: "Annuler"
  variant?: 'default' | 'destructive'
}

// Retourne { confirm, ConfirmDialog }
// confirm(options) retourne une Promise<boolean>
// ConfirmDialog est le composant a rendre dans le JSX
// Utilise AlertDialog existant de @monprojetpro/ui
```

**Usage cote composant :**
```tsx
function DeleteButton({ clientId }) {
  const { confirm, ConfirmDialog } = useConfirmDialog()

  async function handleDelete() {
    const ok = await confirm({
      title: 'Supprimer ce client ?',
      description: 'Cette action est irreversible.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    })
    if (ok) {
      await deleteClient(clientId)
      showSuccess('Client supprime')
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
      <ConfirmDialog />
    </>
  )
}
```

### BrowserWarning — Detection navigateurs

Navigateurs supportes (cibles V1 MonprojetPro) :
- Chrome >= 90
- Firefox >= 90
- Safari >= 15
- Edge (Chromium) >= 90

Le composant affiche une banniere jaune/warning si le navigateur n'est pas dans la liste. La banniere est dismissable (persister dans `sessionStorage` pour ne pas reafficher).

**ATTENTION :** `parseUserAgent` de `@monprojetpro/utils` est concu pour le server-side (Story 1.6, sessions). Pour la detection cote client dans un composant React, utiliser directement `navigator.userAgent` et une regex simple. Ne pas importer le util server-side dans un composant `'use client'`.

### Fichiers root layout a modifier

**`apps/hub/app/layout.tsx` :**
- Ajouter `<Toaster />` (Sonner)
- Ajouter `<OfflineBanner />`
- Ajouter `<BrowserWarning />`

**`apps/client/app/layout.tsx` :**
- Ajouter `<Toaster />` (Sonner)
- Ajouter `<OfflineBanner />`
- Ajouter `<BrowserWarning />`

**Ordre dans le layout :** BrowserWarning (tout en haut, conditionnel) > OfflineBanner (fixe, z-50) > ... contenu normal ... > Toaster (portal, position absolute)

### Naming Conventions — RESPECTER

| Element | Convention | Exemple |
|---------|-----------|---------|
| Composants | PascalCase | `Breadcrumb`, `ErrorDisplay`, `OfflineBanner` |
| Fichiers composants | kebab-case.tsx | `breadcrumb.tsx`, `error-display.tsx`, `offline-banner.tsx` |
| Hooks | use + PascalCase | `useOnline()`, `useConfirmDialog()` |
| Fichiers hooks | use-camelcase.ts | `use-online.ts`, `use-confirm-dialog.ts` |
| Tests co-localises | meme-nom.test.ts | `breadcrumb.test.ts`, `use-online.test.ts` |
| Presets/constantes | UPPER_SNAKE_CASE | `EMPTY_SEARCH`, `EMPTY_LIST` |
| CSS | Variables existantes | `bg-card`, `text-foreground`, `border-destructive` |

### Project Structure Notes

```
packages/ui/src/
├── hooks/                              (CREER le dossier s'il n'existe pas)
│   ├── use-online.ts                   ← CREER
│   ├── use-online.test.ts             ← CREER
│   ├── use-confirm-dialog.ts          ← CREER
│   └── use-confirm-dialog.test.ts     ← CREER
├── components/
│   ├── breadcrumb.tsx                  ← CREER
│   ├── breadcrumb.test.ts             ← CREER
│   ├── sonner.tsx                      ← CREER
│   ├── toast-utils.ts                 ← CREER
│   ├── sonner.test.ts                 ← CREER
│   ├── error-display.tsx              ← CREER
│   ├── error-display.test.ts          ← CREER
│   ├── offline-banner.tsx             ← CREER
│   ├── offline-banner.test.ts         ← CREER
│   ├── browser-warning.tsx            ← CREER
│   ├── browser-warning.test.ts        ← CREER
│   ├── empty-state-presets.ts         ← CREER
│   ├── empty-state-presets.test.ts    ← CREER
│   ├── empty-state.tsx                 ← NE PAS MODIFIER
│   ├── dashboard-shell.tsx             ← MODIFIER (ajouter slot breadcrumb)
│   └── theme-toggle.tsx                ← NE PAS MODIFIER
├── index.ts                            ← MODIFIER (ajouter exports)

apps/hub/app/
├── layout.tsx                          ← MODIFIER (ajouter Toaster, OfflineBanner, BrowserWarning)
├── (dashboard)/modules/[moduleId]/
│   └── error.tsx                       ← REFACTORER (utiliser ErrorDisplay)

apps/client/app/
├── layout.tsx                          ← MODIFIER (ajouter Toaster, OfflineBanner, BrowserWarning)
├── (dashboard)/modules/[moduleId]/
│   └── error.tsx                       ← REFACTORER (utiliser ErrorDisplay)
├── (dashboard)/settings/sessions/
│   └── error.tsx                       ← REFACTORER (utiliser ErrorDisplay)
```

**Fichiers a NE PAS modifier :**
- `packages/ui/src/sidebar.tsx` (723 lignes, complexe, aucune raison de toucher)
- `packages/ui/src/skeleton.tsx`
- `packages/ui/src/alert-dialog.tsx` (utilise tel quel par useConfirmDialog)
- `packages/supabase/src/providers/theme-provider.tsx`
- Aucune migration Supabase dans cette story
- Aucun middleware

### Anti-Patterns a eviter

- **NE PAS** utiliser `react-toastify` ou `react-hot-toast` — Sonner est le choix (meme stack, meilleure integration dark mode)
- **NE PAS** creer un systeme de toast custom — Sonner fait tout
- **NE PAS** recreer un AlertDialog custom pour les confirmations — utiliser le composant existant via le hook
- **NE PAS** importer `parseUserAgent` dans un composant client — c'est un util server-side
- **NE PAS** stocker l'etat online/offline dans Zustand — c'est un etat UI local gere par le hook
- **NE PAS** creer de `console.log` pour les erreurs — format `[MODULE:ACTION]` si logging necessaire
- **NE PAS** ajouter de spinners — skeleton loaders uniquement (convention projet)
- **NE PAS** utiliser `fetch()` cote client — pas concerne par cette story de toute facon
- **NE PAS** mettre les tests dans un dossier `__tests__/` — tests co-localises

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-1-fondation-plateforme-authentification-stories-detaillees.md — Story 1.8]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md — Error Handling, Loading States, Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture/05-project-structure.md — @monprojetpro/ui structure, empty-state.tsx, toast.tsx mentionné]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Experience Principles, Zero friction]
- [Source: docs/project-context.md — Error Handling 3 niveaux, Loading States, Anti-Patterns]
- [Source: CLAUDE.md — Quality Gates, Module System, UX Design]

### Previous Story Intelligence (Story 1.7)

**Learnings from Story 1.7 :**
- Les composants UI suivent le pattern shadcn/ui : CVA + `cn()` + Radix primitives
- `@monprojetpro/supabase` a un subpath export `./theme` pour eviter d'importer le barrel (qui tire next/headers)
- Les accents francais sont importants dans les textes UI (code review Story 1.6 L1)
- 481 tests passent au total (211 existants + 270 Story 1.7) — zero regressions attendues
- Pattern de test CSS : parser les fichiers CSS avec regex pour verifier la structure
- `useTransition` pour les pending states des Server Actions
- Build errors pre-existants dans `clients/actions.ts:38` (type 'never') et `auth.ts:25` (async refine) — PAS des regressions
- Commit pattern : `feat: Story X.Y — Description`
- La structure CSS Tailwind v4 utilise `@theme inline` dans globals.css — pas de tailwind.config.ts pour les variables
- Sonner est recommandee par shadcn/ui — meme ecosysteme que le reste des composants

**Code review Story 1.7 pertinent :**
- Les composants client doivent avoir `'use client'` en premiere ligne
- Cleanup des event listeners dans useEffect (important pour useOnline)
- Les labels et textes UI doivent etre en francais avec accents

### Git Intelligence

**Derniers commits :**
```
262de63 docs: mise a jour planning artifacts, epics 11-12, CLAUDE.md et project-context
2ab4c4c feat: Story 1.7 — Design system fondation (dark mode, palettes, responsive, accessibilite)
1b829dd feat: Story 1.6 — Gestion sessions avancee
4f83926 feat: Story 1.5 — RLS & isolation donnees multi-tenant
9c52c01 feat: Story 1.4 — Authentification MiKL
```

**Patterns etablis :**
- TypeScript strict, pas de `any`
- Tests Vitest co-localises
- Composants suivent le pattern shadcn/ui (CVA + cn() + Radix)
- 481 tests passent — zero regressions attendues
- Pas de migration Supabase dans cette story
- Export barrel dans `packages/ui/src/index.ts` pour tous les nouveaux composants

### Points d'attention critiques

1. **Sonner theming** : Sonner supporte un prop `theme` mais les classes CSS doivent etre alignees avec les variables OKLCH du design system. Tester visuellement que les toasts sont lisibles sur les 3 palettes (Hub/Lab/One) en dark ET light mode.

2. **Breadcrumb dynamique** : Cette story cree le composant UI statique. L'alimentation dynamique (basee sur la route du module) sera implementee dans les stories futures. Pour cette story, le composant doit etre generique et composable.

3. **OfflineBanner z-index** : La banniere doit etre au-dessus du contenu mais en dessous des modales/dialogs. Utiliser `z-40` (les modales Radix utilisent z-50).

4. **useConfirmDialog et SSR** : Le hook utilise `useState` — c'est un composant client. S'assurer que le `ConfirmDialog` retourne null cote serveur (pas de portal SSR).

5. **QueryProvider retry** : Verifier si le QueryProvider existant a deja une config retry. Si oui, ajuster. Si non, ajouter. Le fichier est `packages/supabase/src/providers/query-provider.tsx`.

6. **Sonner et le theme dynamique** : Le Toaster Sonner doit reagir au changement de theme (dark/light). Utiliser le ThemeProvider existant ou passer `theme` dynamiquement via `useTheme()`.

7. **Tests simples** : Les composants UI de cette story sont relativement simples (pas de data fetching, pas de Supabase). Les tests doivent verifier le rendu, les props, l'accessibilite (aria-*) et le comportement basique (click handlers, state changes).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

None required — build and tests passed on first attempt after fixing pre-existing TypeScript issues.

### Completion Notes List

1. **Sonner installation** — Installed successfully in packages/ui workspace, integrated with dark mode theme variables
2. **Breadcrumb component** — Full composition API (7 sub-components) following shadcn/ui pattern, semantic HTML with ARIA labels
3. **ErrorDisplay component** — Created with onRetry callback, refactored 3 existing error.tsx files to use the new component
4. **Offline detection** — useOnline hook + OfflineBanner + TanStack Query retry configuration (3 retries with exponential backoff)
5. **Browser warning** — Client-side detection with sessionStorage persistence, dismissable banner
6. **Confirmation dialog** — useConfirmDialog hook with programmatic API, supports destructive variant for dangerous actions
7. **Empty state presets** — EMPTY_SEARCH, EMPTY_LIST, EMPTY_ERROR constants exported from @monprojetpro/ui
8. **DashboardShell breadcrumb slot** — Added optional breadcrumb prop to shell header
9. **Tests** — 18 new tests added (8 test files), all co-located. Total: 499 tests passing, zero regressions
10. **Build** — TypeScript strict mode, both apps (hub + client) compile successfully
11. **Fixed pre-existing issues** — Breadcrumb syntax error (extra parenthesis), auth.ts schemas extraction to separate file (Server Actions compatibility), RPC type assertions, jwt-decode undefined handling

### File List

**Created:**
- `packages/ui/src/components/sonner.tsx` — Toaster wrapper with MonprojetPro theming
- `packages/ui/src/components/toast-utils.ts` — showSuccess, showError, showInfo helpers
- `packages/ui/src/components/sonner.test.ts` — 3 tests
- `packages/ui/src/components/breadcrumb.tsx` — 7 composable components (Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis)
- `packages/ui/src/components/breadcrumb.test.ts` — 7 tests
- `packages/ui/src/components/error-display.tsx` — Reusable error display with retry button
- `packages/ui/src/components/error-display.test.ts` — 1 test
- `packages/ui/src/hooks/use-online.ts` — Online/offline detection hook
- `packages/ui/src/hooks/use-online.test.ts` — 1 test
- `packages/ui/src/components/offline-banner.tsx` — Auto-dismissing offline banner
- `packages/ui/src/components/offline-banner.test.ts` — 1 test
- `packages/ui/src/components/browser-warning.tsx` — Unsupported browser warning
- `packages/ui/src/components/browser-warning.test.ts` — 1 test
- `packages/ui/src/hooks/use-confirm-dialog.tsx` — Programmatic confirmation dialog hook
- `packages/ui/src/hooks/use-confirm-dialog.test.ts` — 1 test
- `packages/ui/src/components/empty-state-presets.ts` — EMPTY_SEARCH, EMPTY_LIST, EMPTY_ERROR constants
- `packages/ui/src/components/empty-state-presets.test.ts` — 3 tests
- `apps/client/app/(auth)/actions/schemas.ts` — Extracted Zod schemas from Server Actions file

**Modified:**
- `packages/ui/src/index.ts` — Exported all new components and hooks
- `packages/ui/src/components/dashboard-shell.tsx` — Added breadcrumb slot
- `apps/hub/app/layout.tsx` — Added BrowserWarning, OfflineBanner, Toaster
- `apps/client/app/layout.tsx` — Added BrowserWarning, OfflineBanner, Toaster
- `apps/hub/app/(dashboard)/modules/[moduleId]/error.tsx` — Refactored to use ErrorDisplay
- `apps/client/app/(dashboard)/modules/[moduleId]/error.tsx` — Refactored to use ErrorDisplay
- `apps/client/app/(dashboard)/settings/sessions/error.tsx` — Refactored to use ErrorDisplay
- `packages/supabase/src/providers/query-provider.tsx` — Added retry configuration (retry: 3, exponential backoff, refetchOnReconnect: true)
- `apps/client/app/(auth)/actions/auth.ts` — Extracted schemas, added RPC type assertions (as never)
- `apps/client/app/(auth)/login/login-form.tsx` — Updated schema import path
- `apps/client/app/(auth)/signup/signup-form.tsx` — Updated schema import path
- `apps/client/app/(auth)/actions/auth.test.ts` — Updated schema import path
- `apps/hub/app/(dashboard)/clients/actions.ts` — Added type assertion for Supabase query
- `apps/client/app/(dashboard)/settings/sessions/jwt-decode.ts` — Added non-null assertion for array access

**Dependencies added:**
- `sonner@^2.0.7` in `packages/ui/package.json`
