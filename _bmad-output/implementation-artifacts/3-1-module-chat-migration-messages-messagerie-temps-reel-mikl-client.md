# Story 3.1: Module Chat — Migration messages & messagerie temps réel MiKL-client

Status: review

## Story

As a **client MonprojetPro (Lab ou One)**,
I want **échanger avec MiKL via un chat asynchrone en temps réel depuis mon dashboard**,
So that **je peux poser mes questions et recevoir des réponses directes de MiKL sans délai**.

## Acceptance Criteria

1. **AC1 — Migration DB** : Table `messages` créée avec : id (UUID PK), client_id (FK clients NOT NULL), operator_id (FK operators NOT NULL), sender_type (TEXT CHECK IN ('client', 'operator') NOT NULL), content (TEXT NOT NULL), read_at (TIMESTAMP nullable), created_at. Index `idx_messages_client_id_created_at`. RLS policies : `messages_select_owner` (client ne voit que ses messages), `messages_select_operator` (opérateur voit messages de ses clients), `messages_insert_authenticated`. Test RLS `message-isolation.test.ts` : client A ne voit pas messages client B.

2. **AC2 — Module Chat structure** : Module `packages/modules/chat/` structuré selon le pattern standard. Manifest id: `chat`, targets: `['hub', 'client-lab', 'client-one']`, requiredTables: `['messages']`. Composants: chat-window, chat-message, chat-input, chat-list. Hook: use-chat-messages. Action: send-message. Types: chat.types.ts.

3. **AC3 — Vue client** : Historique messages MiKL-client ordonné chronologiquement. TanStack Query queryKey `['messages', clientId]`. Skeleton loader. Messages client alignés à droite, MiKL à gauche. Chaque message : contenu, heure, indicateur lu/non lu.

4. **AC4 — Envoi message** : Server Action `sendMessage()` crée message avec sender_type. Pattern `{ data, error }`. Optimistic update TanStack Query. Réponse < 500ms (NFR-P2).

5. **AC5 — Vue Hub (MiKL)** : Liste des conversations (chat-list.tsx) avec tous les clients : dernier message, date, indicateur non lu. Conversation sélectionnée → fenêtre chat. MiKL envoie avec sender_type='operator'.

6. **AC6 — Temps réel** : Nouveau message apparaît en temps réel via Supabase Realtime (channel: `chat:room:{clientId}`). Realtime invalide cache TanStack Query `['messages', clientId]`. Message visible < 2 secondes (NFR-P5). Badge messages non lus dans sidebar Hub.

