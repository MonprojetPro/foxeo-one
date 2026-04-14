# Story 7.4 : Demande de précisions sur une soumission

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **MiKL (opérateur)**,
I want **demander des précisions au client sur une soumission avant de la valider ou la refuser**,
So that **je peux obtenir les informations manquantes sans bloquer le processus**.

## Acceptance Criteria

### AC 1 : Modale de demande de précisions affichée

**Given** MiKL consulte une demande en statut 'pending' (Story 7.2)
**When** il clique sur "Demander des précisions" (FR12)
**Then** une modale s'affiche avec :
- Résumé de la demande (titre, client)
- Champ question/commentaire **obligatoire** (textarea, placeholder: "Quelle information vous manque ?")
- Validation : minimum 10 caractères
- Suggestions rapides (chips cliquables) :
  - "Pouvez-vous détailler le besoin ?"
  - "Avez-vous un exemple concret ?"
  - "Quel est le budget envisagé ?"
- Boutons "Envoyer la question" / "Annuler"

**And** la modale utilise le composant Dialog de @monprojetpro/ui
**And** cliquer sur une suggestion remplit le champ avec le texte de la suggestion

### AC 2 : Server Action requestClarification exécutée

**Given** MiKL envoie sa question
**When** la Server Action `requestClarification(requestId, comment)` s'exécute
**Then** les opérations suivantes sont effectuées :

1. `validation_requests.status` → 'needs_clarification'
2. `validation_requests.reviewer_comment` → commentaire de MiKL
3. `validation_requests.reviewed_at` → NOW()
4. `validation_requests.updated_at` → NOW()
5. Une notification est créée pour le client (FR14) :
   - `type='validation'`
   - `title="MiKL a une question sur '{titre}'"`
   - `body=commentaire`
   - `link="/modules/parcours-lab"` (si brief_lab)

**And** l'action répond en moins de 500ms (NFR-P2)
**And** l'action retourne `{ data: updatedRequest, error: null }` en cas de succès

### AC 3 : Feedback utilisateur après envoi

**Given** la question a été envoyée avec succès
**When** l'action est terminée
**Then** un toast de succès s'affiche : "Question envoyée au client"
**And** le cache TanStack Query est invalidé pour :
  - `['validation-requests']`
  - `['validation-request', requestId]`
**And** MiKL est redirigé vers la file d'attente (`/modules/validation-hub`)

### AC 4 : Client re-soumet avec contenu mis à jour

**Given** le client a reçu la notification de demande de précisions
**When** le client re-soumet avec du contenu mis à jour (côté Lab/One)
**Then** la `validation_request` est mise à jour avec :
- `content` → nouveau contenu du client
- `status` → 'pending' (retour en attente)
- `updated_at` → NOW()

**And** une notification est envoyée à MiKL (module notifications) :
- `type='validation'`
- `title="Le client {nom} a répondu à votre question sur '{titre}'"`
- `link="/modules/validation-hub/[requestId]"`

**And** la demande remonte dans la file d'attente de MiKL

### AC 5 : Historique des échanges visible

**Given** MiKL a déjà demandé des précisions sur une demande
**When** il consulte cette demande une deuxième fois (Story 7.2)
**Then** l'historique des échanges est visible dans la section "Échanges" :
- Le commentaire de MiKL avec la date : "[date] MiKL a demandé des précisions : {commentaire}"
- La réponse du client (si présente) : "[date] Le client a re-soumis avec : {nouveau contenu}"

**And** MiKL peut à nouveau valider, refuser ou redemander des précisions
**And** les échanges sont affichés en ordre chronologique

### AC 6 : Gestion des erreurs

**Given** une erreur survient pendant l'action
**When** la Server Action échoue
**Then** un message d'erreur clair s'affiche dans un toast : "Erreur lors de l'envoi — veuillez réessayer"
**And** le statut de la demande n'a pas changé
**And** les boutons d'action restent actifs pour retenter
**And** l'erreur est loggée côté serveur avec le format `[VALIDATION-HUB:CLARIFICATION] error message`

