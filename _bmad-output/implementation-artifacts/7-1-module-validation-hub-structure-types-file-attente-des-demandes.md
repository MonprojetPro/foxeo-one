# Story 7.1 : Module Validation Hub — Structure, types & file d'attente des demandes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **MiKL (opérateur)**,
I want **voir la liste des demandes en attente de validation avec des filtres et une vue claire des priorités**,
So that **je peux traiter efficacement les soumissions de mes clients sans en oublier**.

## Acceptance Criteria

### AC 1 : Structure du module créée

**Given** le module Validation Hub n'existe pas encore
**When** le module est créé
**Then** la structure suivante est en place :

```
packages/modules/validation-hub/
  index.ts                    # Export public du module
  manifest.ts                 # { id: 'validation-hub', name: 'Validation Hub', targets: ['hub'], dependencies: ['crm', 'notifications'] }
  components/
    validation-queue.tsx      # File d'attente des demandes
  hooks/
    use-validation-queue.ts   # Hook TanStack Query
  actions/
    (vide pour l'instant)
  types/
    validation.types.ts       # Types TypeScript
  docs/                       # Documentation obligatoire (CI-checked)
    guide.md                  # Guide utilisateur
    faq.md                    # FAQ
    flows.md                  # Flux utilisateur
```

**And** le manifest est enregistré dans le module registry (DB + registre local)
**And** le module est accessible depuis la navigation sidebar du Hub

### AC 2 : Types TypeScript définis

**Given** les types du Validation Hub
**When** validation.types.ts est créé
**Then** les types suivants sont définis :

```typescript
type ValidationRequestType = 'brief_lab' | 'evolution_one'
type ValidationRequestStatus = 'pending' | 'approved' | 'rejected' | 'needs_clarification'

type ValidationRequest = {
  id: string
  clientId: string
  operatorId: string
  parcoursId: string | null
  stepId: string | null
  type: ValidationRequestType
  title: string
  content: string
  documentIds: string[]
  status: ValidationRequestStatus
  reviewerComment: string | null
  submittedAt: string
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  // Relations jointes
  client?: ClientSummary
}

type ClientSummary = {
  id: string
  name: string
  company: string | null
  clientType: string
  avatarUrl: string | null
}

type ValidationQueueFilters = {
  status: ValidationRequestStatus | 'all'
  type: ValidationRequestType | 'all'
  sortBy: 'submitted_at' | 'client_name'
  sortOrder: 'asc' | 'desc'
}
```

**And** les types sont exportés depuis le module local

### AC 3 : Hook use-validation-queue créé

**Given** le hook use-validation-queue est créé
**When** il est utilisé dans un composant
**Then** il expose :
- `requests`: liste des ValidationRequest avec les données client jointes
- `filters` / `setFilters`: gestion des filtres actifs
- `isLoading`, `error`: états de chargement
- `pendingCount`: nombre de demandes en attente (pour badge navigation)

**And** la requête Supabase joint `validation_requests` avec `clients` (select client: clients(id, name, company, client_type, avatar_url))
**And** le hook utilise TanStack Query avec une queryKey `['validation-requests', filters]`
**And** le staleTime est configuré à 30 secondes (les demandes peuvent arriver à tout moment)

### AC 4 : Composant validation-queue affiché

**Given** MiKL accède au module Validation Hub (FR8)
**When** la page se charge
**Then** le composant `validation-queue.tsx` affiche :
- Un header "Validation Hub" avec le compteur de demandes en attente
- Des filtres : statut (Tous, En attente, Approuvé, Refusé, Précisions demandées), type (Tous, Brief Lab, Évolution One)
- La liste des demandes sous forme de cartes avec pour chaque demande :
  - Avatar + nom du client + entreprise
  - Type de demande (badge coloré : "Brief Lab" en terracotta, "Évolution One" en orange)
  - Titre de la demande
  - Date de soumission (format relatif : "il y a 2h", "hier")
  - Statut actuel (badge : pending=jaune, approved=vert, rejected=rouge, needs_clarification=bleu)

