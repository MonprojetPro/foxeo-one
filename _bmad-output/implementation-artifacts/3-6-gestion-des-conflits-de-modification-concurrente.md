# Story 3.6: Gestion des conflits de modification concurrente

Status: done

## Story

As a **utilisateur (MiKL ou client)**,
I want **être prévenu si quelqu'un d'autre a modifié les mêmes données que moi pendant que je les éditais**,
So that **je ne perds pas mon travail et les modifications ne s'écrasent pas silencieusement**.

## Acceptance Criteria

1. **AC1 — Helper optimisticLock** : Helper `optimisticLock()` disponible dans `@monprojetpro/utils`. Pattern basé sur le champ `updated_at` existant.

2. **AC2 — Capture version** : Quand un formulaire d'édition s'ouvre, le `updated_at` de l'enregistrement est stocké comme référence.

3. **AC3 — Vérification au submit** : La Server Action inclut `.eq('updated_at', originalUpdatedAt)` dans l'update (FR128). Si match → modification OK. Si différent → 0 rows affected → conflit.

4. **AC4 — Dialog conflit** : Si conflit détecté, réponse `{ error: { code: 'CONFLICT' } }`. Dialog avec options : "Recharger les données" (perd modifications locales, défaut), "Forcer ma version" (écrase, re-soumet avec nouveau updated_at).

5. **AC5 — Multi-onglets** : Le mécanisme fonctionne entre onglets du même utilisateur. Message explicatif.