## Tasks / Subtasks

### Task 1 : Créer le composant de modale (AC: 1)
- [x] Créer `components/clarification-dialog.tsx`
- [x] Résumé de la demande (titre, client)
- [x] Champ question obligatoire (min 10 caractères)
- [x] Suggestions rapides (3 chips cliquables)
- [x] Validation Zod (min 10 caractères)
- [x] Boutons Envoyer/Annuler
- [x] Écrire test `clarification-dialog.test.tsx`

### Task 2 : Créer la Server Action requestClarification (AC: 2)
- [x] Créer `actions/request-clarification.ts`
- [x] Valider les inputs avec Zod (requestId UUID, comment obligatoire min 10 chars)
- [x] Mettre à jour `validation_requests` (status, reviewer_comment, reviewed_at, updated_at)
- [x] Créer notification client
- [x] Retourner `{ data, error }` format
- [x] Logger les erreurs avec format `[VALIDATION-HUB:CLARIFICATION]`
- [x] Écrire test `request-clarification.test.ts`

### Task 3 : Intégrer la modale dans request-detail (AC: 1)
- [x] Modifier `components/request-detail.tsx`
- [x] Ajouter state pour ouvrir/fermer la modale
- [x] Connecter bouton "Demander des précisions" → `<ClarificationDialog />`
- [x] Passer les props nécessaires (requestId, title, clientName)

### Task 4 : Implémenter la logique de soumission (AC: 2)
- [x] Dans `clarification-dialog.tsx` : appeler `requestClarification(requestId, comment)`
- [x] Utiliser `useTransition` pour gérer l'état pending
- [x] Afficher spinner dans le bouton pendant l'action
- [x] Gérer les erreurs retournées par la Server Action

### Task 5 : Implémenter le feedback utilisateur (AC: 3, 6)
- [x] Toast de succès : "Question envoyée au client"
- [x] Toast d'erreur : "Erreur lors de l'envoi — veuillez réessayer"
- [x] Invalider les caches TanStack Query
- [x] Rediriger vers `/modules/validation-hub` après succès

### Task 6 : Implémenter la re-soumission client (AC: 4)
- [x] Créer Server Action `resubmitRequest(requestId, newContent)` (côté Lab/One)
- [x] Mettre à jour `validation_requests` (content, status='pending', updated_at)
- [x] Créer notification MiKL
- [x] Cette action sera utilisée côté Lab/One (pas dans cette story Hub)
- [x] Documenter l'API dans `docs/flows.md`

### Task 7 : Améliorer la section Échanges (AC: 5)
- [x] Modifier `components/request-exchanges.tsx` (Story 7.2)
- [x] Afficher historique complet des demandes de précisions + re-soumissions
- [x] Format chronologique avec acteur (MiKL/Client), action, date
- [x] Tester l'affichage avec plusieurs allers-retours

### Task 8 : Tests d'intégration (AC: 2-6)
- [x] Test workflow complet clarification (modale → action → notification → redirect)
- [x] Test re-soumission client (côté Lab/One)
- [x] Test notification MiKL après re-soumission
- [x] Test historique échanges avec plusieurs allers-retours
- [x] Test invalidation cache TanStack Query

## Dev Notes

### Contexte Epic 7

Cette story est la **quatrième** de l'Epic 7. Elle permet à MiKL de demander des précisions au client sans bloquer la demande. Le client peut ensuite re-soumettre avec plus d'informations.

**Dépendances** :
- Story 7.1 : Structure du module
- Story 7.2 : Vue détaillée + section Échanges
- Story 7.3 : Pattern modale + Server Action
- Epic 3 : Module notifications

### Architecture : Cycle clarification → re-soumission

**Flux complet** :

