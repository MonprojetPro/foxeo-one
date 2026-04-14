# Flux Utilisateur — Validation Hub

## Flux principal : Consultation de la file d'attente

```
MiKL ouvre le Hub
    │
    ▼
Sidebar → clic "Validation Hub"
    │
    ▼
Route: /modules/validation-hub
    │
    ├── Loading: skeleton (loading.tsx)
    │
    ▼
Page chargée: <ValidationQueue />
    │
    ├── useValidationQueue() → TanStack Query → getValidationRequests()
    │       │
    │       └── Supabase: validation_requests JOIN clients
    │               Filtré par operator_id (RLS)
    │
    ▼
Affichage:
    ├── Si requests.length === 0 → EmptyState ("Aucune demande en attente")
    └── Si requests.length > 0 → Liste de ValidationCard
            │
            └── Tri: pending en premier, puis submitted_at ASC
```

## Flux : Filtrage

```
MiKL change un filtre (statut, type, tri)
    │
    ▼
setFilters({ status: 'pending' })
    │
    ▼
État local React mis à jour
    │
    ▼
TanStack Query re-fetch (queryKey change: ['validation-requests', filters])
    │
    ▼
Affichage mis à jour avec nouvelles données
```

## Flux : Navigation vers le détail

```
MiKL clique sur une carte de demande
    │
    ▼
onClick() → router.push('/modules/validation-hub/{requestId}')
    │
    ▼
Route: /modules/validation-hub/[requestId]
    │
    └── Story 7.2 (à implémenter)
```

## Flux : Cycle de vie d'une demande

```
Client soumet un brief (Story 6.3/6.5)
    │
    ▼
validation_requests.status = 'pending'
    │
    ▼
MiKL voit la demande dans la file d'attente
    │
    ├── Story 7.3: Valider → status = 'approved'
    ├── Story 7.3: Refuser → status = 'rejected' + reviewer_comment
    └── Story 7.4: Précisions → status = 'needs_clarification'
                │
                └── Client répond
                        │
                        └── MiKL re-traite la demande
```

## Types de demandes

| Type | Source | Cible |
|------|--------|-------|
| `brief_lab` | Élio Lab (Story 6.5) | Validation Hub Hub |
| `evolution_one` | Élio One+ (Story 8.8) | Validation Hub Hub |

## Statuts et transitions

```
pending ──→ approved
        ──→ rejected
        ──→ needs_clarification ──→ pending (après réponse client)
```

## Flux : Demande de précisions (Story 7.4)

```
MiKL clique "Demander des précisions"
    │
    ▼
ClarificationDialog s'ouvre (modale @monprojetpro/ui Dialog)
    │   - Résumé demande (titre + client)
    │   - Champ question obligatoire (min 10 chars)
    │   - 3 suggestions rapides (chips Button outline sm)
    │
    ▼
MiKL soumet sa question
    │
    ▼
Server Action: requestClarification(requestId, comment)
    │   Chemin: packages/modules/validation-hub/actions/request-clarification.ts
    │   1. Validation Zod (UUID + min 10 chars)
    │   2. validation_requests.status → 'needs_clarification'
    │   3. validation_requests.reviewer_comment → commentaire
    │   4. validation_requests.reviewed_at → NOW()
    │   5. Notification client: type='validation', link='/modules/parcours-lab' (brief_lab)
    │
    ▼
Toast succès: "Question envoyée au client"
    │
    ├── Invalidation cache: ['validation-requests'] + ['validation-request', requestId]
    └── Redirect: /modules/validation-hub
```

## Flux : Re-soumission client (Story 7.4 — API côté Lab/One)

```
Client reçoit notification "MiKL a une question sur '{titre}'"
    │
    ▼
Client modifie son contenu (interface Lab/One — Epic 6)
    │
    ▼
Server Action: resubmitRequest(requestId, newContent)
    │   Chemin: packages/modules/validation-hub/actions/resubmit-request.ts
    │   1. Validation Zod (UUID + contenu non vide)
    │   2. validation_requests.content → nouveau contenu
    │   3. validation_requests.status → 'pending'
    │   4. validation_requests.updated_at → NOW()
    │   5. Notification MiKL: type='validation', link='/modules/validation-hub/{requestId}'
    │
    ▼
MiKL reçoit notification
    │
    └── La demande remonte dans la file d'attente
```

## Historique des échanges (AC 5)

La section "Échanges" dans la vue détaillée affiche les allers-retours :

- `reviewer_comment` présent + `status === 'needs_clarification'` :
  → "MiKL a demandé des précisions : {comment}" (date = reviewed_at)

- `reviewer_comment` présent + `status === 'pending'` (client a re-soumis) :
  → "MiKL a demandé des précisions : {comment}" (date = reviewed_at)
  → "Client a re-soumis avec : {content}" (date = updated_at)

Ce cycle peut se répéter : MiKL redemande → client re-soumet → etc.

## Flux Realtime (Story 7.6)

### Canal Supabase Realtime

```
Canal : validation-requests-operator-{operatorId}
Table : validation_requests
Filtre : operator_id=eq.{operatorId}
Événements : INSERT, UPDATE
```

### Flux : Nouvelle demande (INSERT)

```
Client soumet un brief (Lab/One)
    │
    ▼
INSERT dans validation_requests
    │
    ▼
Supabase Realtime → useValidationRealtime (INSERT handler)
    │
    ├── queryClient.invalidateQueries(['validation-requests'])
    ├── queryClient.invalidateQueries(['validation-badge', operatorId])
    └── showInfo("Nouvelle demande : {titre}")
            │
            ▼
    TanStack Query refetch automatique
            │
            ▼
    Liste mise à jour sans rechargement de page
```

### Flux : Mise à jour de demande (UPDATE)

```
Status change (approbation, refus, re-soumission...)
    │
    ▼
UPDATE dans validation_requests
    │
    ▼
Supabase Realtime → useValidationRealtime (UPDATE handler)
    │
    ├── queryClient.invalidateQueries(['validation-requests'])
    ├── queryClient.invalidateQueries(['validation-request', requestId])
    ├── queryClient.invalidateQueries(['validation-badge', operatorId])
    └── Si needs_clarification → pending :
            showInfo("Un client a répondu à vos précisions")
```

### Flux : Badge sidebar (AC4)

```
useValidationBadge(operatorId)
    │
    ├── TanStack Query → Supabase COUNT(*) WHERE status='pending'
    ├── staleTime: 10s
    └── refetchInterval: 30s (fallback)
            │
            ▼
    HubSidebarClient → Badge rouge si pendingCount > 0
    Badge disparaît quand pendingCount === 0
```

### Flux : Reconnexion (AC6)

```
Connexion perdue (offline)
    │
    ▼
Supabase Realtime gère automatiquement la reconnexion
    │
window 'online' event → handleReconnect()
    │
    ├── queryClient.invalidateQueries(['validation-requests'])
    ├── queryClient.invalidateQueries(['validation-badge', operatorId])
    └── showInfo("Connexion rétablie — données à jour")
```

### Flux : Cleanup (AC7)

```
Navigation vers une autre page
    │
    ▼
useEffect cleanup
    │
    ├── supabase.removeChannel(channel)  ← fin de l'abonnement
    └── window.removeEventListener('online', handleReconnect)
```
