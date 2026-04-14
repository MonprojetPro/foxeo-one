# Story 7.2 : Vue détaillée d'une demande avec contexte complet

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **MiKL (opérateur)**,
I want **consulter le contexte complet d'une demande de validation (besoin, historique client, priorité, documents joints)**,
So that **je peux prendre une décision éclairée sans avoir à chercher les informations ailleurs**.

## Acceptance Criteria

### AC 1 : Route et page de détail créées

**Given** MiKL clique sur une demande dans la file d'attente (Story 7.1)
**When** la page de détail s'affiche
**Then** la route `/modules/validation-hub/[requestId]` est accessible
**And** le composant `request-detail.tsx` est chargé
**And** les données de la demande sont récupérées via le hook `use-validation-request(requestId)`

### AC 2 : Section 1 — En-tête de la demande

**Given** la page de détail est affichée (FR9)
**When** MiKL consulte l'en-tête
**Then** les éléments suivants sont visibles :
- Titre de la demande
- Badge type (Brief Lab / Evolution One) avec couleurs appropriées
- Badge statut actuel (pending, approved, rejected, needs_clarification)
- Date de soumission (format complet : "15 février 2026 à 14h30")
- Bouton retour "← File d'attente" qui redirige vers `/modules/validation-hub`

**And** l'en-tête utilise un composant Card avec le design system Hub

### AC 3 : Section 2 — Informations client

**Given** la page de détail est affichée
**When** MiKL consulte les informations client
**Then** les éléments suivants sont visibles :
- Avatar du client (avec fallback initiales)
- Nom complet du client
- Entreprise du client (si disponible)
- Type de client (Complet, Direct One, Ponctuel) avec badge
- Lien "Voir la fiche client" qui ouvre `/modules/crm/clients/[clientId]`

**And** si `type='brief_lab'` ET `parcours_id` non null :
- Nom de l'étape du parcours Lab associée
- Numéro de l'étape dans le parcours
- Progression du parcours (barre de progression)

**And** les données client sont jointes depuis la table `clients` via Supabase

### AC 4 : Section 3 — Contenu de la demande

**Given** la page de détail est affichée
**When** MiKL consulte le contenu
**Then** les éléments suivants sont visibles :
- Le besoin exprimé (champ `content` de `validation_requests`) affiché en markdown
- Liste des documents joints (récupérés via `document_ids`)
- Pour chaque document : nom, taille, type, icône, lien de téléchargement
- Si Élio a pré-qualifié : contexte collecté (questions/réponses, priorité estimée)

**And** les documents sont cliquables et ouvrent le viewer du module documents (Epic 4)
**And** le contenu est affiché dans un composant Card

### AC 5 : Section 4 — Historique pertinent

**Given** la page de détail est affichée
**When** MiKL consulte l'historique
**Then** les éléments suivants sont visibles :

**Sous-section "Dernières demandes du client" :**
- 3 dernières demandes du même client (excluant la demande actuelle)
- Pour chaque demande : titre, type, statut, date
- Lien "Voir toutes les demandes de ce client"

**Sous-section "Derniers messages chat" :**
- 3 derniers messages échangés avec ce client (module chat, Epic 3)
- Pour chaque message : auteur (MiKL/Client), extrait (50 premiers caractères), date
- Lien "Ouvrir le chat complet"