6. **AC6 — Tests** : Tests unitaires co-localisés. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Helper optimisticLock (AC: #1, #3)
  - [x] 1.1 `packages/utils/src/optimistic-lock.ts` — Helper function
  - [x] 1.2 Fonction `withOptimisticLock(supabase, table, id, updatedAt, updateData)` qui vérifie updated_at
  - [x] 1.3 Retourne `ActionResponse` avec code `CONFLICT` si mismatch
  - [x] 1.4 Export depuis `@monprojetpro/utils`

- [x] Task 2 — Hook useOptimisticLock (AC: #2)
  - [x] 2.1 `packages/ui/src/hooks/use-optimistic-lock.ts` — Hook qui capture le updated_at initial
  - [x] 2.2 Expose : `originalUpdatedAt`, `isConflict`, `resolveConflict(action: 'reload' | 'force')`

- [x] Task 3 — Composant ConflictDialog (AC: #4)
  - [x] 3.1 `packages/ui/src/components/conflict-dialog.tsx` — Dialog avec les deux options
  - [x] 3.2 Option "Recharger" : invalide le cache TanStack Query + ferme le dialog
  - [x] 3.3 Option "Forcer" : re-soumet la mutation sans vérification updated_at
  - [x] 3.4 Défaut sélectionné : "Recharger"

- [x] Task 4 — Intégration Server Actions existantes (AC: #3)
  - [x] 4.1 Intégrer `withOptimisticLock` dans les Server Actions de mutation CRM (updateClient, etc.)
  - [x] 4.2 Documenter le pattern pour les futures Server Actions

- [x] Task 5 — Tests (AC: #6)
  - [x] 5.1 Tests helper : optimisticLock normal, conflit, force
  - [x] 5.2 Tests hook : capture updated_at, détection conflit
  - [x] 5.3 Tests composant : ConflictDialog, options, actions
  - [x] 5.4 Tests intégration : Server Action avec conflit simulé

## Dev Notes

### Architecture — Règles critiques

- **Pas de migration DB** : Utilise les colonnes `updated_at` existantes sur toutes les tables.
- **Package utils** : Le helper va dans `@monprojetpro/utils` (réutilisable par tous les modules).
- **Package ui** : Le hook et le dialog vont dans `@monprojetpro/ui` (composants partagés).
- **Response format** : `{ data: null, error: { code: 'CONFLICT', message: '...' } }`

### Helper optimisticLock

```typescript
// packages/utils/src/optimistic-lock.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActionResponse } from '@monprojetpro/types'
import { successResponse, errorResponse } from '@monprojetpro/types'

export async function withOptimisticLock<T>(
  supabase: SupabaseClient,
  table: string,
  id: string,
  originalUpdatedAt: string,
  updateData: Record<string, unknown>,
  options?: { force?: boolean }
): Promise<ActionResponse<T>> {
  const query = supabase
    .from(table)
    .update(updateData)
    .eq('id', id)

  // Si pas force, ajouter le check updated_at
  if (!options?.force) {
    query.eq('updated_at', originalUpdatedAt)
  }

  const { data, error, count } = await query.select().single()

  if (error) {
    // Si aucune row affectée et pas d'erreur DB → conflit
    if (error.code === 'PGRST116') { // No rows found
      return errorResponse(
        'Les données ont été modifiées par un autre utilisateur. Veuillez recharger.',
        'CONFLICT'
      )
    }
    return errorResponse('Erreur lors de la mise à jour', 'DATABASE_ERROR', error)
  }

  return successResponse(data as T)
}
```

### Hook useOptimisticLock

```typescript
// packages/ui/src/hooks/use-optimistic-lock.ts
'use client'
import { useState, useCallback } from 'react'

export function useOptimisticLock(initialUpdatedAt: string) {
  const [originalUpdatedAt] = useState(initialUpdatedAt)
  const [isConflict, setIsConflict] = useState(false)
  const [conflictError, setConflictError] = useState<string | null>(null)

  const checkResponse = useCallback((response: { error?: { code?: string } | null }) => {
    if (response.error?.code === 'CONFLICT') {
      setIsConflict(true)
      setConflictError(response.error.message)
      return true
    }
    return false
  }, [])

  const resolveConflict = useCallback(() => {
    setIsConflict(false)
    setConflictError(null)
  }, [])

  return { originalUpdatedAt, isConflict, conflictError, checkResponse, resolveConflict }
}
```

### Intégration dans les formulaires

```typescript
// Exemple dans un composant d'édition client
function EditClientForm({ client }: { client: Client }) {
  const { originalUpdatedAt, isConflict, checkResponse, resolveConflict } = useOptimisticLock(client.updatedAt)
  const queryClient = useQueryClient()

  const onSubmit = async (data: UpdateClientInput) => {
    const response = await updateClient({ ...data, updatedAt: originalUpdatedAt })
    if (checkResponse(response)) return // Conflit détecté → dialog s'affiche
    // Succès
    queryClient.invalidateQueries({ queryKey: ['client', client.id] })
    toast({ title: 'Client mis à jour' })
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>{/* ... */}</form>
      <ConflictDialog
        open={isConflict}
        onReload={() => {
          resolveConflict()
          queryClient.invalidateQueries({ queryKey: ['client', client.id] })
        }}
        onForce={() => {
          resolveConflict()
          onSubmit({ ...getValues(), force: true })
        }}
      />
    </>
  )
}
```

### Fichiers à créer

- `packages/utils/src/optimistic-lock.ts`
- `packages/utils/src/optimistic-lock.test.ts`
- `packages/ui/src/hooks/use-optimistic-lock.ts`
- `packages/ui/src/hooks/use-optimistic-lock.test.tsx`
- `packages/ui/src/components/conflict-dialog.tsx`
- `packages/ui/src/components/conflict-dialog.test.tsx`

### Fichiers à modifier

- `packages/utils/src/index.ts` (export withOptimisticLock)
- `packages/ui/src/index.ts` (export hook + composant)
- Server Actions de mutation CRM pour intégrer le pattern (optionnel, peut être fait progressivement)

### Dépendances

- `@monprojetpro/types` — ActionResponse, errorResponse, successResponse
- `@monprojetpro/supabase` — SupabaseClient
- Colonnes `updated_at` existantes sur toutes les tables principales

### Anti-patterns — Interdit

- NE PAS utiliser de verrouillage pessimiste (lock DB) — trop lourd
- NE PAS ignorer les conflits silencieusement
- NE PAS throw dans les Server Actions (retourner code CONFLICT)
- NE PAS forcer par défaut — le défaut est "Recharger"

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-3-*.md#Story 3.6]
- [Source: docs/project-context.md]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Full test suite: 1402 passed, 0 failed (162 test files)
- Story-specific tests: 26 new tests (7 helper + 8 hook + 8 dialog + 3 integration)

### Completion Notes List
- Task 1: Created `withOptimisticLock` helper in `@monprojetpro/utils` — generic optimistic locking using `updated_at` column with force bypass option. Returns `CONFLICT` error code on PGRST116.
- Task 2: Created `useOptimisticLock` hook in `@monprojetpro/ui` — captures initial `updated_at`, detects conflict from response, exposes `resolveConflict()` to reset state.
- Task 3: Created `ConflictDialog` component in `@monprojetpro/ui` — uses Dialog primitives, two actions (Recharger default, Forcer), custom message support.
- Task 4: Integrated optimistic lock pattern into `updateClient` Server Action — optional `updatedAt`/`force` params, PGRST116 → CONFLICT detection. Pattern documented via code for future Server Actions.
- Task 5: All tests written and passing — 26 new tests across 4 test files.

### Change Log
- 2026-02-18: Story 3.6 implemented — optimistic lock helper, hook, dialog, CRM integration, 26 tests.
- 2026-02-18: Code review — 7 issues found (1H, 4M, 2L). Fixed H1 (query reassignment), M1 (NOT_FOUND distinction), M2 (multi-tab message). M3/M4 documented, L1/L2 deferred.

### File List
- `packages/utils/src/optimistic-lock.ts` (new)
- `packages/utils/src/optimistic-lock.test.ts` (new)
- `packages/utils/src/index.ts` (modified — export withOptimisticLock)
- `packages/ui/src/hooks/use-optimistic-lock.ts` (new)
- `packages/ui/src/hooks/use-optimistic-lock.test.ts` (new)
- `packages/ui/src/components/conflict-dialog.tsx` (new)
- `packages/ui/src/components/conflict-dialog.test.tsx` (new)
- `packages/ui/src/index.ts` (modified — export hook + component)
- `packages/modules/crm/actions/update-client.ts` (modified — optimistic lock integration)
- `packages/modules/crm/actions/update-client.test.ts` (modified — 3 conflict tests added)
