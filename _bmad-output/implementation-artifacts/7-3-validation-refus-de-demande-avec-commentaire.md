# Story 7.3 : Validation & refus de demande avec commentaire

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **MiKL (opérateur)**,
I want **valider ou refuser une demande avec un commentaire optionnel (validation) ou obligatoire (refus)**,
So that **le client sait clairement si son travail est accepté ou ce qu'il doit modifier**.

## Acceptance Criteria

### AC 1 : Modale de validation affichée

**Given** MiKL consulte une demande en statut 'pending' ou 'needs_clarification' (Story 7.2)
**When** il clique sur le bouton "Valider" (FR10)
**Then** une modale de confirmation s'affiche avec :
- Résumé de la demande (titre, client, type)
- Champ commentaire optionnel (textarea, placeholder: "Commentaire pour le client (optionnel)")
- Boutons "Confirmer la validation" / "Annuler"

**And** la modale utilise le composant Dialog de @monprojetpro/ui
**And** le champ commentaire a une limite de 500 caractères

### AC 2 : Server Action approveRequest exécutée

**Given** MiKL confirme la validation
**When** la Server Action `approveRequest(requestId, comment?)` s'exécute
**Then** les opérations suivantes sont effectuées dans une **transaction Supabase** :

1. `validation_requests.status` → 'approved'
2. `validation_requests.reviewer_comment` → commentaire (si fourni)
3. `validation_requests.reviewed_at` → NOW()
4. **Si type='brief_lab' ET parcours_id + step_id non null** :
   - L'étape correspondante dans `parcours.active_steps` passe à 'completed' (avec `completed_at: NOW()`)
   - Le `current_step_id` avance à l'étape suivante active (si elle existe)
   - Si c'était la dernière étape : `parcours.status` → 'completed', `parcours.completed_at` → NOW()
5. Une notification est créée pour le client (FR14) :
   - `type='validation'`
   - `title="Votre demande '{titre}' a été validée !"`
   - `body=commentaire` (si présent)
   - `link="/modules/parcours-lab"` (si brief_lab)

**And** l'action répond en moins de 500ms (NFR-P2)
**And** l'action retourne `{ data: updatedRequest, error: null }` en cas de succès
**And** l'action retourne `{ data: null, error: { message, code } }` en cas d'erreur

### AC 3 : Feedback utilisateur après validation

**Given** la validation a réussi
**When** l'action est terminée
**Then** un toast de succès s'affiche : "Demande validée avec succès"
**And** le cache TanStack Query est invalidé pour :
  - `['validation-requests']` (liste)
  - `['validation-request', requestId]` (détail)
  - `['parcours', clientId]` (si brief_lab)
**And** MiKL est redirigé vers la file d'attente (`/modules/validation-hub`)

### AC 4 : Modale de refus affichée

**Given** MiKL consulte une demande en statut 'pending' ou 'needs_clarification'
**When** il clique sur le bouton "Refuser" (FR11)
**Then** une modale de refus s'affiche avec :
- Résumé de la demande (titre, client, type)
- Champ commentaire **obligatoire** (textarea, placeholder: "Expliquez au client ce qui doit être modifié...")
- Validation : minimum 10 caractères
- Boutons "Confirmer le refus" / "Annuler"

**And** le bouton "Confirmer le refus" est désactivé tant que le commentaire n'a pas 10 caractères minimum
**And** la modale utilise le composant Dialog de @monprojetpro/ui

### AC 5 : Server Action rejectRequest exécutée

**Given** MiKL confirme le refus avec un commentaire valide
**When** la Server Action `rejectRequest(requestId, comment)` s'exécute
**Then** les opérations suivantes sont effectuées :

1. `validation_requests.status` → 'rejected'
2. `validation_requests.reviewer_comment` → commentaire
3. `validation_requests.reviewed_at` → NOW()
4. Une notification est créée pour le client (FR14) :
   - `type='validation'`
   - `title="MiKL a demandé des modifications sur '{titre}'"`
   - `body=commentaire`
   - `link="/modules/parcours-lab"` (si brief_lab)

**And** l'action répond en moins de 500ms (NFR-P2)
**And** l'action retourne `{ data: updatedRequest, error: null }` en cas de succès

### AC 6 : Feedback utilisateur après refus

**Given** le refus a réussi
**When** l'action est terminée
**Then** un toast de succès s'affiche : "Demande refusée — le client a été notifié"
**And** le cache TanStack Query est invalidé
**And** MiKL est redirigé vers la file d'attente