**And** les demandes sont triées par défaut : en attente en premier, puis par date de soumission (les plus anciennes en haut)
**And** la page se charge en moins de 2 secondes (NFR-P1)
**And** le design suit le theme "Minimal Futuriste" dark mode du Hub

### AC 5 : État vide géré

**Given** il n'y a aucune demande en attente
**When** MiKL ouvre le Validation Hub
**Then** un état vide s'affiche avec un message "Aucune demande en attente — tout est à jour !" et une icône appropriée

### AC 6 : Navigation vers le détail

**Given** MiKL clique sur une demande dans la file
**When** la navigation s'effectue
**Then** il est redirigé vers la page de détail de la demande (route : `/modules/validation-hub/[requestId]`)
**And** la transition est fluide (< 500ms, NFR-P2)

## Tasks / Subtasks

### Task 1 : Créer la structure du module (AC: 1)
- [x] Créer le dossier `packages/modules/validation-hub/`
- [x] Créer `manifest.ts` avec l'id 'validation-hub', targets ['hub'], dependencies ['crm', 'notifications']
- [x] Créer `index.ts` (barrel export)
- [x] Créer `docs/guide.md`, `docs/faq.md`, `docs/flows.md` (obligatoire CI)
- [x] Vérifier que le module apparaît dans la sidebar du Hub

### Task 2 : Définir les types TypeScript (AC: 2)
- [x] Créer `types/validation.types.ts`
- [x] Définir `ValidationRequestType`, `ValidationRequestStatus`
- [x] Définir `ValidationRequest`, `ClientSummary`
- [x] Définir `ValidationQueueFilters`
- [x] Exporter tous les types depuis `index.ts`

### Task 3 : Créer le hook use-validation-queue (AC: 3)
- [x] Créer `hooks/use-validation-queue.ts`
- [x] Implémenter TanStack Query avec queryKey `['validation-requests', filters]`
- [x] Requête Supabase avec jointure `clients`
- [x] Transformation snake_case → camelCase
- [x] Calculer `pendingCount` (nombre de demandes status='pending')
- [x] Configurer staleTime à 30 secondes
- [x] Gérer les filtres avec useState local
- [x] Écrire test `use-validation-queue.test.ts`

### Task 4 : Créer le composant validation-queue (AC: 4, 5)
- [x] Créer `components/validation-queue.tsx`
- [x] Afficher header avec compteur de demandes en attente
- [x] Créer les filtres (statut, type, tri)
- [x] Afficher la liste de cartes avec :
  - Avatar + nom + entreprise (depuis ClientSummary)
  - Badge type (terracotta pour Brief Lab, orange pour Évolution One)
  - Titre de la demande
  - Date de soumission (formatRelativeDate)
  - Badge statut (pending=jaune, approved=vert, rejected=rouge, needs_clarification=bleu)
- [x] Implémenter l'état vide avec message et icône
- [x] Gérer le tri par défaut (pending en premier, puis par date soumission)
- [x] Appliquer le theme dark mode Hub
- [x] Écrire test `validation-queue.test.tsx`

### Task 5 : Implémenter la navigation vers le détail (AC: 6)
- [x] Ajouter `onClick` sur chaque carte de demande
- [x] Rediriger vers `/modules/validation-hub/[requestId]`
- [x] Vérifier transition fluide (< 500ms)
- [x] Tester la navigation

### Task 6 : Documentation du module
- [x] Rédiger `docs/guide.md` (guide utilisateur)
- [x] Rédiger `docs/faq.md` (questions fréquentes)
- [x] Rédiger `docs/flows.md` (diagrammes de flux)
- [x] Vérifier que CI passe (présence docs obligatoire)

## Dev Notes

### Contexte Epic 7

Cette story est la première de l'Epic 7 : Validation Hub. Elle crée la **structure fondamentale** du module qui sera enrichie dans les stories suivantes :
- **Story 7.2** : Vue détaillée d'une demande
- **Story 7.3** : Validation & refus avec commentaire
- **Story 7.4** : Demande de précisions
- **Story 7.5** : Actions de traitement (workflows post-décision)
- **Story 7.6** : Temps réel & abonnement Realtime