```
1. MiKL demande précisions (status='needs_clarification')
   ↓
2. Client reçoit notification
   ↓
3. Client re-soumet avec nouveau contenu (status='pending')
   ↓
4. MiKL reçoit notification
   ↓
5. MiKL consulte la demande mise à jour
   ↓
6. MiKL peut valider, refuser ou redemander précisions
```

**Important** : Ce cycle peut se répéter plusieurs fois. L'historique des échanges doit être visible.

### Références architecture importantes

#### Pattern Server Action (identique Story 7.3)

```typescript
'use server'

export async function requestClarification(
  requestId: string,
  comment: string
): Promise<ActionResponse<ValidationRequest>> {
  // Validation Zod
  const schema = z.object({
    requestId: z.string().uuid(),
    comment: z.string().min(10, 'Le commentaire doit contenir au moins 10 caractères'),
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

  // Update request
  const { data, error } = await supabase
    .from('validation_requests')
    .update({
      status: 'needs_clarification',
      reviewer_comment: comment,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single()

  if (error) {
    console.error('[VALIDATION-HUB:CLARIFICATION] Error:', error)
    return {
      data: null,
      error: {
        message: 'Erreur lors de l\'envoi de la question',
        code: 'DB_ERROR',
      },
    }
  }

  // Create notification for client
  await createValidationNotification({
    clientId: data.client_id,
    type: 'validation',
    title: `MiKL a une question sur '${data.title}'`,
    body: comment,
    link: data.type === 'brief_lab' ? '/modules/parcours-lab' : '/modules/core-dashboard',
  })

  return { data: toCamelCase(data), error: null }
}
```

#### Pattern Suggestions rapides (chips)

```typescript
const QUICK_SUGGESTIONS = [
  'Pouvez-vous détailler le besoin ?',
  'Avez-vous un exemple concret ?',
  'Quel est le budget envisagé ?',
] as const

export function ClarificationDialog({ requestId, title, clientName }: Props) {
  const [comment, setComment] = useState('')

  const handleSuggestionClick = (suggestion: string) => {
    setComment(suggestion)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander des précisions</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Demande : <strong>{title}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Client : <strong>{clientName}</strong>
            </p>

            <div>
              <Label htmlFor="comment">Quelle information vous manque ? *</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Quelle information vous manque ?"
                className={errors.comment ? 'border-red-500' : ''}
              />
              {errors.comment && (
                <p className="text-sm text-red-500 mt-1">{errors.comment.message}</p>
              )}
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Suggestions rapides :</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? 'Envoi en cours...' : 'Envoyer la question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

#### Pattern Historique des échanges (chronologie)

**Source** : Story 7.2 — Section Échanges

```typescript
type Exchange = {
  id: string
  actor: 'mikl' | 'client'
  action: 'clarification_requested' | 'resubmitted' | 'approved' | 'rejected'
  comment: string
  date: string
}