### AC 7 : Gestion des erreurs

**Given** une erreur survient pendant l'action (ex : problème réseau, transaction rollback)
**When** la Server Action échoue
**Then** un message d'erreur clair s'affiche dans un toast : "Erreur lors du traitement — veuillez réessayer"
**And** le statut de la demande n'a pas changé (transaction rollback)
**And** les boutons d'action restent actifs pour retenter
**And** l'erreur est loggée côté serveur avec le format `[VALIDATION-HUB:APPROVE] error message`

## Tasks / Subtasks

### Task 1 : Créer les composants de modale (AC: 1, 4)
- [x] Créer `components/approve-dialog.tsx` (modale validation)
  - Résumé de la demande
  - Champ commentaire optionnel (max 500 caractères)
  - Boutons Confirmer/Annuler
- [x] Créer `components/reject-dialog.tsx` (modale refus)
  - Résumé de la demande
  - Champ commentaire obligatoire (min 10 caractères)
  - Validation Zod
  - Boutons Confirmer/Annuler désactivés si invalide
- [x] Utiliser Dialog, Textarea, Button de @monprojetpro/ui
- [x] Écrire tests `approve-dialog.test.tsx`, `reject-dialog.test.tsx`

### Task 2 : Créer la Server Action approveRequest (AC: 2)
- [x] Créer `actions/approve-request.ts`
- [x] Valider les inputs avec Zod (requestId UUID, comment optionnel)
- [x] Démarrer transaction Supabase
- [x] Mettre à jour `validation_requests` (status, reviewer_comment, reviewed_at)
- [x] Si brief_lab : mettre à jour `parcours` (étape completed, avancer current_step_id)
- [x] Créer notification client
- [x] Commit transaction
- [x] Retourner `{ data, error }` format
- [x] Logger les erreurs avec format `[VALIDATION-HUB:APPROVE]`
- [x] Écrire test `approve-request.test.ts`

### Task 3 : Créer la Server Action rejectRequest (AC: 5)
- [x] Créer `actions/reject-request.ts`
- [x] Valider les inputs avec Zod (requestId UUID, comment obligatoire min 10 chars)
- [x] Mettre à jour `validation_requests` (status, reviewer_comment, reviewed_at)
- [x] Créer notification client
- [x] Retourner `{ data, error }` format
- [x] Logger les erreurs avec format `[VALIDATION-HUB:REJECT]`
- [x] Écrire test `reject-request.test.ts`

### Task 4 : Intégrer les modales dans request-detail (AC: 1, 4)
- [x] Modifier `components/request-detail.tsx`
- [x] Ajouter state pour ouvrir/fermer les modales
- [x] Connecter bouton "Valider" → `<ApproveDialog />`
- [x] Connecter bouton "Refuser" → `<RejectDialog />`
- [x] Passer les props nécessaires (requestId, title, clientName, type)

### Task 5 : Implémenter la logique de soumission (AC: 2, 5)
- [x] Dans `approve-dialog.tsx` : appeler `approveRequest(requestId, comment)`
- [x] Dans `reject-dialog.tsx` : appeler `rejectRequest(requestId, comment)`
- [x] Utiliser `useTransition` pour gérer l'état pending
- [x] Afficher spinner dans le bouton pendant l'action
- [x] Gérer les erreurs retournées par les Server Actions

### Task 6 : Implémenter le feedback utilisateur (AC: 3, 6, 7)
- [x] Toast de succès après validation : "Demande validée avec succès"
- [x] Toast de succès après refus : "Demande refusée — le client a été notifié"
- [x] Toast d'erreur en cas de problème : "Erreur lors du traitement — veuillez réessayer"
- [x] Invalider les caches TanStack Query appropriés
- [x] Rediriger vers `/modules/validation-hub` après succès
- [x] Utiliser `useRouter()` de Next.js pour la redirection

### Task 7 : Implémenter la logique parcours Lab (AC: 2)
- [x] Créer helper `utils/update-parcours-step.ts`
- [x] Fonction pour avancer `current_step_id` à l'étape suivante
- [x] Fonction pour marquer étape comme 'completed'
- [x] Fonction pour détecter si c'est la dernière étape
- [x] Fonction pour marquer parcours comme 'completed' si dernière étape
- [x] Écrire test `update-parcours-step.test.ts`