### Architecture : Table validation_requests déjà créée

**IMPORTANT** : La table `validation_requests` et ses policies RLS ont été créées dans la **Story 6.3** (Epic 6 — Parcours Lab) dans la migration `00010_validation_requests.sql`.

La table existe déjà avec la structure suivante :

```sql
CREATE TABLE validation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  operator_id UUID NOT NULL REFERENCES operators(id),
  parcours_id UUID REFERENCES parcours(id),
  step_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('brief_lab', 'evolution_one')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  document_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'needs_clarification')),
  reviewer_comment TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Vous n'avez PAS besoin de créer cette table** — elle existe déjà. Utilisez-la directement.

### Dépendances sur d'autres modules

Le module Validation Hub dépend de :
- **CRM (modules/crm/)** : pour les données client (ClientSummary)
- **Notifications (modules/notifications/)** : pour les notifications (Stories 7.3-7.6)

Ces dépendances sont déclarées dans le `manifest.ts`.

**Communication inter-modules** : Pas d'import direct entre modules. Utiliser Supabase pour récupérer les données client (jointure dans la requête).

### Références architecture importantes

#### Pattern Data Fetching : TanStack Query

**Source** : `architecture/04-implementation-patterns.md` — section "Data Boundaries"

```typescript
// ✅ BON — TanStack Query gère le loading
function ClientList() {
  const { data, isPending, error } = useQuery({
    queryKey: ['clients', operatorId],
    queryFn: () => getClients(operatorId),
  })

  if (isPending) return <ClientListSkeleton />
  if (error) return <ErrorDisplay error={error} />
  return <ClientTable clients={data} />
}
```

**Règles absolues** :
- **Données serveur** → TanStack Query (cache + revalidation)
- **État UI** → Zustand (sidebar, préférences)
- **Données temps réel** → Supabase Realtime → invalidation TanStack Query
- **Formulaires** → React Hook Form + Zod

#### Pattern Response Format : `{ data, error }`

**Source** : `architecture/04-implementation-patterns.md` — section "Format Patterns"

```typescript
type ActionResponse<T> = {
  data: T | null
  error: ActionError | null
}

type ActionError = {
  message: string        // Message user-facing (traduit)
  code: string           // Code machine : 'VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED', etc.
  details?: unknown      // Détails techniques (dev only, jamais exposé en prod)
}
```

**JAMAIS de `throw`** dans les Server Actions. Toujours un retour typé `{ data, error }`.

#### Pattern Naming : Transformation DB ↔ API

**Source** : `architecture/04-implementation-patterns.md` — section "Naming Patterns"

- **DB (snake_case)** : `validation_requests`, `client_id`, `submitted_at`
- **API/TypeScript (camelCase)** : `validationRequests`, `clientId`, `submittedAt`

**Helper** : Utiliser `toCamelCase()` et `toSnakeCase()` depuis `@monprojetpro/utils` pour transformer à la frontière DB/API.

#### Pattern Module Structure

**Source** : `architecture/04-implementation-patterns.md` — section "Structure Patterns"

Chaque module DOIT respecter cette structure :

```
packages/modules/[nom]/
├── index.ts                  # Barrel export : manifest + composants publics
├── manifest.ts               # ModuleManifest du module
├── docs/                     # Documentation livrable (OBLIGATOIRE — vérifié en CI)
│   ├── guide.md              # Guide utilisateur pas-à-pas
│   ├── faq.md                # Questions fréquentes
│   └── flows.md              # Diagrammes de flux / parcours utilisateur
├── components/               # Composants React du module
├── hooks/                    # Hooks spécifiques au module
├── actions/                  # Server Actions du module
├── types/                    # Types spécifiques au module
└── utils/                    # Utilitaires internes au module
```

**Tests co-localisés** : `*.test.ts` à côté du fichier source, jamais dans un dossier `__tests__/` séparé.

#### Pattern Loading States

**Source** : `architecture/04-implementation-patterns.md` — section "Process Patterns"

**Convention : Skeleton loaders partout, spinners nulle part.**

Chaque module DOIT avoir un `loading.tsx` dans la route correspondante :
- `apps/hub/app/(dashboard)/modules/validation-hub/loading.tsx`

Utiliser les composants skeleton de `@monprojetpro/ui` :
- `ModuleSkeleton` : skeleton générique module
- `ShellSkeleton` : skeleton shell complet

### Exemples de code du module CRM (Story 2.1-2.2)

Le module CRM a été implémenté récemment (commit e9370eb) et suit exactement les patterns attendus. Voici des exemples à suivre :

#### Hook use-clients.ts (pattern TanStack Query)

```typescript
'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ActionResponse } from '@monprojetpro/types'
import type { ClientListItem } from '../types/crm.types'
import { getClients } from '../actions/get-clients'

