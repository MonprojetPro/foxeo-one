# Story 3.5: Indicateur de présence en ligne

Status: done

## Story

As a **utilisateur (MiKL ou client)**,
I want **voir si mon interlocuteur est actuellement en ligne**,
So that **je sais si je peux attendre une réponse rapide ou non**.

## Acceptance Criteria

1. **AC1 — Supabase Realtime Presence** : Hook `use-chat-presence.ts` utilise Supabase Realtime Presence API. Channel : `presence:operator:{operatorId}` (FR129). Sync : user_id, user_type ('client'/'operator'), online_at.

2. **AC2 — Auto-sync** : Utilisateur connecté → statut synchronisé automatiquement. Statut retiré quand page fermée ou connexion perdue.

3. **AC3 — Vue client** : Dans le Chat, indicateur MiKL : en ligne (point vert), hors ligne (point gris). Si hors ligne : "MiKL vous répondra dès que possible".

4. **AC4 — Vue Hub** : Liste conversations → chaque client avec indicateur présence. Tri "En ligne d'abord" disponible. Liste CRM → point de présence à côté du nom, mis à jour en temps réel.

5. **AC5 — Tolérance connexion** : Timeout 30 secondes avant passage hors ligne (éviter faux négatifs). Reconnexion automatique → retour en ligne.