### Task 8 : Créer les notifications client (AC: 2, 5)
- [x] Vérifier que la table `notifications` existe (Epic 3)
- [x] Créer helper `utils/create-validation-notification.ts`
- [x] Fonction pour créer notification validation
- [x] Fonction pour créer notification refus
- [x] Utiliser les types du module notifications
- [x] Écrire test `create-validation-notification.test.ts`

### Task 9 : Tests d'intégration (AC: 2-7)
- [x] Test workflow complet validation (modale → action → notification → redirect)
- [x] Test workflow complet refus (modale → action → notification → redirect)
- [x] Test transaction rollback en cas d'erreur
- [x] Test invalidation cache TanStack Query
- [x] Test mise à jour parcours Lab (si brief_lab)
- [x] Test création notifications

## Dev Notes

### Contexte Epic 7

Cette story est la **troisième** de l'Epic 7. Elle implémente les **actions critiques** de validation et refus. Les stories suivantes ajouteront la demande de précisions (7.4), les actions de traitement (7.5), et le temps réel (7.6).

**Dépendances** :
- Story 7.1 : Structure du module
- Story 7.2 : Vue détaillée (boutons d'action)
- Epic 3 : Module notifications (table `notifications`)

### Architecture : Transactions Supabase

**CRITIQUE** : Les opérations de validation et refus DOIVENT être exécutées dans une **transaction Supabase** pour garantir l'atomicité.

**Pattern transaction Supabase (PostgreSQL)** :

```typescript
// Utiliser une fonction PostgreSQL pour garantir l'atomicité
const { data, error } = await supabase.rpc('approve_validation_request', {
  p_request_id: requestId,
  p_comment: comment,
  p_operator_id: operatorId
})
```

**Créer une fonction SQL** dans une migration :

```sql
-- migration: 000XX_validation_functions.sql
CREATE OR REPLACE FUNCTION approve_validation_request(
  p_request_id UUID,
  p_comment TEXT,
  p_operator_id UUID
) RETURNS validation_requests AS $$
DECLARE
  v_request validation_requests;
  v_parcours parcours;
BEGIN
  -- Lock row
  SELECT * INTO v_request
  FROM validation_requests
  WHERE id = p_request_id
  FOR UPDATE;

  -- Update request
  UPDATE validation_requests
  SET status = 'approved',
      reviewer_comment = p_comment,
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  -- If brief_lab, update parcours
  IF v_request.type = 'brief_lab' AND v_request.parcours_id IS NOT NULL THEN
    -- Update parcours step (logic to implement)
    -- ...
  END IF;

  -- Create notification
  INSERT INTO notifications (client_id, type, title, body, link, created_at)
  VALUES (
    v_request.client_id,
    'validation',
    'Votre demande "' || v_request.title || '" a été validée !',
    p_comment,
    '/modules/parcours-lab',
    NOW()
  );

  RETURN v_request;
END;
$$ LANGUAGE plpgsql;
```

**Avantage** : Transaction atomique garantie par PostgreSQL, rollback automatique en cas d'erreur.

### Références architecture importantes

#### Pattern Server Action avec transaction

**Source** : `architecture/04-implementation-patterns.md`

```typescript
'use server'

export async function approveRequest(
  requestId: string,
  comment?: string
): Promise<ActionResponse<ValidationRequest>> {
  try {
    // Validate inputs
    const schema = z.object({
      requestId: z.string().uuid(),
      comment: z.string().max(500).optional(),
    })
    const validated = schema.safeParse({ requestId, comment })
    if (!validated.success) {
      return {
        data: null,
        error: {
          message: 'Données invalides',
          code: 'VALIDATION_ERROR',
          details: validated.error,
        },
      }
    }

    // Get operator ID from session
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return {
        data: null,
        error: { message: 'Non authentifié', code: 'UNAUTHORIZED' },
      }
    }

    // Call PostgreSQL function (transaction)
    const { data, error } = await supabase.rpc('approve_validation_request', {
      p_request_id: requestId,
      p_comment: comment,
      p_operator_id: user.id,
    })

    if (error) {
      console.error('[VALIDATION-HUB:APPROVE] Error:', error)
      return {
        data: null,
        error: {
          message: 'Erreur lors de la validation',
          code: 'DB_ERROR',
          details: error,
        },
      }
    }

    return { data: toCamelCase(data), error: null }
  } catch (err) {
    console.error('[VALIDATION-HUB:APPROVE] Unexpected error:', err)
    return {
      data: null,
      error: {
        message: 'Erreur inattendue',
        code: 'INTERNAL_ERROR',
      },
    }
  }
}
```

#### Pattern Dialog avec validation Zod

**Source** : `packages/ui` + React Hook Form

```typescript
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@monprojetpro/ui'
import { Button, Textarea, Label } from '@monprojetpro/ui'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const rejectSchema = z.object({
  comment: z.string().min(10, 'Le commentaire doit contenir au moins 10 caractères'),
})

type RejectFormData = z.infer<typeof rejectSchema>

export function RejectDialog({ requestId, title, onClose }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RejectFormData>({
    resolver: zodResolver(rejectSchema),
    mode: 'onChange',
  })

  const [isPending, startTransition] = useTransition()

  const onSubmit = (data: RejectFormData) => {
    startTransition(async () => {
      const result = await rejectRequest(requestId, data.comment)
      if (result.error) {
        toast.error(result.error.message)
        return
      }
      toast.success('Demande refusée — le client a été notifié')
      router.push('/modules/validation-hub')
      router.refresh()
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refuser la demande</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Demande : <strong>{title}</strong>
            </p>
            <div>
              <Label htmlFor="comment">Commentaire *</Label>
              <Textarea
                id="comment"
                placeholder="Expliquez au client ce qui doit être modifié..."
                {...register('comment')}
                className={errors.comment ? 'border-red-500' : ''}
              />
              {errors.comment && (
                <p className="text-sm text-red-500 mt-1">{errors.comment.message}</p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" variant="destructive" disabled={!isValid || isPending}>
              {isPending ? 'Refus en cours...' : 'Confirmer le refus'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

#### Pattern Invalidation cache TanStack Query

**Source** : `architecture/04-implementation-patterns.md`

```typescript
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

// Invalider plusieurs caches après mutation
await queryClient.invalidateQueries({
  queryKey: ['validation-requests'],
})
await queryClient.invalidateQueries({
  queryKey: ['validation-request', requestId],
})
if (request.type === 'brief_lab') {
  await queryClient.invalidateQueries({
    queryKey: ['parcours', request.clientId],
  })
}
```

### Exemples de code du module CRM

Le module CRM n'a pas de modales de validation/refus, mais il a des modales de création/édition qui suivent des patterns similaires.

#### Dialog create-client-dialog.tsx (pattern modale avec form)

```typescript
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@monprojetpro/ui'
import { Button } from '@monprojetpro/ui'
import { ClientForm } from './client-form'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@monprojetpro/ui'
import { createClient } from '../actions/create-client'

export function CreateClientDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = (data: ClientFormData) => {
    startTransition(async () => {
      const result = await createClient(data)
      if (result.error) {
        toast.error(result.error.message)
        return
      }
      toast.success('Client créé avec succès')
      setOpen(false)
      router.push(`/modules/crm/clients/${result.data.id}`)
      router.refresh()
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Créer un client</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouveau client</DialogTitle>
          </DialogHeader>
          <ClientForm onSubmit={handleSubmit} isPending={isPending} />
        </DialogContent>
      </Dialog>
    </>
  )
}
```

**Inspiration** : Créer `approve-dialog.tsx` et `reject-dialog.tsx` en suivant ce pattern.

### Technical Requirements

#### Stack & Versions (identique Stories 7.1-7.2)

| Package | Version | Usage |
|---------|---------|-------|
| Next.js | 16.1.1 | Server Actions |
| React | 19.2.3 | UI Components |
| @tanstack/react-query | ^5.90.x | Cache invalidation |
| @supabase/supabase-js | ^2.95.x | Database client + RPC |
| react-hook-form | ^7.71.x | Form management |
| @hookform/resolvers | Latest | Zod resolver |
| zod | Latest | Schema validation |
| @monprojetpro/ui | Internal | Dialog, Button, Textarea |
| @monprojetpro/utils | Internal | toCamelCase |

#### Composants UI disponibles (@monprojetpro/ui)

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` : Modale
- `Button` : Bouton avec variants et loading state
- `Textarea` : Champ textarea
- `Label` : Label pour formulaire
- `toast` : Notifications toast

### Architecture Compliance

#### Pattern Server Action (OBLIGATOIRE)

**Toutes les mutations DOIVENT passer par des Server Actions** — jamais d'API Route pour les mutations métier.

```typescript
'use server'

export async function approveRequest(
  requestId: string,
  comment?: string
): Promise<ActionResponse<ValidationRequest>>
```

#### Pattern Response Format (OBLIGATOIRE)

**TOUJOURS retourner `{ data, error }`** — jamais de `throw`.

#### Pattern Transaction (OBLIGATOIRE)

**Utiliser les fonctions PostgreSQL (RPC) pour les transactions** — garantie d'atomicité.

#### Pattern Error Logging (OBLIGATOIRE)

**Format** : `[MODULE:ACTION] message`

Exemples :
- `[VALIDATION-HUB:APPROVE] Error: Failed to update parcours`
- `[VALIDATION-HUB:REJECT] Validation error: comment too short`

### Library/Framework Requirements

#### React Hook Form + Zod

**Pattern de validation** :

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  comment: z.string().min(10).max(500),
})