export function useClients(
  initialData?: ClientListItem[]
): UseQueryResult<ClientListItem[], Error> {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response: ActionResponse<ClientListItem[]> = await getClients()

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data ?? []
    },
    initialData,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  })
}
```

**Inspiration** : Créer `use-validation-queue.ts` en suivant ce pattern exact.

#### Composant client-list.tsx (pattern DataTable)

```typescript
'use client'

import { DataTable, type ColumnDef } from '@monprojetpro/ui'
import { Badge } from '@monprojetpro/ui'
import type { ClientListItem, ClientType, ClientStatus } from '../types/crm.types'

// Type badge variants and labels
const clientTypeConfig: Record<ClientType, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  'complet': { label: 'Complet', variant: 'default' },
  'direct-one': { label: 'Direct One', variant: 'secondary' },
  'ponctuel': { label: 'Ponctuel', variant: 'outline' }
}

export function ClientList({ clients, onRowClick, showCreateButton = true }: ClientListProps) {
  const columns: ColumnDef<ClientListItem>[] = [
    {
      id: 'name',
      header: 'Nom',
      accessorKey: 'name',
      sortable: true,
    },
    // ... autres colonnes
  ]

  return (
    <div className="space-y-4">
      <DataTable
        data={clients}
        columns={columns}
        emptyMessage="Aucun client trouvé"
        onRowClick={onRowClick}
        pageSize={20}
        className="data-density-compact"
      />
    </div>
  )
}
```

**Inspiration** : Créer `validation-queue.tsx` en suivant ce pattern. Utiliser le composant `DataTable` ou des cartes personnalisées selon le design attendu.

#### Manifest CRM (pattern ModuleManifest)

```typescript
import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'crm',
  name: 'CRM',
  description: 'Gestion de la relation client — liste, filtres, recherche et fiches clients',
  version: '1.0.0',
  targets: ['hub'],
  navigation: {
    label: 'CRM',
    icon: 'users',
    position: 10
  },
  routes: [
    {
      path: '/modules/crm',
      component: 'ClientList'
    },
    {
      path: '/modules/crm/clients/:clientId',
      component: 'ClientDetail'
    }
  ],
  requiredTables: ['clients', 'client_configs'],
  dependencies: []
}
```

**Inspiration** : Créer `manifest.ts` pour validation-hub en suivant ce format exact.

### Technical Requirements

#### Stack & Versions

| Package | Version | Usage |
|---------|---------|-------|
| Next.js | 16.1.1 | App Router, Server Components |
| React | 19.2.3 | UI Components |
| TypeScript | strict mode | Type safety |
| @tanstack/react-query | ^5.90.x | Data fetching & cache |
| @supabase/supabase-js | ^2.95.x | Database client |
| @monprojetpro/ui | Internal package | Design system (shadcn + Radix) |
| @monprojetpro/utils | Internal package | Helpers (toCamelCase, formatRelativeDate) |
| @monprojetpro/types | Internal package | Types partagés (ActionResponse, ModuleManifest) |
| Tailwind CSS | 4.x | Styling |
| Zod | Latest | Schema validation |
| React Hook Form | ^7.71.x | Form management |

#### Composants UI disponibles (@monprojetpro/ui)

- `DataTable` : Table de données avec tri, pagination, filtres
- `Badge` : Badge avec variants (default, secondary, outline, destructive)
- `Card` : Carte avec header, content, footer
- `Button` : Bouton avec variants
- `Select` : Select avec Radix
- `Avatar` : Avatar avec fallback initiales
- `Skeleton` : Skeleton loader
- `EmptyState` : État vide avec icône + message

#### Helpers disponibles (@monprojetpro/utils)

- `toCamelCase(obj)` : Transforme snake_case → camelCase
- `toSnakeCase(obj)` : Transforme camelCase → snake_case
- `formatRelativeDate(isoDate)` : Format date relatif ("il y a 2h", "hier")
- `cn(...)` : Classnames utilitaire

### Architecture Compliance

#### Pattern Data Fetching (OBLIGATOIRE)

**3 patterns SEULEMENT — pas d'exceptions** :

| Pattern | Usage | Exemple |
|---------|-------|---------|
| **Server Component** | Lecture données | RSC avec `@monprojetpro/supabase` server client |
| **Server Action** | Mutations | `'use server'` fonctions dans `actions/` |
| **API Route** | Webhooks externes uniquement | `app/api/webhooks/[service]/route.ts` |

**Pour cette story** : Utiliser Server Component pour la page + TanStack Query pour le cache client.

#### Pattern State Management (OBLIGATOIRE)

**Séparation stricte** :

| Type de donnée | Tool | Exemple |
|----------------|------|---------|
| **Données serveur** | TanStack Query | `useValidationQueue()` |
| **État UI uniquement** | Zustand | Sidebar collapse, préférences |
| **Formulaires** | React Hook Form | Pas de formulaire dans cette story |
| **Temps réel** | Supabase Realtime | Story 7.6 (pas cette story) |

**RÈGLE ABSOLUE** : Pas de données serveur dans Zustand. TanStack Query est la single source of truth pour les données serveur.

#### Pattern Response Format (OBLIGATOIRE)

**TOUTES les Server Actions et fonctions asynchrones DOIVENT retourner `{ data, error }`** :

```typescript
type ActionResponse<T> = {
  data: T | null
  error: ActionError | null
}
```

**JAMAIS de `throw`** dans les Server Actions.

#### Pattern Error Handling (OBLIGATOIRE)

**3 niveaux** :
1. **Error Boundary** : `error.tsx` dans chaque route module
2. **Pattern `{ data, error }`** : dans toutes les Server Actions
3. **Toast notifications** : pour les erreurs user-facing

#### Pattern RLS (OBLIGATOIRE)

**Source** : `architecture/03-core-decisions.md` — section "Security Model"

- Toutes les requêtes passent par RLS
- Filtrage par `operator_id` dans le Hub
- Fonctions SQL : `is_admin()`, `is_owner()`, `is_operator()`

**Pour cette story** : Les policies RLS existent déjà sur `validation_requests` (créées en Story 6.3). Vérifier que les requêtes sont filtrées par `operator_id`.

### Library/Framework Requirements

#### Lucide Icons

**Source** : `packages/ui` utilise Lucide React pour les icônes.

Icons disponibles pour cette story :
- `Users` : icône CRM (référence)
- `CheckCircle2` : icône validation
- `Clock` : icône pending
- `FileText` : icône brief
- `AlertCircle` : icône needs_clarification

Utiliser l'icône appropriée dans le manifest :

```typescript
navigation: {
  label: 'Validation Hub',
  icon: 'check-circle-2',  // Nom Lucide en kebab-case
  position: 20
}
```

#### Palette de couleurs (Minimal Futuriste)

**Source** : `architecture/02-platform-architecture.md` + `ux-design-specification.md`

**Hub (dashboard MiKL)** :
- **Base** : Deep black background (#020402)
- **Accent** : Cyan/Turquoise
- **Density** : Compact (data-dense cockpit)

**Badges de statut** :
- `pending` : Jaune (warning)
- `approved` : Vert (success)
- `rejected` : Rouge (destructive)
- `needs_clarification` : Bleu (info)

**Badges de type** :
- `brief_lab` : Terracotta (#E07856)
- `evolution_one` : Orange (#F7931E)

Utiliser les variants de Badge :
- `variant="default"` : style par défaut
- `variant="secondary"` : style secondaire
- `variant="outline"` : outline
- `variant="destructive"` : rouge

### File Structure Requirements

#### Module validation-hub

```
packages/modules/validation-hub/
├── index.ts                        # Barrel export
├── manifest.ts                     # ModuleManifest
├── docs/                           # Documentation (OBLIGATOIRE CI)
│   ├── guide.md                    # Guide utilisateur
│   ├── faq.md                      # FAQ
│   └── flows.md                    # Flux utilisateur
├── components/
│   ├── validation-queue.tsx        # File d'attente (Story 7.1)
│   ├── validation-queue.test.tsx   # Test co-localisé
│   └── (stories 7.2-7.6 ajouteront d'autres composants)
├── hooks/
│   ├── use-validation-queue.ts     # Hook TanStack Query (Story 7.1)
│   └── use-validation-queue.test.ts
├── actions/
│   └── (vide pour l'instant — stories 7.3-7.5)
├── types/
│   └── validation.types.ts         # Types du module
└── utils/
    └── (si nécessaire)
```

#### Routes Hub

```
apps/hub/app/(dashboard)/modules/validation-hub/
├── page.tsx                        # Page principale (charge validation-queue)
├── loading.tsx                     # Skeleton loader (OBLIGATOIRE)
├── error.tsx                       # Error boundary
└── [requestId]/                    # Story 7.2 (détail demande)
    └── page.tsx                    # Page détail (pas cette story)
```

### Testing Requirements

#### Tests à écrire (co-localisés)

| Fichier | Test à écrire | Type |
|---------|---------------|------|
| `use-validation-queue.ts` | `use-validation-queue.test.ts` | Hook test (Vitest + React Testing Library) |
| `validation-queue.tsx` | `validation-queue.test.tsx` | Component test (Vitest + React Testing Library) |
| `validation.types.ts` | (types purs, pas de test runtime) | - |

#### Tests RLS (déjà existants)

Les policies RLS sur `validation_requests` ont été créées en Story 6.3. Les tests RLS existent déjà dans `tests/rls/`.

**Vérifier** que les tests RLS passent après implémentation :

```bash
turbo test:rls
```

#### Contract tests (obligatoire CI)

Le contract test `tests/contracts/module-manifest.test.ts` vérifie :
- Validité du manifest (format correct)
- Exports corrects depuis `index.ts`
- Types alignés

Le contract test `tests/contracts/module-docs.test.ts` vérifie :
- Présence de `docs/guide.md`, `docs/faq.md`, `docs/flows.md`

**Ces tests DOIVENT passer** pour que le CI soit vert.

### Project Structure Notes

#### Alignement avec la structure unifiée

Cette story respecte l'architecture définie dans `architecture/05-project-structure.md` :
- Module dans `packages/modules/validation-hub/`
- Routes dynamiques via module registry
- Pattern `{ data, error }` pour les actions
- TanStack Query pour les données serveur
- Tests co-localisés
- Documentation obligatoire dans `docs/`

#### Pas de conflit avec le CRM

Le Validation Hub est un module **indépendant** du CRM. Ils partagent uniquement :
- La table `clients` (jointure pour récupérer `ClientSummary`)
- Le design system (`@monprojetpro/ui`)
- Les helpers (`@monprojetpro/utils`)

Pas d'import direct entre modules. Communication via Supabase.

### References

- [Epic 7 : Validation Hub](_bmad-output/planning-artifacts/epics/epic-7-validation-hub-stories-detaillees.md)
- [Architecture Platform](../planning-artifacts/architecture/02-platform-architecture.md)
- [Implementation Patterns](../planning-artifacts/architecture/04-implementation-patterns.md)
- [Project Structure](../planning-artifacts/architecture/05-project-structure.md)
- [UX Design Specification](../planning-artifacts/ux-design-specification.md)
- [Module CRM (exemple de référence)](../../packages/modules/crm/)
- [CLAUDE.md (project instructions)](../../CLAUDE.md)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Test composant : `vi.mock` imbriqué dans `it()` hoisté → `mockPush` non défini. Fix : déclaration `const mockPush = vi.fn()` au niveau module.
- Test composant : `getByText('Brief Lab')` → plusieurs éléments (option select + badge). Fix : `getAllByText().length > 0`.

### Completion Notes List

- Module `packages/modules/validation-hub/` créé avec la structure complète (manifest, index, types, hooks, actions, components, docs).
- Server Action `get-validation-requests.ts` : jointure `validation_requests` + `clients`, filtré par `operator_id`, transformation snake_case → camelCase.
- Hook `use-validation-queue.ts` : TanStack Query, staleTime 30s, filtres locaux via useState, calcul pendingCount.
- Composant `validation-queue.tsx` : header avec badge pending count, filtres (statut/type/tri), liste de cartes avec Avatar/Badge/formatRelativeDate, état vide, gestion erreur, tri pending-first.
- Routes Hub créées : `page.tsx`, `loading.tsx`, `error.tsx`, `[requestId]/page.tsx` (stub Story 7.2).
- Module enregistré dans `apps/hub/app/(dashboard)/layout.tsx` via `registerModule(validationHubManifest)`.
- 28 nouveaux tests ajoutés (6 hook + 15 composant + 7 server action). Total : 2451 tests passing.
- **Code Review fixes** : H1 — supprimé double cast `as unknown as` dans get-validation-requests.ts ; M1 — ajouté `.limit(500)` à la requête Supabase ; M2 — ajouté test server action `get-validation-requests.test.ts` (7 tests) ; M3 — fusionné imports dupliqués `@monprojetpro/utils`.

### File List

**Créés :**
- `packages/modules/validation-hub/package.json`
- `packages/modules/validation-hub/vitest.config.ts`
- `packages/modules/validation-hub/manifest.ts`
- `packages/modules/validation-hub/index.ts`
- `packages/modules/validation-hub/types/validation.types.ts`
- `packages/modules/validation-hub/actions/get-validation-requests.ts`
- `packages/modules/validation-hub/actions/get-validation-requests.test.ts`
- `packages/modules/validation-hub/hooks/use-validation-queue.ts`
- `packages/modules/validation-hub/hooks/use-validation-queue.test.ts`
- `packages/modules/validation-hub/components/validation-queue.tsx`
- `packages/modules/validation-hub/components/validation-queue.test.tsx`
- `packages/modules/validation-hub/docs/guide.md`
- `packages/modules/validation-hub/docs/faq.md`
- `packages/modules/validation-hub/docs/flows.md`
- `apps/hub/app/(dashboard)/modules/validation-hub/page.tsx`
- `apps/hub/app/(dashboard)/modules/validation-hub/loading.tsx`
- `apps/hub/app/(dashboard)/modules/validation-hub/error.tsx`
- `apps/hub/app/(dashboard)/modules/validation-hub/[requestId]/page.tsx`

**Modifiés :**
- `apps/hub/app/(dashboard)/layout.tsx` (import + registerModule validation-hub)
- `apps/hub/package.json` (ajout @monprojetpro/modules-validation-hub, @monprojetpro/modules-notifications)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (7-1 → review)

### Change Log

- 2026-02-26 : Story 7.1 implémentée — module Validation Hub créé (structure, types, hook, composant, routes, docs). 21 tests ajoutés. Total : 2444 tests passing.
- 2026-02-26 : Code review adversarial — 6 issues (1H, 3M, 2L). Fixes appliqués : H1 double cast, M1 .limit(500), M2 server action test (7 tests), M3 duplicate imports. Total : 2451 tests passing.