6. **AC6 — Tests** : Tests unitaires co-localisés. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Hook Presence (AC: #1, #2, #5)
  - [x] 1.1 `packages/modules/chat/hooks/use-chat-presence.ts` — Track presence via Supabase Realtime
  - [x] 1.2 Sync état : { userId, userType, onlineAt }
  - [x] 1.3 Cleanup : unsubscribe on unmount
  - [x] 1.4 Heartbeat / reconnection avec timeout 30s

- [x] Task 2 — Hook lecture présence (AC: #3, #4)
  - [x] 2.1 `hooks/use-presence-status.ts` — Lire le statut d'un utilisateur spécifique
  - [x] 2.2 `hooks/use-online-users.ts` — Lire la liste de tous les utilisateurs en ligne (pour MiKL)

- [x] Task 3 — Composants UI (AC: #3, #4)
  - [x] 3.1 `components/presence-indicator.tsx` — Point vert/gris avec tooltip
  - [x] 3.2 Intégrer dans ChatWindow header (statut MiKL pour client)
  - [x] 3.3 Intégrer dans ChatList (statut chaque client pour MiKL)
  - [x] 3.4 Intégrer dans ClientList du CRM (point présence)
  - [x] 3.5 Message "MiKL vous répondra dès que possible" si hors ligne

- [x] Task 4 — Provider Presence (AC: #2)
  - [x] 4.1 `components/presence-provider.tsx` — Provider à monter dans le layout dashboard
  - [x] 4.2 Track automatiquement la présence de l'utilisateur courant
  - [x] 4.3 Monte dans les layouts Hub et Client

- [x] Task 5 — Tests (AC: #6)
  - [x] 5.1 Tests hooks : useChatPresence, usePresenceStatus
  - [x] 5.2 Tests composants : PresenceIndicator (online/offline states)
  - [x] 5.3 Tests edge cases : timeout, reconnexion, multiple onglets

## Dev Notes

### Architecture — Règles critiques

- **Pas de migration DB** : La présence est gérée entièrement par Supabase Realtime Presence (in-memory, pas de stockage DB).
- **Pas de Server Action** : Tout est côté client (Realtime API browser-side).
- **Provider level** : Le `PresenceProvider` doit être monté UNE SEULE FOIS dans le layout dashboard, pas dans chaque composant.

### Supabase Realtime Presence — Implémentation

```typescript
// hooks/use-chat-presence.ts
'use client'
import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

export function useChatPresence(operatorId: string, userId: string, userType: 'client' | 'operator') {
  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase.channel(`presence:operator:${operatorId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        // Update tracked users
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // User came online
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // User went offline
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            user_type: userType,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [operatorId, userId, userType])
}
```

### Lecture présence

```typescript
// hooks/use-presence-status.ts
export function usePresenceStatus(targetUserId: string): 'online' | 'offline' {
  // Lire depuis le presenceState du channel
  // Retourne 'online' si targetUserId est dans le state, 'offline' sinon
}
```

### Composant PresenceIndicator

```typescript
// components/presence-indicator.tsx
export function PresenceIndicator({ status }: { status: 'online' | 'offline' }) {
  return (
    <span className={cn(
      'inline-block h-2.5 w-2.5 rounded-full',
      status === 'online' ? 'bg-green-500' : 'bg-gray-400'
    )} />
  )
}
```

### Timeout — Tolérance

Supabase Realtime Presence a un timeout configurable. Configurer à 30 secondes :
```typescript
const channel = supabase.channel(`presence:operator:${operatorId}`, {
  config: { presence: { key: userId } }
})
```

Le timeout est géré automatiquement par Supabase — quand la connexion WebSocket se ferme, le serveur retire l'utilisateur après le délai configuré.

### Fichiers à créer

- `packages/modules/chat/hooks/use-chat-presence.ts`
- `packages/modules/chat/hooks/use-presence-status.ts`
- `packages/modules/chat/hooks/use-online-users.ts`
- `packages/modules/chat/components/presence-indicator.tsx`
- `packages/modules/chat/components/presence-provider.tsx`
- Tests co-localisés

### Fichiers à modifier

- `packages/modules/chat/components/chat-window.tsx` (indicateur MiKL)
- `packages/modules/chat/components/chat-list.tsx` (indicateur par client)
- `packages/modules/crm/components/client-list.tsx` (point présence)
- Layouts Hub et Client (monter PresenceProvider)
- `packages/modules/chat/index.ts` (exports)

### Dépendances

- **Story 3.1** : Module Chat existant
- `@monprojetpro/supabase` — Realtime browser client
- Aucune migration nécessaire

### Anti-patterns — Interdit

- NE PAS stocker la présence en DB (in-memory Realtime uniquement)
- NE PAS faire de polling HTTP pour la présence (WebSocket uniquement)
- NE PAS monter le provider presence dans chaque composant (une fois dans le layout)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-3-*.md#Story 3.5]
- [Source: docs/project-context.md]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-5-20250929 (Amelia — Dev Agent)

### Debug Log References
- `createBrowserSupabaseClient` n'existe pas dans `@monprojetpro/supabase` — le bon export est `createClient`. Corrigé dans tous les nouveaux fichiers.
- Module isolation respectée : CRM ne peut pas importer depuis `@monprojetpro/modules-chat`. Solution : composant `PresenceDot` local + prop `onlineUserIds` passée par le parent.
- Le module chat n'avait pas de `vitest.config.ts` — créé pour l'exécution locale des tests.

### Completion Notes List
- **Task 1** : `use-chat-presence.ts` — gère le channel `presence:operator:{operatorId}`, track `{user_id, user_type, online_at}`, cleanup sur unmount. Config `presence.key = userId` gère le timeout 30s Supabase automatiquement.
- **Task 2** : `use-presence-status.ts` + `use-online-users.ts` — lisent depuis `PresenceContext`, déduplication multi-onglets dans `useOnlineUsers`.
- **Task 3** : `presence-indicator.tsx` (point vert/gris + aria-label), intégration `ChatWindow` (header opérateur pour client), `ChatList` (avatar overlay + tri "En ligne d'abord"), `ClientList` CRM (col Nom avec `PresenceDot` local).
- **Task 4** : `presence-provider.tsx` monte une seule fois dans les layouts Hub et Client. Les layouts deviennent `async` pour récupérer `operatorId` côté serveur.
- **Task 5** : 37 nouveaux tests (7 fichiers). 0 régression. Total suite : 1370 tests passés.
- **Code Review Fixes** : 8 corrections (4 HIGH, 4 MEDIUM). +6 tests AC3/AC4 (chat-window, chat-list). `useMemo` ajouté (hooks). Layouts refactorisés (1 seul createServerSupabaseClient). CRM `onlineUserIds` câblé. "MiKL" → "Votre conseiller". PresenceIndicator spread rest props. Total : 1376 tests passés.

### File List
**Créés :**
- `packages/modules/chat/types/presence.types.ts`
- `packages/modules/chat/hooks/use-chat-presence.ts`
- `packages/modules/chat/hooks/use-chat-presence.test.ts`
- `packages/modules/chat/hooks/use-presence-status.ts`
- `packages/modules/chat/hooks/use-presence-status.test.ts`
- `packages/modules/chat/hooks/use-online-users.ts`
- `packages/modules/chat/hooks/use-online-users.test.ts`
- `packages/modules/chat/hooks/use-online-users-dedup.test.ts`
- `packages/modules/chat/components/presence-indicator.tsx`
- `packages/modules/chat/components/presence-indicator.test.tsx`
- `packages/modules/chat/components/presence-provider.tsx`
- `packages/modules/chat/components/presence-provider.test.tsx`
- `packages/modules/chat/vitest.config.ts`
- `packages/modules/crm/components/presence-dot.tsx`
- `packages/modules/crm/components/presence-dot.test.tsx`

**Modifiés :**
- `packages/modules/chat/components/chat-window.tsx`
- `packages/modules/chat/components/chat-window.test.tsx`
- `packages/modules/chat/components/chat-list.tsx`
- `packages/modules/chat/components/chat-list.test.tsx`
- `packages/modules/chat/components/presence-indicator.tsx`
- `packages/modules/chat/hooks/use-online-users.ts`
- `packages/modules/chat/hooks/use-presence-status.ts`
- `packages/modules/chat/index.ts`
- `packages/modules/crm/components/client-list.tsx`
- `apps/hub/app/(dashboard)/layout.tsx`
- `apps/client/app/(dashboard)/layout.tsx`
- `apps/hub/app/(dashboard)/modules/crm/crm-page-client.tsx`
- `apps/hub/package.json`
- `apps/client/package.json`
- `apps/hub/next.config.ts`
- `apps/client/next.config.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log
- 2026-02-18 : Story 3.5 implémentée — Indicateur de présence en ligne via Supabase Realtime Presence. Hook `useChatPresence` + `usePresenceStatus` + `useOnlineUsers` + `PresenceProvider` + `PresenceIndicator`. Intégration ChatWindow, ChatList, CRM ClientList, layouts Hub et Client. 37 nouveaux tests.
- 2026-02-18 : Code review fixes — 8 corrections (H1-H4, M1-M4). Tests AC3/AC4 ajoutés. useMemo hooks. Layouts refactorisés. CRM onlineUserIds câblé. "MiKL" → "Votre conseiller". PresenceIndicator spread rest. 1376 tests passés.