7. **AC7 — Tests** : Tests unitaires co-localisés. Test RLS isolation messages. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Migration Supabase (AC: #1)
  - [x] 1.1 Créer migration `00022_create_messages.sql`
  - [x] 1.2 Table `messages` avec tous les champs
  - [x] 1.3 Index `idx_messages_client_id_created_at`
  - [x] 1.4 RLS policies : select_owner, select_operator, insert_authenticated
  - [x] 1.5 Trigger Supabase Realtime (publication sur la table messages)

- [x] Task 2 — Module Chat scaffold (AC: #2)
  - [x] 2.1 Créer `packages/modules/chat/manifest.ts`
  - [x] 2.2 Créer `packages/modules/chat/index.ts`
  - [x] 2.3 Créer `packages/modules/chat/types/chat.types.ts`
  - [x] 2.4 Créer `packages/modules/chat/package.json`, `tsconfig.json`
  - [x] 2.5 Créer `packages/modules/chat/docs/guide.md`, `faq.md`, `flows.md`

- [x] Task 3 — Server Actions (AC: #4)
  - [x] 3.1 `actions/send-message.ts` — Insert message avec sender_type
  - [x] 3.2 `actions/get-messages.ts` — Récupérer messages d'une conversation, ordonnés ASC
  - [x] 3.3 `actions/get-conversations.ts` — Liste conversations pour MiKL (dernier message, non lu count)
  - [x] 3.4 `actions/mark-messages-read.ts` — Marquer messages comme lus (set read_at)

- [x] Task 4 — Hooks TanStack Query (AC: #3, #5, #6)
  - [x] 4.1 `hooks/use-chat-messages.ts` — queryKey `['messages', clientId]`, optimistic update sur send
  - [x] 4.2 `hooks/use-conversations.ts` — queryKey `['conversations']` (pour Hub MiKL)
  - [x] 4.3 `hooks/use-chat-realtime.ts` — Supabase Realtime subscription → `queryClient.invalidateQueries()`

- [x] Task 5 — Composants UI (AC: #3, #5)
  - [x] 5.1 `components/chat-window.tsx` — Fenêtre chat : liste messages + input + scroll auto
  - [x] 5.2 `components/chat-message.tsx` — Bulle message (gauche/droite selon sender, heure, lu/non lu)
  - [x] 5.3 `components/chat-input.tsx` — Champ saisie + bouton envoyer (Enter pour envoyer)
  - [x] 5.4 `components/chat-list.tsx` — Liste conversations MiKL : avatar, nom client, dernier msg, badge non lu
  - [x] 5.5 `components/chat-skeleton.tsx` — Skeleton loader pour fenêtre chat
  - [x] 5.6 `components/unread-badge.tsx` — Badge compteur non lus pour sidebar

- [x] Task 6 — Routes (AC: #3, #5)
  - [x] 6.1 Hub : `apps/hub/app/(dashboard)/modules/chat/page.tsx` — Layout deux colonnes (liste + fenêtre)
  - [x] 6.2 Hub : `apps/hub/app/(dashboard)/modules/chat/[clientId]/page.tsx` — Conversation spécifique
  - [x] 6.3 Client : `apps/client/app/(dashboard)/modules/chat/page.tsx` — Fenêtre chat unique (1 seul interlocuteur)
  - [x] 6.4 Loading.tsx et error.tsx pour chaque route

- [x] Task 7 — Realtime (AC: #6)
  - [x] 7.1 Setup Supabase Realtime channel `chat:room:{clientId}` dans `use-chat-realtime.ts`
  - [x] 7.2 On `INSERT` → invalidateQueries `['messages', clientId]`
  - [x] 7.3 On `UPDATE` (read_at) → invalidateQueries `['messages', clientId]`
  - [x] 7.4 Badge non lus dans sidebar Hub, invalidé en realtime

- [x] Task 8 — Tests (AC: #7)
  - [x] 8.1 Tests Server Actions : sendMessage, getMessages, markMessagesRead
  - [x] 8.2 Tests composants : ChatWindow, ChatMessage, ChatInput, ChatList
  - [x] 8.3 Tests hooks : useChatMessages, useConversations
  - [x] 8.4 Tests RLS : client A ne voit pas messages client B
  - [x] 8.5 Tests optimistic update : message visible immédiatement avant confirmation serveur

## Dev Notes

### Architecture — Règles critiques

- **NOUVEAU MODULE** : `packages/modules/chat/` — premier fichier à créer = `manifest.ts`
- **Targets multiples** : Ce module fonctionne dans Hub ET Client (Lab/One). Les composants doivent supporter les deux contextes.
- **Realtime** : `Supabase Realtime → invalidateQueries()` — JAMAIS de sync manuelle ou state local.
- **Optimistic update** : Utiliser `queryClient.setQueryData()` pour afficher le message immédiatement, puis `invalidateQueries()` quand le Realtime confirme.
- **Response format** : `{ data, error }` — JAMAIS throw.
- **Logging** : `[CHAT:SEND_MESSAGE]`, `[CHAT:GET_MESSAGES]`, `[CHAT:MARK_READ]`

### Base de données

**Migration `00022`** :
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'operator')),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_client_id_created_at ON messages(client_id, created_at);
CREATE INDEX idx_messages_operator_id ON messages(operator_id);

-- Activer Realtime sur la table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

**RLS policies** :
```sql
-- Client ne voit que ses propres messages
CREATE POLICY messages_select_owner ON messages FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));

-- Opérateur voit messages de ses clients
CREATE POLICY messages_select_operator ON messages FOR SELECT
  USING (operator_id = auth.uid() OR operator_id IN (SELECT id FROM operators WHERE auth_user_id = auth.uid()));

-- Authentifié peut insérer
CREATE POLICY messages_insert_authenticated ON messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

**Note** : Pas de `updated_at` sur `messages` — les messages sont immuables (append-only), seul `read_at` est modifiable.

### Supabase Realtime — Pattern

```typescript
// hooks/use-chat-realtime.ts
'use client'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

export function useChatRealtime(clientId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel(`chat:room:${clientId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `client_id=eq.${clientId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', clientId] })
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clientId, queryClient])
}
```

### Optimistic update — Pattern

```typescript
// Dans useChatMessages, mutation pour envoyer
const sendMutation = useMutation({
  mutationFn: sendMessage,
  onMutate: async (newMessage) => {
    await queryClient.cancelQueries({ queryKey: ['messages', clientId] })
    const previous = queryClient.getQueryData(['messages', clientId])
    queryClient.setQueryData(['messages', clientId], (old: Message[]) => [
      ...old,
      { ...newMessage, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    ])
    return { previous }
  },
  onError: (err, _, context) => {
    queryClient.setQueryData(['messages', clientId], context?.previous)
  },
  // onSettled non nécessaire : le Realtime fera l'invalidation
})
```

### Layout Hub — Deux colonnes

```
┌─────────────────────────────────────┐
│  Conversations  │  Chat Window      │
│  ┌───────────┐  │  ┌─────────────┐  │
│  │ Client A  │  │  │ Messages    │  │
│  │ Client B ◀│  │  │ ...         │  │
│  │ Client C  │  │  │ ...         │  │
│  └───────────┘  │  ├─────────────┤  │
│                 │  │ [Input___]  │  │
│                 │  └─────────────┘  │
└─────────────────────────────────────┘
```

### Layout Client — Fenêtre unique

Le client n'a qu'un seul interlocuteur (MiKL), donc pas de liste de conversations. Juste la fenêtre chat directe.

### Composants shadcn/ui

- `<ScrollArea>` pour la liste de messages (scroll auto en bas)
- `<Avatar>` pour les participants
- `<Input>` ou `<Textarea>` pour la saisie (Enter envoie, Shift+Enter nouvelle ligne)
- `<Badge>` pour compteur non lus
- Skeleton loader custom pour bulles chat

### Module manifest

```typescript
export const manifest: ModuleManifest = {
  id: 'chat',
  name: 'Chat',
  description: 'Messagerie temps réel MiKL-client',
  version: '1.0.0',
  targets: ['hub', 'client-lab', 'client-one'],
  navigation: { label: 'Chat', icon: 'message-circle', position: 20 },
  routes: [
    { path: '/modules/chat', component: 'ChatPage' },
    { path: '/modules/chat/:clientId', component: 'ChatConversation' },
  ],
  requiredTables: ['messages'],
  dependencies: []
}
```

### Fichiers à créer

**Module structure :**
```
packages/modules/chat/
├── manifest.ts
├── index.ts
├── package.json
├── tsconfig.json
├── docs/guide.md, faq.md, flows.md
├── types/chat.types.ts
├── actions/send-message.ts, get-messages.ts, get-conversations.ts, mark-messages-read.ts
├── hooks/use-chat-messages.ts, use-conversations.ts, use-chat-realtime.ts
└── components/chat-window.tsx, chat-message.tsx, chat-input.tsx, chat-list.tsx, chat-skeleton.tsx, unread-badge.tsx
```

**Routes :**
- `apps/hub/app/(dashboard)/modules/chat/page.tsx`
- `apps/hub/app/(dashboard)/modules/chat/[clientId]/page.tsx`
- `apps/client/app/(dashboard)/modules/chat/page.tsx`

**Migration :**
- `supabase/migrations/00022_create_messages.sql`

### Dépendances

- Table `clients` (migration 00002) — FK
- Table `operators` (migration 00001) — FK
- `@monprojetpro/supabase` — createServerSupabaseClient, createBrowserSupabaseClient
- `@tanstack/react-query` — cache + optimistic updates
- Module registry pour auto-découverte

### Anti-patterns — Interdit

- NE PAS stocker les messages dans Zustand (TanStack Query + Realtime uniquement)
- NE PAS faire de sync manuelle Realtime→state (toujours invalidateQueries)
- NE PAS créer d'API Route pour envoyer des messages (Server Action)
- NE PAS throw dans les Server Actions
- NE PAS faire de polling pour les nouveaux messages (Realtime uniquement)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-3-*.md#Story 3.1]
- [Source: docs/project-context.md]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

- Fix mock chain `get-messages.test.ts` : `.eq().order()` vs `.eq().eq().order()` — suppression du deuxième `.eq()` inutile
- Fix tests composants : remplacement de `vi.mocked(await import(...))` dans les `it()` par des mocks `vi.fn()` déclarés au niveau module
- `Avatar` et `ScrollArea` absents de `@monprojetpro/ui` — ajout des composants shadcn + deps radix (`@radix-ui/react-avatar`, `@radix-ui/react-scroll-area`)

### Completion Notes List

- ✅ Task 1 — Migration `00022_create_messages.sql` créée avec table, index, 4 RLS policies (select_owner, select_operator, insert_authenticated, update_operator) et publication Realtime
- ✅ Task 2 — Module chat scaffoldé : manifest.ts, index.ts, types, package.json, tsconfig.json, docs (guide/faq/flows)
- ✅ Task 3 — 4 Server Actions : sendMessage, getMessages, getConversations, markMessagesRead — pattern `{ data, error }`, jamais de throw
- ✅ Task 4 — 3 hooks TanStack Query : useChatMessages (avec optimistic update), useConversations, useChatRealtime
- ✅ Task 5 — 6 composants : ChatWindow, ChatMessage, ChatInput, ChatList, ChatSkeleton, UnreadBadge
- ✅ Task 6 — Routes Hub (`/modules/chat` + `/modules/chat/[clientId]`) et Client (`/modules/chat`) avec loading.tsx et error.tsx
- ✅ Task 7 — Realtime : channel `chat:room:{clientId}`, INSERT+UPDATE → invalidateQueries(['messages', clientId]) + invalidateQueries(['conversations'])
- ✅ Task 8 — 50 tests unitaires, 0 régression sur 1187 tests totaux. Tests RLS `message-isolation.test.ts` créés.
- ✅ Composants `Avatar` et `ScrollArea` ajoutés à `@monprojetpro/ui` (shadcn pattern, Radix primitives)

### File List

**Nouveau — Migration**
- `supabase/migrations/00022_create_messages.sql`

**Nouveau — Module Chat**
- `packages/modules/chat/manifest.ts`
- `packages/modules/chat/index.ts`
- `packages/modules/chat/package.json`
- `packages/modules/chat/tsconfig.json`
- `packages/modules/chat/types/chat.types.ts`
- `packages/modules/chat/docs/guide.md`
- `packages/modules/chat/docs/faq.md`
- `packages/modules/chat/docs/flows.md`
- `packages/modules/chat/actions/send-message.ts`
- `packages/modules/chat/actions/send-message.test.ts`
- `packages/modules/chat/actions/get-messages.ts`
- `packages/modules/chat/actions/get-messages.test.ts`
- `packages/modules/chat/actions/get-conversations.ts`
- `packages/modules/chat/actions/mark-messages-read.ts`
- `packages/modules/chat/actions/mark-messages-read.test.ts`
- `packages/modules/chat/hooks/use-chat-messages.ts`
- `packages/modules/chat/hooks/use-chat-messages.test.ts`
- `packages/modules/chat/hooks/use-conversations.ts`
- `packages/modules/chat/hooks/use-conversations.test.ts`
- `packages/modules/chat/hooks/use-chat-realtime.ts`
- `packages/modules/chat/components/chat-window.tsx`
- `packages/modules/chat/components/chat-window.test.tsx`
- `packages/modules/chat/components/chat-message.tsx`
- `packages/modules/chat/components/chat-message.test.tsx`
- `packages/modules/chat/components/chat-input.tsx`
- `packages/modules/chat/components/chat-input.test.tsx`
- `packages/modules/chat/components/chat-list.tsx`
- `packages/modules/chat/components/chat-list.test.tsx`
- `packages/modules/chat/components/chat-skeleton.tsx`
- `packages/modules/chat/components/unread-badge.tsx`

**Nouveau — Routes Hub**
- `apps/hub/app/(dashboard)/modules/chat/page.tsx`
- `apps/hub/app/(dashboard)/modules/chat/chat-page-client.tsx`
- `apps/hub/app/(dashboard)/modules/chat/loading.tsx`
- `apps/hub/app/(dashboard)/modules/chat/error.tsx`
- `apps/hub/app/(dashboard)/modules/chat/[clientId]/page.tsx`
- `apps/hub/app/(dashboard)/modules/chat/[clientId]/chat-conversation-client.tsx`
- `apps/hub/app/(dashboard)/modules/chat/[clientId]/loading.tsx`
- `apps/hub/app/(dashboard)/modules/chat/[clientId]/error.tsx`

**Nouveau — Routes Client**
- `apps/client/app/(dashboard)/modules/chat/page.tsx`
- `apps/client/app/(dashboard)/modules/chat/chat-client-page-client.tsx`
- `apps/client/app/(dashboard)/modules/chat/loading.tsx`
- `apps/client/app/(dashboard)/modules/chat/error.tsx`

**Nouveau — Tests RLS**
- `tests/rls/message-isolation.test.ts`

**Modifié — @monprojetpro/ui (ajout composants)**
- `packages/ui/src/avatar.tsx`
- `packages/ui/src/scroll-area.tsx`
- `packages/ui/src/index.ts`
- `packages/ui/package.json`

## Change Log

- 2026-02-17 — Story 3.1 implémentée : module chat complet avec migration DB, Server Actions, hooks TanStack Query, composants UI, routes Hub+Client, Realtime, 50 tests unitaires
