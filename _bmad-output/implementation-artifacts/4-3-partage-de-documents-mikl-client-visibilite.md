# Story 4.3: Partage de documents MiKL-client & visibilite

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **MiKL (operateur)**,
I want **partager un document avec un client et controler sa visibilite (visible ou non visible)**,
so that **je decide precisement ce que le client peut voir dans son espace documents**.

## Acceptance Criteria

1. **AC1 — Visibilite privee par defaut** : Tout document uploade par MiKL via le Hub est cree avec `visibility: 'private'` et `uploaded_by: 'operator'`. Le document n'est PAS visible par le client tant que MiKL ne le partage pas explicitement. Le badge "Non visible" s'affiche sur le document dans la vue Hub (FR64). `DocumentVisibilityBadge` existant (story 4.2) est reutilise.

2. **AC2 — Partage individuel** : MiKL clique sur "Partager avec le client" (bouton toggle dans `DocumentShareButton`). Une Server Action `shareDocument(documentId)` met a jour `visibility: 'shared'`. Une notification in-app est envoyee au client ("MiKL a partage un nouveau document avec vous") via `createNotification()`. Un toast confirme "Document partage avec le client". Le cache TanStack Query `['documents', clientId]` est invalide.

3. **AC3 — Retrait de partage avec confirmation** : MiKL clique sur "Retirer le partage". Un `AlertDialog` shadcn/ui s'affiche ("Le client ne pourra plus voir ce document. Confirmer ?"). Si confirme : Server Action `unshareDocument(documentId)` met `visibility: 'private'`. Le document disparait de la vue client (RLS). Toast "Partage retire". Si annule : aucun changement.

4. **AC4 — Partage en batch** : Des checkboxes apparaissent dans `DocumentList` quand le contexte est Hub (prop `showBatchActions`). En selectionnant >=1 document, une barre d'actions contextuelle affiche "Partager la selection (N)". Server Action `shareDocumentsBatch(documentIds[])` met a jour tous les documents selectionnes. Toast "N documents partages avec le client". Cache invalide.

5. **AC5 — Isolation client (RLS)** : Un client connecte ne voit dans sa liste que : (a) les documents avec `visibility='shared'` ET `client_id = son_id`, (b) les documents qu'il a lui-meme uploades (`uploaded_by='client'`). La RLS garantit ce filtrage au niveau DB — policy `documents_select_owner` deja definie en migration 00027.

6. **AC6 — Tests** : Tests unitaires co-localises pour toutes les nouvelles actions, hooks et composants. Coverage >80%.

## Tasks / Subtasks