**Sous-section "Progression parcours" (si brief Lab) :**
- Barre de progression du parcours (% d'étapes complétées)
- Étape actuelle + nom
- Nombre total d'étapes du parcours

**And** ces données sont récupérées via des requêtes Supabase avec TanStack Query

### AC 6 : Section historique des échanges (statut needs_clarification)

**Given** la demande a un historique d'échanges (statut='needs_clarification' avec des allers-retours)
**When** MiKL consulte le détail
**Then** une section "Échanges" affiche la chronologie des actions :
- "[date] MiKL a demandé des précisions : {commentaire}"
- "[date] Le client a re-soumis avec : {nouveau contenu}"

**And** les échanges sont affichés en ordre chronologique (du plus ancien au plus récent)
**And** chaque échange affiche : date, acteur (MiKL/Client), action, commentaire

### AC 7 : Boutons d'action visibles

**Given** le contexte est chargé
**When** MiKL a lu le détail
**Then** les boutons d'action sont visibles en bas de page (zone fixe sticky) :
- "Valider" (vert) — Story 7.3
- "Refuser" (rouge) — Story 7.3
- "Demander des précisions" (bleu) — Story 7.4
- "Actions de traitement" (dropdown, gris) — Story 7.5

**And** les boutons sont désactivés si le statut n'est pas 'pending' ou 'needs_clarification'
**And** les boutons "Actions de traitement" restent actifs sur statut 'approved'
**And** les boutons utilisent le composant Button de @monprojetpro/ui

### AC 8 : Design responsive et performance

**Given** la page de détail est affichée
**When** MiKL consulte la page
**Then** le design est responsive :
- Colonne unique sur mobile (< 768px)
- 2 colonnes sur desktop (>= 768px) : contenu principal (70%) + historique (30%)

**And** la page se charge en moins de 2 secondes (NFR-P1)
**And** les données sont chargées via TanStack Query avec skeleton loaders
**And** le design suit le theme "Minimal Futuriste" dark mode du Hub

## Tasks / Subtasks

### Task 1 : Créer la route et la page de détail (AC: 1)
- [x] Créer `apps/hub/app/(dashboard)/modules/validation-hub/[requestId]/page.tsx`
- [x] Créer `apps/hub/app/(dashboard)/modules/validation-hub/[requestId]/loading.tsx` (skeleton)
- [x] Créer `apps/hub/app/(dashboard)/modules/validation-hub/[requestId]/error.tsx` (error boundary)
- [x] Tester la navigation depuis la file d'attente

### Task 2 : Créer le hook use-validation-request (AC: 1)
- [x] Créer `packages/modules/validation-hub/hooks/use-validation-request.ts`
- [x] Implémenter TanStack Query avec queryKey `['validation-request', requestId]`
- [x] Requête Supabase avec jointures :
  - `clients` (avatar, nom, entreprise, type)
  - `parcours` (si parcours_id non null)
  - `documents` (si document_ids non vide)
- [x] Transformation snake_case → camelCase
- [x] Configurer staleTime à 1 minute
- [x] Écrire test `use-validation-request.test.ts`

### Task 3 : Créer les types étendus (AC: 2-5)
- [x] Étendre `ValidationRequest` dans `types/validation.types.ts` avec :
  - `client: ClientDetail` (avatar, nom, entreprise, type)
  - `parcours?: ParcoursDetail` (nom, progression, étape actuelle)
  - `documents: DocumentSummary[]` (nom, taille, type, url)
  - `previousRequests?: ValidationRequestSummary[]` (3 dernières)
  - `recentMessages?: MessageSummary[]` (3 derniers)
- [x] Définir les types `ClientDetail`, `ParcoursDetail`, `DocumentSummary`, `MessageSummary`

### Task 4 : Créer le composant request-detail (AC: 2-8)
- [x] Créer `components/request-detail.tsx`
- [x] Implémenter Section 1 : En-tête (titre, badges, date, bouton retour)
- [x] Implémenter Section 2 : Informations client (avatar, nom, entreprise, type, lien CRM)
- [x] Implémenter Section 3 : Contenu (besoin markdown, documents joints)
- [x] Implémenter Section 4 : Historique (dernières demandes, messages, progression)
- [x] Implémenter Section Échanges (si needs_clarification)
- [x] Implémenter zone boutons d'action sticky (4 boutons)
- [x] Appliquer design responsive (1 col mobile, 2 col desktop)
- [x] Appliquer theme dark mode Hub
- [x] Écrire test `request-detail.test.tsx`

### Task 5 : Créer les composants auxiliaires (AC: 3-5)
- [x] Créer `components/request-header.tsx` (en-tête réutilisable)
- [x] Créer `components/client-info-card.tsx` (infos client réutilisable)
- [x] Créer `components/request-content.tsx` (contenu + documents)
- [x] Créer `components/request-history.tsx` (historique pertinent)
- [x] Créer `components/request-exchanges.tsx` (chronologie échanges)
- [x] Créer `components/request-actions.tsx` (boutons d'action sticky)
- [x] Écrire tests pour chaque composant

### Task 6 : Implémenter les requêtes Supabase (AC: 3-5)
- [x] Créer `actions/get-validation-request.ts` (requête complète avec jointures)
- [x] Créer `actions/get-client-previous-requests.ts` (3 dernières demandes client)
- [x] Créer `actions/get-client-recent-messages.ts` (3 derniers messages chat)
- [x] Transformer snake_case → camelCase dans toutes les actions
- [x] Écrire tests pour chaque action

### Task 7 : Intégration avec les autres modules (AC: 3-4)
- [x] Lien vers fiche client CRM : `/modules/crm/clients/[clientId]`
- [x] Lien vers documents (module documents, Epic 4)
- [x] Lien vers chat (module chat, Epic 3)
- [x] Vérifier que les liens fonctionnent correctement

### Task 8 : Tests d'intégration (AC: 8)
- [x] Test navigation file d'attente → détail
- [x] Test chargement données complètes
- [x] Test responsive (mobile/desktop)
- [x] Test performance (< 2s chargement)
- [x] Test skeleton loaders
- [x] Test error boundary

## Dev Notes

### Contexte Epic 7

Cette story est la **deuxième** de l'Epic 7. Elle crée la **vue détaillée** d'une demande de validation. Les stories suivantes ajouteront les actions (valider, refuser, demander précisions, actions de traitement, temps réel).

**Dépendance** : Cette story dépend de la Story 7.1 (structure du module + file d'attente).

### Architecture : Requêtes complexes avec jointures

Cette story nécessite des **requêtes Supabase complexes** avec plusieurs jointures :

```typescript
// Exemple de requête avec jointures multiples
const { data, error } = await supabase
  .from('validation_requests')
  .select(`
    *,
    client:clients!inner (
      id,
      name,
      company,
      client_type,
      avatar_url
    ),
    parcours:parcours (
      id,
      name,
      current_step_id,
      total_steps,
      completed_steps
    )
  `)
  .eq('id', requestId)
  .single()
```

**Transformation** : Utiliser `toCamelCase()` de `@monprojetpro/utils` pour transformer les données DB → API.

### Références architecture importantes

#### Pattern Server Component + Client Component

**Source** : `architecture/04-implementation-patterns.md`

La page `[requestId]/page.tsx` DOIT être un **Server Component** qui :
1. Récupère `requestId` depuis les params
2. Passe `requestId` au Client Component `<RequestDetail requestId={requestId} />`
3. Le Client Component utilise TanStack Query pour charger les données

**Pourquoi ?** : App Router Next.js 16 — Server Components par défaut, Client Components pour interactivité.

#### Pattern Data Fetching : TanStack Query avec jointures

```typescript
export function useValidationRequest(requestId: string) {
  return useQuery({
    queryKey: ['validation-request', requestId],
    queryFn: async () => {
      const response = await getValidationRequest(requestId)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    staleTime: 1000 * 60, // 1 minute
    enabled: !!requestId,
  })
}
```

#### Pattern Markdown Rendering

Pour afficher le champ `content` en markdown, utiliser un renderer React Markdown :

```typescript
import ReactMarkdown from 'react-markdown'

<ReactMarkdown className="prose prose-invert">
  {request.content}
</ReactMarkdown>
```

**Installer** : `npm install react-markdown` dans le workspace.

#### Pattern Responsive Layout

```typescript
// Layout responsive avec Tailwind
<div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
  <div className="space-y-6">
    {/* Contenu principal (sections 1-3) */}
  </div>
  <div className="space-y-6">
    {/* Historique pertinent (section 4) */}
  </div>
</div>
```

### Exemples de code du module CRM (Story 2.3)

La Story 2.3 du CRM (fiche client complète) suit un pattern similaire avec vue détaillée + onglets. Voici des références :

#### Hook use-client.ts (pattern détail avec jointures)

```typescript
export function useClient(clientId: string) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const response = await getClient(clientId)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    staleTime: 1000 * 60,
    enabled: !!clientId,
  })
}
```

#### Composant client-header.tsx (pattern en-tête)

```typescript
export function ClientHeader({ client }: { client: Client }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={client.avatarUrl} />
          <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.company && <p className="text-muted-foreground">{client.company}</p>}
        </div>
        <Badge variant={getClientTypeVariant(client.clientType)}>
          {getClientTypeLabel(client.clientType)}
        </Badge>
      </CardHeader>
    </Card>
  )
}
```

**Inspiration** : Créer `request-header.tsx` en suivant ce pattern.

### Technical Requirements

#### Stack & Versions (identique Story 7.1)

| Package | Version | Usage |
|---------|---------|-------|
| Next.js | 16.1.1 | App Router, Server Components |
| React | 19.2.3 | UI Components |
| @tanstack/react-query | ^5.90.x | Data fetching & cache |
| @supabase/supabase-js | ^2.95.x | Database client |
| react-markdown | Latest | Markdown rendering |
| @monprojetpro/ui | Internal | Design system |
| @monprojetpro/utils | Internal | Helpers (toCamelCase, formatRelativeDate) |

#### Composants UI disponibles (@monprojetpro/ui)

- `Card`, `CardHeader`, `CardContent`, `CardFooter` : Cartes avec sections
- `Avatar`, `AvatarImage`, `AvatarFallback` : Avatar avec fallback initiales
- `Badge` : Badges avec variants
- `Button` : Boutons avec variants
- `Separator` : Séparateur horizontal
- `Skeleton` : Skeleton loader
- `ScrollArea` : Zone scrollable

#### Helpers disponibles (@monprojetpro/utils)

- `formatRelativeDate(isoDate)` : "il y a 2h", "hier"
- `formatFullDate(isoDate)` : "15 février 2026 à 14h30"
- `getInitials(name)` : Initiales pour avatar fallback
- `toCamelCase(obj)` : Transformation snake_case → camelCase
- `truncate(text, length)` : Tronquer texte avec ellipsis

### Architecture Compliance

#### Pattern Route Params (OBLIGATOIRE)

**Source** : Next.js 16 App Router

```typescript
// apps/hub/app/(dashboard)/modules/validation-hub/[requestId]/page.tsx
export default async function ValidationRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params

  return <RequestDetailWrapper requestId={requestId} />
}

// Client Component
'use client'
function RequestDetailWrapper({ requestId }: { requestId: string }) {
  const { data, isPending, error } = useValidationRequest(requestId)

  if (isPending) return <RequestDetailSkeleton />
  if (error) return <ErrorDisplay error={error} />
  if (!data) return <NotFound />

  return <RequestDetail request={data} />
}
```

#### Pattern Jointures Supabase (OBLIGATOIRE)

**Source** : Supabase PostgREST

```typescript
// Jointure 1-to-1 (client)
.select('*, client:clients!inner(id, name, company, client_type, avatar_url)')

// Jointure 1-to-1 nullable (parcours)
.select('*, parcours:parcours(id, name, current_step_id)')

// Jointure 1-to-many (documents via array)
// Requête séparée avec IN filter
.from('documents')
.select('*')
.in('id', documentIds)
```

#### Pattern Loading States (OBLIGATOIRE)

**Chaque route DOIT avoir un `loading.tsx`** :

```typescript
// apps/hub/app/(dashboard)/modules/validation-hub/[requestId]/loading.tsx
import { Skeleton } from '@monprojetpro/ui'

export default function RequestDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" /> {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" /> {/* Client info */}
          <Skeleton className="h-96 w-full" /> {/* Content */}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" /> {/* History */}
        </div>
      </div>
    </div>
  )
}
```

### Library/Framework Requirements

#### React Markdown

**Installation** : `npm install react-markdown` dans le workspace racine.

**Usage** :

```typescript
import ReactMarkdown from 'react-markdown'

<ReactMarkdown
  className="prose prose-invert max-w-none"
  components={{
    // Customiser les composants si nécessaire
    p: ({ children }) => <p className="mb-4">{children}</p>,
    h1: ({ children }) => <h1 className="text-2xl font-bold mb-2">{children}</h1>,
  }}
>
  {request.content}
</ReactMarkdown>
```

#### Lucide Icons

Icons pertinents pour cette story :
- `ArrowLeft` : bouton retour
- `User` : avatar client
- `Building` : entreprise
- `Calendar` : date
- `FileText` : document
- `MessageSquare` : message
- `BarChart` : progression

### File Structure Requirements

#### Module validation-hub (ajout Story 7.2)

```
packages/modules/validation-hub/
├── components/
│   ├── validation-queue.tsx         # Story 7.1
│   ├── request-detail.tsx           # Story 7.2 ← NOUVEAU
│   ├── request-header.tsx           # Story 7.2 ← NOUVEAU
│   ├── client-info-card.tsx         # Story 7.2 ← NOUVEAU
│   ├── request-content.tsx          # Story 7.2 ← NOUVEAU
│   ├── request-history.tsx          # Story 7.2 ← NOUVEAU
│   ├── request-exchanges.tsx        # Story 7.2 ← NOUVEAU
│   └── request-actions.tsx          # Story 7.2 ← NOUVEAU
├── hooks/
│   ├── use-validation-queue.ts      # Story 7.1
│   ├── use-validation-request.ts    # Story 7.2 ← NOUVEAU
│   └── use-client-history.ts        # Story 7.2 ← NOUVEAU (optional)
├── actions/
│   ├── get-validation-request.ts    # Story 7.2 ← NOUVEAU
│   ├── get-client-previous-requests.ts  # Story 7.2 ← NOUVEAU
│   └── get-client-recent-messages.ts    # Story 7.2 ← NOUVEAU
```

#### Routes Hub (ajout Story 7.2)

```
apps/hub/app/(dashboard)/modules/validation-hub/
├── page.tsx                         # Story 7.1
├── loading.tsx                      # Story 7.1
├── error.tsx                        # Story 7.1
└── [requestId]/                     # Story 7.2 ← NOUVEAU
    ├── page.tsx                     # Story 7.2 ← NOUVEAU
    ├── loading.tsx                  # Story 7.2 ← NOUVEAU
    └── error.tsx                    # Story 7.2 ← NOUVEAU
```

### Testing Requirements

#### Tests à écrire (co-localisés)

| Fichier | Test à écrire | Type |
|---------|---------------|------|
| `use-validation-request.ts` | `use-validation-request.test.ts` | Hook test |
| `request-detail.tsx` | `request-detail.test.tsx` | Component test |
| `request-header.tsx` | `request-header.test.tsx` | Component test |
| `client-info-card.tsx` | `client-info-card.test.tsx` | Component test |
| `get-validation-request.ts` | `get-validation-request.test.ts` | Action test |

#### Scénarios de test importants

1. **Test chargement complet** : Vérifier que toutes les sections sont affichées
2. **Test jointures** : Vérifier que client + parcours + documents sont correctement joints
3. **Test responsive** : Vérifier layout mobile vs desktop
4. **Test markdown rendering** : Vérifier que le contenu markdown est bien rendu
5. **Test liens inter-modules** : Vérifier navigation vers CRM, documents, chat
6. **Test historique échanges** : Vérifier affichage chronologie si needs_clarification

### Project Structure Notes

#### Alignement avec la structure unifiée

Cette story respecte l'architecture définie dans `architecture/05-project-structure.md` :
- Routes dynamiques Next.js 16 App Router
- Server Component → Client Component pattern
- TanStack Query pour cache client
- Tests co-localisés
- Skeleton loaders obligatoires

#### Communication inter-modules

Cette story interagit avec :
- **CRM** : Lien vers fiche client (`/modules/crm/clients/[clientId]`)
- **Documents** : Affichage documents joints (Epic 4)
- **Chat** : Affichage derniers messages (Epic 3)

**Pas d'import direct** — utiliser les liens de navigation uniquement.

### References

- [Epic 7 : Validation Hub](_bmad-output/planning-artifacts/epics/epic-7-validation-hub-stories-detaillees.md#story-72)
- [Story 7.1 : Structure du module](7-1-module-validation-hub-structure-types-file-attente-des-demandes.md)
- [Architecture Platform](../planning-artifacts/architecture/02-platform-architecture.md)
- [Implementation Patterns](../planning-artifacts/architecture/04-implementation-patterns.md)
- [Next.js 16 App Router](https://nextjs.org/docs/app)
- [Supabase PostgREST Joins](https://supabase.com/docs/guides/api/joins-and-nested-tables)
- [Module CRM Story 2.3 (exemple)](../../packages/modules/crm/)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (implementation) + Claude Sonnet 4 (code review)

### Debug Log References

- Fixed `require()` → `await import()` for ESM compatibility in hook tests
- Fixed TanStack Query v5 `isPending` behavior when query `enabled: false`
- Fixed `next/link` mock to forward all props for `aria-label` testing
- Adapted parcours query to use `parcours_steps` table instead of non-existent columns

### Completion Notes List

- Migration 00044 created for `validation_requests` table (was missing from Story 7.1)
- Added `avatar_url` column to `clients` table
- Installed `react-markdown` in validation-hub workspace
- Added `formatFullDate`, `getInitials`, `truncate` to `@monprojetpro/utils`
- Code Review fixes: extracted shared STATUS_CONFIG to `utils/status-config.ts` (DRY), added operator auth check to `get-client-recent-messages.ts` (security), added missing `use-client-history.test.ts` (test coverage)
- 2535 tests passing (up from 2451)

### File List

**New files:**
- `supabase/migrations/00044_create_validation_requests.sql`
- `packages/utils/src/string.ts`
- `packages/utils/src/string.test.ts`
- `packages/modules/validation-hub/utils/status-config.ts`
- `packages/modules/validation-hub/actions/get-validation-request.ts`
- `packages/modules/validation-hub/actions/get-validation-request.test.ts`
- `packages/modules/validation-hub/actions/get-client-previous-requests.ts`
- `packages/modules/validation-hub/actions/get-client-previous-requests.test.ts`
- `packages/modules/validation-hub/actions/get-client-recent-messages.ts`
- `packages/modules/validation-hub/actions/get-client-recent-messages.test.ts`
- `packages/modules/validation-hub/hooks/use-validation-request.ts`
- `packages/modules/validation-hub/hooks/use-validation-request.test.ts`
- `packages/modules/validation-hub/hooks/use-client-history.ts`
- `packages/modules/validation-hub/hooks/use-client-history.test.ts`
- `packages/modules/validation-hub/components/request-detail.tsx`
- `packages/modules/validation-hub/components/request-detail.test.tsx`
- `packages/modules/validation-hub/components/request-header.tsx`
- `packages/modules/validation-hub/components/request-header.test.tsx`
- `packages/modules/validation-hub/components/client-info-card.tsx`
- `packages/modules/validation-hub/components/client-info-card.test.tsx`
- `packages/modules/validation-hub/components/request-content.tsx`
- `packages/modules/validation-hub/components/request-content.test.tsx`
- `packages/modules/validation-hub/components/request-history.tsx`
- `packages/modules/validation-hub/components/request-history.test.tsx`
- `packages/modules/validation-hub/components/request-exchanges.tsx`
- `packages/modules/validation-hub/components/request-exchanges.test.tsx`
- `packages/modules/validation-hub/components/request-actions.tsx`
- `packages/modules/validation-hub/components/request-actions.test.tsx`
- `apps/hub/app/(dashboard)/modules/validation-hub/[requestId]/page.tsx`
- `apps/hub/app/(dashboard)/modules/validation-hub/[requestId]/loading.tsx`
- `apps/hub/app/(dashboard)/modules/validation-hub/[requestId]/error.tsx`

**Modified files:**
- `packages/utils/src/date.ts` (added `formatFullDate`)
- `packages/utils/src/date.test.ts` (added `formatFullDate` tests)
- `packages/utils/src/index.ts` (added exports)
- `packages/modules/validation-hub/types/validation.types.ts` (added detail types)
- `packages/modules/validation-hub/index.ts` (added exports)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