const { register, handleSubmit, formState: { errors, isValid } } = useForm({
  resolver: zodResolver(schema),
  mode: 'onChange', // Validation en temps réel
})
```

#### Toast Notifications

**Utiliser le toast de @monprojetpro/ui** :

```typescript
import { toast } from '@monprojetpro/ui'

// Success
toast.success('Demande validée avec succès')

// Error
toast.error('Erreur lors du traitement — veuillez réessayer')

// Info
toast.info('Information')
```

### File Structure Requirements

#### Module validation-hub (ajout Story 7.3)

```
packages/modules/validation-hub/
├── components/
│   ├── approve-dialog.tsx           # Story 7.3 ← NOUVEAU
│   ├── approve-dialog.test.tsx      # Story 7.3 ← NOUVEAU
│   ├── reject-dialog.tsx            # Story 7.3 ← NOUVEAU
│   └── reject-dialog.test.tsx       # Story 7.3 ← NOUVEAU
├── actions/
│   ├── approve-request.ts           # Story 7.3 ← NOUVEAU
│   ├── approve-request.test.ts      # Story 7.3 ← NOUVEAU
│   ├── reject-request.ts            # Story 7.3 ← NOUVEAU
│   └── reject-request.test.ts       # Story 7.3 ← NOUVEAU
├── utils/
│   ├── update-parcours-step.ts      # Story 7.3 ← NOUVEAU
│   ├── update-parcours-step.test.ts # Story 7.3 ← NOUVEAU
│   ├── create-validation-notification.ts  # Story 7.3 ← NOUVEAU
│   └── create-validation-notification.test.ts  # Story 7.3 ← NOUVEAU
```

#### Migration Supabase (Story 7.3)

```
supabase/migrations/
└── 000XX_validation_functions.sql   # Story 7.3 ← NOUVEAU
    ├── Function approve_validation_request()
    └── Function reject_validation_request()