export function RequestExchanges({ exchanges }: { exchanges: Exchange[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des échanges</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {exchanges.map((exchange) => (
            <div key={exchange.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                {exchange.actor === 'mikl' ? (
                  <AvatarFallback>MK</AvatarFallback>
                ) : (
                  <AvatarFallback>CL</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {exchange.actor === 'mikl' ? 'MiKL' : 'Client'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatRelativeDate(exchange.date)}
                  </span>
                </div>
                <p className="text-sm">
                  {getActionLabel(exchange.action)} : {exchange.comment}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function getActionLabel(action: Exchange['action']): string {
  switch (action) {
    case 'clarification_requested':
      return 'a demandé des précisions'
    case 'resubmitted':
      return 'a re-soumis avec'
    case 'approved':
      return 'a validé'
    case 'rejected':
      return 'a refusé'
  }
}
```

### Technical Requirements

#### Stack & Versions (identique Story 7.3)

| Package | Version | Usage |
|---------|---------|-------|
| Next.js | 16.1.1 | Server Actions |
| React | 19.2.3 | UI Components |
| @tanstack/react-query | ^5.90.x | Cache invalidation |
| @supabase/supabase-js | ^2.95.x | Database client |
| react-hook-form | ^7.71.x | Form management |
| zod | Latest | Schema validation |
| @monprojetpro/ui | Internal | Dialog, Button, Textarea |

#### Composants UI disponibles (@monprojetpro/ui)

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
- `Button` : Bouton avec variants et size (sm pour les chips)
- `Textarea` : Champ textarea
- `Label` : Label pour formulaire
- `Avatar`, `AvatarFallback` : Avatar pour les échanges
- `Card`, `CardHeader`, `CardTitle`, `CardContent` : Carte pour historique

### Architecture Compliance

#### Pattern Re-soumission client (côté Lab/One)

**Important** : La re-soumission client se fait **côté Lab/One**, pas dans le Hub. Cette story crée l'API côté Hub, mais l'interface client est dans Epic 6 (Parcours Lab).

**Server Action côté Lab/One** (à documenter) :

```typescript
// packages/modules/parcours-lab/actions/resubmit-brief.ts
'use server'

export async function resubmitBrief(
  requestId: string,
  newContent: string
): Promise<ActionResponse<ValidationRequest>> {
  // Update request
  const { data, error } = await supabase
    .from('validation_requests')
    .update({
      content: newContent,
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single()

  if (error) {
    return {
      data: null,
      error: {
        message: 'Erreur lors de la re-soumission',
        code: 'DB_ERROR',
      },
    }
  }

  // Create notification for operator
  await createNotification({
    userId: data.operator_id,
    type: 'validation',
    title: `Le client a répondu à votre question sur '${data.title}'`,
    link: `/modules/validation-hub/${data.id}`,
  })

  return { data: toCamelCase(data), error: null }
}
```

**Cette action sera créée dans Epic 6** — pas dans cette story.

### Library/Framework Requirements

#### Suggestions rapides (Pattern chips)

**Pattern** : Utiliser des `Button` avec `variant="outline"` et `size="sm"` pour créer des chips cliquables.

```typescript
const QUICK_SUGGESTIONS = [
  'Pouvez-vous détailler le besoin ?',
  'Avez-vous un exemple concret ?',
  'Quel est le budget envisagé ?',
] as const

<div className="flex flex-wrap gap-2">
  {QUICK_SUGGESTIONS.map((suggestion) => (
    <Button
      key={suggestion}
      type="button"
      variant="outline"
      size="sm"
      onClick={() => handleSuggestionClick(suggestion)}
    >
      {suggestion}
    </Button>
  ))}
</div>
```

### File Structure Requirements

#### Module validation-hub (ajout Story 7.4)

```
packages/modules/validation-hub/
├── components/
│   ├── clarification-dialog.tsx     # Story 7.4 ← NOUVEAU
│   ├── clarification-dialog.test.tsx # Story 7.4 ← NOUVEAU
│   └── request-exchanges.tsx        # Story 7.2, amélioré en 7.4
├── actions/
│   ├── request-clarification.ts     # Story 7.4 ← NOUVEAU
│   ├── request-clarification.test.ts # Story 7.4 ← NOUVEAU
│   └── resubmit-request.ts          # Story 7.4 ← NOUVEAU (API Lab/One)
```

#### Module parcours-lab (à créer dans Epic 6)

```
packages/modules/parcours-lab/
├── actions/
│   └── resubmit-brief.ts            # À créer dans Epic 6 (référence Story 7.4)
```

### Testing Requirements

#### Tests à écrire (co-localisés)

| Fichier | Test à écrire | Type |
|---------|---------------|------|
| `clarification-dialog.tsx` | `clarification-dialog.test.tsx` | Component test + validation |
| `request-clarification.ts` | `request-clarification.test.ts` | Server Action test |
| `request-exchanges.tsx` | Améliorer test existant | Component test |

#### Scénarios de test critiques

1. **Test suggestions rapides** : Vérifier que cliquer sur une suggestion remplit le champ
2. **Test validation min 10 caractères** : Vérifier que le bouton est désactivé si < 10 chars
3. **Test workflow complet** : clarification → notification client → re-soumission → notification MiKL
4. **Test historique échanges** : Vérifier affichage chronologique avec plusieurs allers-retours
5. **Test invalidation cache** : Vérifier que les caches sont invalidés après clarification

### Project Structure Notes

#### Alignement avec la structure unifiée

Cette story respecte l'architecture définie dans `architecture/05-project-structure.md` :
- Server Actions dans `actions/`
- Pattern `{ data, error }`
- Validation Zod
- Invalidation cache TanStack Query
- Tests co-localisés

#### Communication inter-dashboards (Hub ↔ Lab/One)

Cette story crée une **communication bidirectionnelle** :
- **Hub → Lab/One** : Notification de demande de précisions
- **Lab/One → Hub** : Re-soumission + notification MiKL

**Mécanisme** : Notifications dans la table `notifications` (Epic 3) + invalidation cache Realtime (Story 7.6).

### References

- [Epic 7 : Validation Hub](_bmad-output/planning-artifacts/epics/epic-7-validation-hub-stories-detaillees.md#story-74)
- [Story 7.1 : Structure du module](7-1-module-validation-hub-structure-types-file-attente-des-demandes.md)
- [Story 7.2 : Vue détaillée + section Échanges](7-2-vue-detaillee-dune-demande-avec-contexte-complet.md)
- [Story 7.3 : Pattern modale + Server Action](7-3-validation-refus-de-demande-avec-commentaire.md)
- [Architecture Platform](../planning-artifacts/architecture/02-platform-architecture.md)
- [Implementation Patterns](../planning-artifacts/architecture/04-implementation-patterns.md)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

Aucun blocage majeur. Pattern identique à RejectDialog (react-hook-form + zod). La re-soumission client (resubmitRequest) est créée comme API Hub — l'interface Lab/One sera dans Epic 6.

### Completion Notes List

- `ClarificationDialog` : Dialog avec react-hook-form + zod (min 10 chars), 3 chips suggestions rapides, useTransition pour le pending state
- `requestClarification` : Server Action qui met à jour status='needs_clarification', crée notification client (non-bloquante)
- `resubmitRequest` : Server Action API (Hub) pour la re-soumission client → status='pending', notification MiKL
- `request-detail.tsx` : Intégration modale + logique exchanges étendue (affichage re-soumission si status=pending+reviewerComment)
- `request-exchanges.tsx` : Test amélioré pour re-soumission multi-échanges
- `docs/flows.md` : Flux clarification → re-soumission documenté
- 30 nouveaux tests (2617 total, 0 échec)
- CR fixes: notification client name (H1), dead code cleanup (M1-M2), resubmit-request.test.ts ajouté (M3), vérification opérateur ajoutée (M4)

### File List

- `packages/modules/validation-hub/components/clarification-dialog.tsx` (NOUVEAU)
- `packages/modules/validation-hub/components/clarification-dialog.test.tsx` (NOUVEAU)
- `packages/modules/validation-hub/actions/request-clarification.ts` (NOUVEAU)
- `packages/modules/validation-hub/actions/request-clarification.test.ts` (NOUVEAU)
- `packages/modules/validation-hub/actions/resubmit-request.ts` (NOUVEAU)
- `packages/modules/validation-hub/components/request-detail.tsx` (MODIFIÉ)
- `packages/modules/validation-hub/components/request-detail.test.tsx` (MODIFIÉ)
- `packages/modules/validation-hub/components/request-exchanges.test.tsx` (MODIFIÉ)
- `packages/modules/validation-hub/docs/flows.md` (MODIFIÉ)
- `packages/modules/validation-hub/index.ts` (MODIFIÉ)
- `packages/modules/validation-hub/actions/resubmit-request.test.ts` (NOUVEAU — CR fix M3)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIÉ)