- [ ] Task 1 — Types et schemas Zod pour le partage (AC: #2, #3, #4)
  - [ ] 1.1 Ajouter dans `types/document.types.ts` : `ShareDocumentInput` (documentId UUID), `UnshareDocumentInput` (documentId UUID), `ShareDocumentsBatchInput` (documentIds UUID[] min 1, clientId UUID)
  - [ ] 1.2 Tests types (schemas Zod parse/safeParse valides et invalides — 6 tests)

- [ ] Task 2 — Server Action shareDocument (AC: #2)
  - [ ] 2.1 Creer `actions/share-document.ts` — `shareDocument(documentId: string)` : verifie auth (`is_operator()` ou role operator), charge le document avec RLS, met a jour `visibility: 'shared'` + `updated_at`, appelle `createNotification()` pour le client, retourne `ActionResponse<Document>`
  - [ ] 2.2 Tests `actions/share-document.test.ts` — non authentifie (UNAUTHORIZED), non operateur (FORBIDDEN), document introuvable (NOT_FOUND), deja partage (success idempotent), succes complet + notification envoyee, erreur DB update (6 tests)

- [ ] Task 3 — Server Action unshareDocument (AC: #3)
  - [ ] 3.1 Creer `actions/unshare-document.ts` — `unshareDocument(documentId: string)` : verifie auth operator, charge le document, met a jour `visibility: 'private'` + `updated_at`, retourne `ActionResponse<Document>`
  - [ ] 3.2 Tests `actions/unshare-document.test.ts` — non authentifie, non operateur, document introuvable, deja prive (idempotent), succes, erreur DB (6 tests)

- [ ] Task 4 — Server Action shareDocumentsBatch (AC: #4)
  - [ ] 4.1 Creer `actions/share-documents-batch.ts` — `shareDocumentsBatch(input: ShareDocumentsBatchInput)` : valide input Zod, verifie auth operator, met a jour en batch (`IN` clause), retourne `ActionResponse<{ count: number; documentIds: string[] }>`
  - [ ] 4.2 Tests `actions/share-documents-batch.test.ts` — array vide (VALIDATION_ERROR), non authentifie, non operateur, succes batch, erreur DB partielle (5 tests)

- [ ] Task 5 — Hook useShareDocument (AC: #2, #3, #4)
  - [ ] 5.1 Creer `hooks/use-share-document.ts` — Export 3 mutations TanStack Query : `useShareDocument()`, `useUnshareDocument()`, `useShareDocumentsBatch()` — chacune invalide `['documents', clientId]` en `onSuccess`
  - [ ] 5.2 Tests `hooks/use-share-document.test.ts` — mutation share succes + invalidation cache, mutation unshare succes, mutation batch succes, erreur mutation (4 tests)

- [ ] Task 6 — Composant DocumentShareButton (AC: #2, #3)
  - [ ] 6.1 Creer `components/document-share-button.tsx` — Props : `document: Document`, `clientId: string`. Si `visibility === 'private'` : bouton "Partager" (icone Share + label). Si `visibility === 'shared'` : bouton "Retirer le partage" (icone ShareOff) qui ouvre un `AlertDialog` shadcn/ui avec message de confirmation.
  - [ ] 6.2 Tests `components/document-share-button.test.tsx` — rendu doc prive (bouton "Partager"), rendu doc partage (bouton "Retirer"), clic "Partager" appelle shareDocument, clic "Retirer" ouvre AlertDialog, confirmation appelle unshareDocument, annulation ne fait rien (6 tests)

- [ ] Task 7 — Integration DocumentList — checkboxes et batch (AC: #4)
  - [ ] 7.1 Modifier `components/document-list.tsx` — ajouter prop optionnelle `showBatchActions?: boolean` (defaut false). Si true : colonne checkbox en tete de tableau, state local `selectedIds: Set<string>`, barre d'actions contextuelle sticky en bas ("Partager la selection (N)" quand >=1 selectionne)
  - [ ] 7.2 Integrer `DocumentShareButton` dans chaque ligne de la liste (colonne Actions)
  - [ ] 7.3 Tests `components/document-list.test.tsx` — mise a jour des tests existants : pas de checkboxes sans prop, checkboxes avec `showBatchActions=true`, selection/deselection, bouton batch visible/invisible, clic batch appelle shareDocumentsBatch (5 tests supplementaires)

- [ ] Task 8 — Integration routes Hub (AC: #1, #2, #3, #4)
  - [ ] 8.1 Modifier `apps/hub/app/(dashboard)/modules/documents/[clientId]/page.tsx` — passer `showBatchActions={true}` a `DocumentsPageClient`
  - [ ] 8.2 Modifier `components/documents-page-client.tsx` — propager `showBatchActions` a `DocumentList`, passer `clientId` a `DocumentShareButton`
  - [ ] 8.3 Verifier `apps/client/app/(dashboard)/modules/documents/page.tsx` — NE PAS passer `showBatchActions` (client n'a pas les controles de partage)

- [ ] Task 9 — Mise a jour barrel exports et types (AC: #6)
  - [ ] 9.1 Mettre a jour `index.ts` — exporter `shareDocument`, `unshareDocument`, `shareDocumentsBatch`, `useShareDocument`, `DocumentShareButton` et les nouveaux types
  - [ ] 9.2 Mettre a jour `types/document.types.ts` — ajouter les schemas Zod et types des inputs

- [ ] Task 10 — Documentation (AC: #6)
  - [ ] 10.1 Mettre a jour `docs/guide.md` — section "Partager des documents avec votre client"
  - [ ] 10.2 Mettre a jour `docs/faq.md` — FAQ : puis-je retirer un partage ? le client est-il notifie ? partage en batch ?
  - [ ] 10.3 Mettre a jour `docs/flows.md` — flux partage individuel et batch MiKL → client

## Dev Notes

### Architecture — Regles critiques

- **MODULE EXISTANT** : Etendre `packages/modules/documents/` — PAS de nouveau module.
- **Aucune migration DB requise** : La colonne `visibility` et les policies RLS existent depuis la migration 00027 (story 4.1). Ne pas recreer.
- **Response format** : `{ data, error }` via `ActionResponse<T>`, `successResponse()`, `errorResponse()` de `@monprojetpro/types` — JAMAIS throw.
- **Logging** : `[DOCUMENTS:SHARE]`, `[DOCUMENTS:UNSHARE]`, `[DOCUMENTS:BATCH_SHARE]`
- **Auth check** : Utiliser `supabase.auth.getUser()` + verifier le role operator. Un client ne peut pas appeler `shareDocument()` — retourner `errorResponse('Acces refuse', 'FORBIDDEN')`.

### Pattern Server Actions (baser sur actions existantes)

```typescript
// actions/share-document.ts
'use server'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import type { Document } from '../types/document.types'
import { toDocument } from '../utils/to-document'

export async function shareDocument(documentId: string): Promise<ActionResponse<Document>> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifie', 'UNAUTHORIZED')

  // Verifier role operator (la table operators contient les operateurs)
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!operator) return errorResponse('Acces refuse', 'FORBIDDEN')

  // RLS filtre automatiquement — operator voit tous ses documents clients
  const { data: doc, error } = await supabase
    .from('documents')
    .update({ visibility: 'shared', updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .select()
    .single()

  if (error || !doc) return errorResponse('Document introuvable', 'NOT_FOUND', error)

  // Envoyer notification au client (story 3.2)
  // createNotification() appele sans await pour ne pas bloquer la reponse
  createNotification({
    clientId: doc.client_id,
    type: 'document_shared',
    message: 'MiKL a partage un nouveau document avec vous',
    metadata: { documentId: doc.id, documentName: doc.name },
  }).catch(console.error)

  console.info(`[DOCUMENTS:SHARE] Document ${documentId} partage par operator ${operator.id}`)
  return successResponse(toDocument(doc))
}
```

### Pattern batch avec IN clause

```typescript
// actions/share-documents-batch.ts
// Utiliser .in() Supabase pour mise a jour batch
const { data, error } = await supabase
  .from('documents')
  .update({ visibility: 'shared', updated_at: new Date().toISOString() })
  .in('id', documentIds)
  .select('id')

// Retourner le nombre de documents effectivement mis a jour
return successResponse({ count: data?.length ?? 0, documentIds: data?.map(d => d.id) ?? [] })
```

### Pattern AlertDialog shadcn/ui pour confirmation unshare

```typescript
// components/document-share-button.tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@monprojetpro/ui'

// Rendu conditionnel selon visibility
if (document.visibility === 'shared') {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">Retirer le partage</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer le partage ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le client ne pourra plus voir ce document.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => unshareDocument(document.id)}>
            Confirmer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Notification — Integration story 3.2

L'action `createNotification()` est dans `packages/modules/notifications/actions/create-notification.ts`.
Un module ne peut PAS importer directement un autre module. Utiliser un import depuis `@monprojetpro/supabase` ou appeler la Server Action via le pattern etabli en 3.2.

**Alternative conforme a l'architecture** : Inserer directement dans la table `notifications` via le client Supabase dans la Server Action `shareDocument()` — cela respecte la regle "communication inter-modules via Supabase".

```typescript
// Insert notification directement en DB (pattern inter-module conforme)
await supabase.from('notifications').insert({
  client_id: doc.client_id,
  operator_id: operator.id,
  type: 'document_shared',
  title: 'Nouveau document partage',
  message: `MiKL a partage "${doc.name}" avec vous`,
  metadata: { documentId: doc.id },
  read: false,
})
```

### Composant DocumentList — etat de selection

**L'etat de selection (checkboxes) est un etat UI local** → `useState<Set<string>>` dans `DocumentList`.
NE PAS utiliser Zustand pour cela (CLAUDE.md : Zustand = etat UI persistant, les selections temporaires vont dans useState).

```typescript
// Dans document-list.tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

const toggleSelection = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
}
```

### Fichiers a creer

```
packages/modules/documents/
├── actions/share-document.ts          (nouveau)
├── actions/share-document.test.ts     (nouveau)
├── actions/unshare-document.ts        (nouveau)
├── actions/unshare-document.test.ts   (nouveau)
├── actions/share-documents-batch.ts   (nouveau)
├── actions/share-documents-batch.test.ts (nouveau)
├── hooks/use-share-document.ts        (nouveau)
├── hooks/use-share-document.test.ts   (nouveau)
├── components/document-share-button.tsx       (nouveau)
├── components/document-share-button.test.tsx  (nouveau)
```

### Fichiers a modifier

```
packages/modules/documents/
├── types/document.types.ts            (modifier — nouveaux schemas Zod + types)
├── components/document-list.tsx       (modifier — checkboxes + batch bar + share button)
├── components/document-list.test.tsx  (modifier — tests supplementaires)
├── components/documents-page-client.tsx (modifier — propager showBatchActions + clientId)
├── index.ts                           (modifier — nouveaux exports)
├── docs/guide.md                      (modifier)
├── docs/faq.md                        (modifier)
├── docs/flows.md                      (modifier)
```

### Routes a modifier

```
apps/hub/app/(dashboard)/modules/documents/[clientId]/page.tsx  (modifier — showBatchActions=true)
```

### Dependances existantes (stories 4.1 + 4.2)

- Table `documents` (migration 00027) avec colonne `visibility` TEXT CHECK IN ('private', 'shared')
- Policy RLS `documents_select_owner` : client voit uniquement ses docs partages + ses propres uploads
- Policy RLS `documents_select_operator` : operateur voit tous les docs de ses clients
- Policy RLS `documents_update_operator` : seul l'operateur peut modifier (visibility, folder, tags)
- Types `Document`, `DocumentDB`, `DocumentVisibility` — deja dans `types/document.types.ts`
- `toDocument()` dans `utils/to-document.ts`
- `DocumentVisibilityBadge` — deja dans `components/document-visibility-badge.tsx`
- `@monprojetpro/types` — `ActionResponse`, `successResponse`, `errorResponse`
- `@monprojetpro/supabase` — `createServerSupabaseClient`
- Table `notifications` (migration story 3.2) — pour l'insertion de notification inter-module

### Anti-patterns — Interdit

- NE PAS importer `packages/modules/notifications/` directement — utiliser Supabase DB en insertion directe
- NE PAS permettre a un client d'appeler `shareDocument()` — verifier le role operator
- NE PAS stocker l'etat de selection dans Zustand — useState local
- NE PAS creer de nouvelle migration DB — tout est deja en place
- NE PAS throw dans les Server Actions
- NE PAS oublier d'invalider le cache apres chaque mutation

### Patterns de tests a suivre (story 4.2)

```typescript
// Mock Supabase chained pattern (etabli en 4.1/4.2)
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: mockDocumentDB, error: null })
    })
  })
})
vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: vi.fn().mockReturnValue({ update: mockUpdate, select: ..., insert: ... }),
  })
}))
```

### Estimation tests

| Fichier | Tests |
|---------|-------|
| `actions/share-document.test.ts` | 6 |
| `actions/unshare-document.test.ts` | 6 |
| `actions/share-documents-batch.test.ts` | 5 |
| `hooks/use-share-document.test.ts` | 4 |
| `components/document-share-button.test.tsx` | 6 |
| `components/document-list.test.tsx` (ajouts) | +5 |
| Types schemas | 6 |
| **Total nouveaux tests** | **~38** |

Projet actuellement a **1570 tests**. Objectif post-story : **~1608 tests**.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-4-gestion-documentaire-stories-detaillees.md#Story 4.3]
- [Source: docs/project-context.md]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md]
- [Source: _bmad-output/implementation-artifacts/4-1-module-documents-migration-structure-upload-avec-validation.md]
- [Source: _bmad-output/implementation-artifacts/4-2-visualisation-documents-viewer-html-telechargement-pdf.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

- Story implémentée complètement : 10 tasks, 42 nouveaux tests, 1612 tests au total (objectif ~1608 atteint)
- **Écarts par rapport aux dev notes** : L'opérateur est identifié via `.eq('auth_user_id', user.id)` seul (pattern correct du hub). Le dev note suggérait un double `.eq('id', ...)` erroné — corrigé en code review.
- **Code review** : 9 issues trouvées (3 HIGH, 4 MEDIUM, 2 LOW). Toutes HIGH + MEDIUM fixées :
  - Issue 1 (HIGH): `.eq('client_id', parsed.data.clientId)` ajouté au batch update — isolation défense-en-profondeur
  - Issue 2 (HIGH): Double `.eq('id', user.id)` supprimé des 3 actions — auth pattern correct
  - Issue 3 (HIGH): Mutations hook lèvent une erreur quand `result.error` est set — TanStack Query error state correctement peuplé
  - Issue 4 (MEDIUM): Validation Zod UUID ajoutée à `shareDocument` et `unshareDocument`
  - Issue 5 (MEDIUM): Documenté — hook appelé avec `clientId ?? ''`, guard dans `handleBatchShare` prévient les mutations sans clientId
  - Issue 6 (MEDIUM): `title={shareError?.message}` et `title={unshareError?.message}` ajoutés aux boutons pour accessibilité erreur
  - Issue 7 (MEDIUM): Le count retourné = données effectivement mises à jour (comportement déjà correct)
- **Bug fixé** : `ShareX` n'existait pas dans la version lucide-react installée → remplacé par `EyeOff`
- **Bug fixé** : Fire-and-forget notification `.then()` ne catchait pas les rejected promises → `.catch()` ajouté
- **Bug fixé** : Mock DataTable dans document-list.test.tsx ne renderait pas les columns (checkboxes invisibles) → mock mis à jour pour appeler `header()` et `cell()` des colonnes

### File List

**Nouveaux fichiers :**
- packages/modules/documents/actions/share-document.ts
- packages/modules/documents/actions/share-document.test.ts (7 tests)
- packages/modules/documents/actions/unshare-document.ts
- packages/modules/documents/actions/unshare-document.test.ts (7 tests)
- packages/modules/documents/actions/share-documents-batch.ts
- packages/modules/documents/actions/share-documents-batch.test.ts (5 tests)
- packages/modules/documents/hooks/use-share-document.ts
- packages/modules/documents/hooks/use-share-document.test.ts (4 tests)
- packages/modules/documents/components/document-share-button.tsx
- packages/modules/documents/components/document-share-button.test.tsx (6 tests)

**Fichiers modifiés :**
- packages/modules/documents/types/document.types.ts (+ 3 schemas Zod + types)
- packages/modules/documents/types/document.types.test.ts (+ 6 tests schemas)
- packages/modules/documents/components/document-list.tsx (checkboxes + batch bar + share button)
- packages/modules/documents/components/document-list.test.tsx (+ 5 tests batch, mock DataTable amélioré)
- packages/modules/documents/components/documents-page-client.tsx (prop showBatchActions)
- packages/modules/documents/index.ts (exports DocumentShareButton, useShareDocument, 3 actions, 3 types)
- packages/modules/documents/docs/guide.md (section partage individuel + batch)
- packages/modules/documents/docs/faq.md (5 nouvelles FAQ partage)
- packages/modules/documents/docs/flows.md (Flow 6 + 7 partage MiKL→client)
- apps/hub/app/(dashboard)/modules/documents/[clientId]/page.tsx (showBatchActions=true)