```

### Testing Requirements

#### Tests à écrire (co-localisés)

| Fichier | Test à écrire | Type |
|---------|---------------|------|
| `approve-dialog.tsx` | `approve-dialog.test.tsx` | Component test |
| `reject-dialog.tsx` | `reject-dialog.test.tsx` | Component test + validation Zod |
| `approve-request.ts` | `approve-request.test.ts` | Server Action test |
| `reject-request.ts` | `reject-request.test.ts` | Server Action test |
| `update-parcours-step.ts` | `update-parcours-step.test.ts` | Utility test |
| `create-validation-notification.ts` | `create-validation-notification.test.ts` | Utility test |

#### Scénarios de test critiques

1. **Test transaction approve** : Vérifier rollback si erreur notification
2. **Test transaction reject** : Vérifier atomicité
3. **Test validation Zod** : Vérifier min 10 caractères pour refus
4. **Test invalidation cache** : Vérifier que les caches sont invalidés
5. **Test mise à jour parcours** : Vérifier avancement étape si brief_lab
6. **Test notification client** : Vérifier création notification

### Project Structure Notes

#### Alignement avec la structure unifiée

Cette story respecte l'architecture définie dans `architecture/05-project-structure.md` :
- Server Actions dans `actions/`
- Pattern `{ data, error }` pour toutes les actions
- Transactions PostgreSQL via RPC
- Validation Zod côté server
- Invalidation cache TanStack Query
- Tests co-localisés

#### Communication avec le module notifications

Cette story **crée des notifications** pour le client. Le module notifications (Epic 3) gère l'affichage et l'envoi des notifications.

**Pas d'import direct** — insertion directe dans la table `notifications` via Supabase.

### References

- [Epic 7 : Validation Hub](_bmad-output/planning-artifacts/epics/epic-7-validation-hub-stories-detaillees.md#story-73)
- [Story 7.1 : Structure du module](7-1-module-validation-hub-structure-types-file-attente-des-demandes.md)
- [Story 7.2 : Vue détaillée](7-2-vue-detaillee-dune-demande-avec-contexte-complet.md)
- [Architecture Platform](../planning-artifacts/architecture/02-platform-architecture.md)
- [Implementation Patterns](../planning-artifacts/architecture/04-implementation-patterns.md)
- [Supabase Transactions](https://supabase.com/docs/guides/database/functions)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6)

### Debug Log References

- **UUID validation fix**: Tests initiaux utilisaient `'req-uuid'`, `'client-uuid'` comme IDs — Zod `z.string().uuid()` rejetait ces valeurs. Corrigé avec des UUIDs réels (`550e8400-e29b-41d4-a716-44665544000X`).
- **`screen.getByRole('form')` throws**: Remplacé par `.closest('form')` sur le texte du bouton submit.
- **`expect.anything()` n'accepte pas `undefined`**: Pour approveRequest appelé sans commentaire, assertion changée à `undefined` explicite.
- **useRouter dans request-detail.test.tsx**: Après ajout des dialogs, les tests échouaient avec "invariant expected app router to be mounted". Corrigé via `vi.mock('./approve-dialog', ...)` et `vi.mock('./reject-dialog', ...)`.
- **`parcours.status` constraint**: Utilisé `'termine'` (non `'completed'`) pour le statut parcours complété — valeur correcte contrainte DB.
- **`notifications.recipient_id`**: Doit être `clients.auth_user_id` (auth.uid() du client) — JOIN avec clients ajouté dans les fonctions SQL.

### Completion Notes List

- Implémentation via RPC Supabase (`approve_validation_request` / `reject_validation_request`) pour atomicité transactionnelle complète côté PostgreSQL.
- Migration `00045_validation_request_functions.sql` créée avec les deux fonctions PL/pgSQL.
- `Label` component absent de `@monprojetpro/ui` → utilisé `<label>` HTML natif (pattern déjà documenté en mémoire).
- Toast via `showSuccess()`/`showError()` depuis `@monprojetpro/ui` (non `toast.success`).
- 52 nouveaux tests ajoutés (2535 → 2587 tests passing).
- Tous les ACs couverts : modales, Server Actions, feedback utilisateur, gestion erreurs, avancement parcours, notifications.

**Code Review Fixes (4 MEDIUM, 1 LOW):**
- M1: Retiré invalidation cache parcours inutile dans reject-dialog (refus ne modifie pas le parcours)
- M2: Retiré `'use server'` des utils de référence + supprimé exports dead code de index.ts
- M3: Éliminé double création client Supabase dans create-validation-notification.ts
- M4: Ajouté protection fermeture dialog pendant isPending (approve + reject)
- L2: Supprimé dead code (variables et fonctions non utilisées) dans update-parcours-step.test.ts

### File List

**Créés :**
- `supabase/migrations/00045_validation_request_functions.sql`
- `packages/modules/validation-hub/actions/approve-request.ts`
- `packages/modules/validation-hub/actions/approve-request.test.ts`
- `packages/modules/validation-hub/actions/reject-request.ts`
- `packages/modules/validation-hub/actions/reject-request.test.ts`
- `packages/modules/validation-hub/components/approve-dialog.tsx`
- `packages/modules/validation-hub/components/approve-dialog.test.tsx`
- `packages/modules/validation-hub/components/reject-dialog.tsx`
- `packages/modules/validation-hub/components/reject-dialog.test.tsx`
- `packages/modules/validation-hub/utils/update-parcours-step.ts`
- `packages/modules/validation-hub/utils/update-parcours-step.test.ts`
- `packages/modules/validation-hub/utils/create-validation-notification.ts`
- `packages/modules/validation-hub/utils/create-validation-notification.test.ts`

**Modifiés :**
- `packages/modules/validation-hub/components/request-detail.tsx` (ajout dialogs + state)
- `packages/modules/validation-hub/components/request-detail.test.tsx` (mocks dialogs)
- `packages/modules/validation-hub/index.ts` (nouveaux exports)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-26 | 1.0 | Implémentation complète Story 7.3 — validation & refus avec commentaire | Claude Sonnet 4.6 |
