# Story 8.2: Conversations Élio — Liste, commutation & historique persistant complet

Status: done

## Story

As a **utilisateur (MiKL ou client)**,
I want **voir la liste de mes conversations Élio, en démarrer de nouvelles sans perdre les anciennes, et retrouver tout l'historique**,
So that **je peux revenir sur des échanges précédents et organiser mes conversations par sujet**.

## Acceptance Criteria

### AC1 : Historique des conversations Élio persistant (FR123)

**Given** l'historique des conversations Élio est stocké dans `elio_conversations` + `elio_messages` (Story 6.4)
**When** un utilisateur ouvre le module Élio
**Then** ses conversations précédentes sont disponibles et persistantes entre sessions :

- Les conversations sont fetchées via TanStack Query avec `queryKey: ['elio-conversations', userId, dashboardType]`
- L'historique complet des messages est chargé à la demande (lazy loading par conversation)
- Les conversations sont triées par date de dernière activité (la plus récente en haut)

**And** la conversation la plus récente est ouverte par defaut

### AC2 : Liste des conversations avec sidebar/drawer (FR123)

**Given** l'utilisateur veut voir ses conversations
**When** il ouvre le panneau de conversations
**Then** une liste latérale (sidebar ou drawer mobile) affiche :

- Chaque conversation avec :
  - Titre (auto-généré ou éditable)
  - Date de dernier message (format relatif : "il y a 2h", "hier")
  - Aperçu du dernier message (30 caractères max)
- La conversation active est surlignée
- Un bouton "Nouvelle conversation" en haut de la liste

**And** sur mobile (< 768px), la liste s'affiche en plein écran avec retour au chat au clic
**And** sur desktop, la liste est un panneau latéral collapsible

### AC3 : Nouvelle conversation (FR124)

**Given** l'utilisateur clique sur "Nouvelle conversation"
**When** la Server Action `newConversation(userId, dashboardType)` s'exécute
**Then** :

1. Une nouvelle entrée est créée dans `elio_conversations` avec `title='Nouvelle conversation'`, `dashboard_type` correspondant
2. L'ancienne conversation n'est PAS supprimée ni modifiée
3. Le chat s'ouvre sur la nouvelle conversation vide
4. Élio affiche un message d'accueil adapté au `dashboard_type` :
   - **Lab** : "Salut ! On reprend ton parcours ? Sur quoi tu veux bosser ?"
   - **One** : "Bonjour ! Comment puis-je vous aider aujourd'hui ?"
   - **Hub** : "Hey MiKL ! Qu'est-ce que je peux faire pour toi ?"

**And** le message d'accueil utilise le profil de communication si disponible (tutoiement/vouvoiement)
**And** le cache TanStack Query est invalidé pour `['elio-conversations']`

### AC4 : Navigation entre conversations

**Given** l'utilisateur navigue entre les conversations
**When** il clique sur une conversation dans la liste
**Then** le chat affiche l'historique complet de cette conversation

**And** le scroll se positionne sur le dernier message
**And** le chargement est progressif si > 50 messages (pagination inverse avec "Charger les messages précédents")
**And** la transition entre conversations est fluide (< 500ms, NFR-P2)

### AC5 : Titre auto-généré

**Given** une conversation accumule plusieurs échanges
**When** le titre est encore "Nouvelle conversation"
**Then** après 3 messages utilisateur, le titre est auto-généré par le LLM en un appel léger :

- **Prompt** : "Résume cette conversation en 5 mots max : {3 premiers messages}"
- Le titre est mis à jour dans `elio_conversations.title`

**And** l'utilisateur peut éditer le titre manuellement (double-clic ou icône edit)

## Tasks / Subtasks

- [x] **Task 1** : Créer la migration Supabase pour les tables conversations (AC: #1, Story 6.4)
  - [x] 1.1 : Créer `supabase/migrations/00046_elio_conversations.sql`
  - [x] 1.2 : Table `elio_conversations` (id, user_id, dashboard_type, title, created_at, updated_at)
  - [x] 1.3 : Table `elio_messages` (id, conversation_id, role, content, metadata, created_at)
  - [x] 1.4 : Policies RLS (user ne voit que ses conversations)
  - [x] 1.5 : Index sur `user_id`, `dashboard_type`, `conversation_id`, `created_at`

- [x] **Task 2** : Créer les types pour conversations & messages
  - [x] 2.1 : Ajouter `ElioConversation` dans `types/elio.types.ts`
  - [x] 2.2 : Ajouter `ElioMessagePersisted` avec `role: 'user' | 'assistant'` + `conversationId`
  - [x] 2.3 : Ajouter `ConversationSummary` (pour la liste)

- [x] **Task 3** : Créer le composant liste conversations (AC: #2)
  - [x] 3.1 : Créer `components/conversation-list.tsx`
  - [x] 3.2 : Implémenter la liste avec sidebar desktop
  - [x] 3.3 : Implémenter drawer mobile (< 768px)
  - [x] 3.4 : Ajouter le bouton "Nouvelle conversation"
  - [x] 3.5 : Afficher titre, date, aperçu pour chaque conversation
  - [x] 3.6 : Surligner la conversation active

- [x] **Task 4** : Créer le composant item de conversation
  - [x] 4.1 : Créer `components/conversation-item.tsx`
  - [x] 4.2 : Afficher titre éditable (double-clic)
  - [x] 4.3 : Afficher date relative (`formatRelativeDate()`)
  - [x] 4.4 : Afficher aperçu dernier message (30 char max)

- [x] **Task 5** : Créer le hook `use-elio-conversations.ts` (AC: #1)
  - [x] 5.1 : Créer le hook avec TanStack Query
  - [x] 5.2 : QueryKey `['elio-conversations', userId, dashboardType]`
  - [x] 5.3 : Fetch via Server Action `getConversations()`
  - [x] 5.4 : Tri par `updated_at DESC`
  - [x] 5.5 : Cache 5 minutes

- [x] **Task 6** : Créer le hook `use-elio-messages.ts`
  - [x] 6.1 : Créer le hook avec TanStack Query + pagination (`useInfiniteQuery`)
  - [x] 6.2 : QueryKey `['elio-messages', conversationId]`
  - [x] 6.3 : Fetch via Server Action `getMessages(conversationId, page)`
  - [x] 6.4 : Pagination inverse (50 messages par page)
  - [x] 6.5 : Bouton "Charger les messages précédents"

- [x] **Task 7** : Créer la Server Action `newConversation()` (AC: #3, FR124)
  - [x] 7.1 : Créer `actions/new-conversation.ts`
  - [x] 7.2 : Créer l'entrée dans `elio_conversations`
  - [x] 7.3 : Retourner `{ data: conversation, error: null }`
  - [x] 7.4 : Invalider le cache `['elio-conversations']` (côté composant)

- [x] **Task 8** : Créer la Server Action pour le message d'accueil
  - [x] 8.1 : Créer `actions/generate-welcome-message.ts`
  - [x] 8.2 : Messages d'accueil par dashboard_type (Lab, One, Hub)
  - [x] 8.3 : Adapter au profil de communication (tutoiement/vouvoiement)
  - [x] 8.4 : Créer le message dans `elio_messages` avec `role='assistant'`

- [x] **Task 9** : Créer la Server Action pour auto-génération titre (AC: #5)
  - [x] 9.1 : Créer `actions/generate-conversation-title.ts`
  - [x] 9.2 : Appel LLM léger claude-haiku (prompt: "Résume en 5 mots max")
  - [x] 9.3 : Mettre à jour `elio_conversations.title`
  - [x] 9.4 : Déclencher après le 3ème message utilisateur

- [x] **Task 10** : Édition manuelle du titre
  - [x] 10.1 : Créer `actions/update-conversation-title.ts`
  - [x] 10.2 : Mettre à jour `elio_conversations.title`
  - [x] 10.3 : Invalider le cache `['elio-conversations']` (côté composant)

- [x] **Task 11** : Intégrer dans `elio-chat.tsx`
  - [x] 11.1 : Ajouter le panneau conversations collapsible (sidebar desktop + drawer mobile)
  - [x] 11.2 : Connecter `use-elio-conversations()` et `use-elio-messages()`
  - [x] 11.3 : Gérer la navigation entre conversations (transition CSS 300ms < 500ms NFR-P2)
  - [x] 11.4 : Auto-scroll au dernier message

- [x] **Task 12** : Tests
  - [x] 12.1 : Tester `use-elio-conversations()` (fetch, tri, cache, enabled flag)
  - [x] 12.2 : Tester `use-elio-messages()` (pagination, lazy loading, ordre chronologique)
  - [x] 12.3 : Tester `newConversation()` (création, gestion erreurs)
  - [x] 12.4 : Tester `generateWelcomeMessage()` et `getWelcomeMessage()` (tous dashboards, tutoiement)

## Dev Notes

### Base de données — Migration 00011

```sql
-- Table elio_conversations
CREATE TABLE elio_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard_type TEXT NOT NULL CHECK (dashboard_type IN ('hub', 'lab', 'one')),
  title TEXT DEFAULT 'Nouvelle conversation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_elio_conversations_user_id ON elio_conversations(user_id);
CREATE INDEX idx_elio_conversations_dashboard_type ON elio_conversations(dashboard_type);
CREATE INDEX idx_elio_conversations_updated_at ON elio_conversations(updated_at DESC);

-- RLS policies
ALTER TABLE elio_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON elio_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON elio_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON elio_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Table elio_messages
CREATE TABLE elio_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES elio_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_elio_messages_conversation_id ON elio_messages(conversation_id);
CREATE INDEX idx_elio_messages_created_at ON elio_messages(created_at);

-- RLS policies
ALTER TABLE elio_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from own conversations"
  ON elio_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM elio_conversations
      WHERE elio_conversations.id = elio_messages.conversation_id
      AND elio_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON elio_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM elio_conversations
      WHERE elio_conversations.id = elio_messages.conversation_id
      AND elio_conversations.user_id = auth.uid()
    )
  );

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_elio_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE elio_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON elio_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_elio_conversation_timestamp();
```

### Types TypeScript

```typescript
// types/elio.types.ts
export interface ElioConversation {
  id: string
  userId: string
  dashboardType: 'hub' | 'lab' | 'one'
  title: string
  createdAt: string
  updatedAt: string
}

export interface ElioMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  metadata: {
    feedback?: 'useful' | 'not_useful'
    documentId?: string
    profileObservation?: string
    draftType?: 'email' | 'validation_hub' | 'chat'
    evolutionBrief?: boolean
  }
  createdAt: string
}

export interface ConversationSummary {
  id: string
  title: string
  lastMessage: string
  lastMessageDate: string
  isActive: boolean
}
```

### Messages d'accueil par dashboard

```typescript
// config/welcome-messages.ts
export const WELCOME_MESSAGES = {
  hub: {
    formal: "Bonjour MiKL ! Je suis Élio Hub, votre assistant. Comment puis-je vous aider aujourd'hui ?",
    casual: "Hey MiKL ! Qu'est-ce que je peux faire pour toi ?",
  },
  lab: {
    formal: "Bonjour ! Bienvenue sur Élio Lab. Comment puis-je vous accompagner dans votre parcours ?",
    casual: "Salut ! On reprend ton parcours ? Sur quoi tu veux bosser ?",
  },
  one: {
    formal: "Bonjour ! Je suis Élio, votre assistant. Comment puis-je vous aider aujourd'hui ?",
    casual: "Salut ! Comment je peux t'aider aujourd'hui ?",
  },
} as const

export function getWelcomeMessage(
  dashboardType: DashboardType,
  communicationProfile?: CommunicationProfile
): string {
  const isCasual = communicationProfile?.tutoiement ?? false
  return isCasual
    ? WELCOME_MESSAGES[dashboardType].casual
    : WELCOME_MESSAGES[dashboardType].formal
}
```

### Pattern pagination inverse

```typescript
// hooks/use-elio-messages.ts
import { useInfiniteQuery } from '@tanstack/react-query'

export function useElioMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: ['elio-messages', conversationId],
    queryFn: ({ pageParam = 0 }) => getMessages(conversationId, pageParam),
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === PAGE_SIZE ? pages.length : undefined
    },
    initialPageParam: 0,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 secondes
  })
}

// Dans le composant
const { data, fetchNextPage, hasNextPage } = useElioMessages(conversationId)

// Bouton "Charger les messages précédents"
{hasNextPage && (
  <button onClick={() => fetchNextPage()}>
    Charger les messages précédents
  </button>
)}
```

### Transition fluide entre conversations (NFR-P2)

```typescript
// components/conversation-list.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'

export function ConversationList() {
  const [activeId, setActiveId] = useState<string | null>(null)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeId}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
      >
        {/* Chat messages */}
      </motion.div>
    </AnimatePresence>
  )
}
```

### Realtime sync pour nouveaux messages

```typescript
// hooks/use-elio-chat.ts
import { useEffect } from 'react'
import { createBrowserClient } from '@foxeo/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

export function useElioChat(conversationId: string) {
  const queryClient = useQueryClient()
  const supabase = createBrowserClient()

  useEffect(() => {
    const channel = supabase
      .channel(`elio:conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'elio_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // Invalider le cache pour recharger les messages
          queryClient.invalidateQueries({
            queryKey: ['elio-messages', conversationId],
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase, queryClient])

  // ...
}
```

### References

- [Source: Epic 8 — Story 8.2](file:///_bmad-output/planning-artifacts/epics/epic-8-agents-ia-elio-hub-lab-one-stories-detaillees.md#story-82)
- [Source: Architecture — Implementation Patterns](file:///_bmad-output/planning-artifacts/architecture/04-implementation-patterns.md)
- [Source: PRD — FR123, FR124](file:///_bmad-output/planning-artifacts/prd/functional-requirements-foxeo-plateforme.md)

---

**Story créée le** : 2026-02-13
**Story prête pour développement** : ✅ Oui
**Dépendances** : Story 8.1 (infrastructure Élio)
**FRs couvertes** : FR123 (historique persistant), FR124 (nouvelle conversation)

---

## Dev Agent Record

### Implementation Plan

Implémentation Story 8.2 par Amelia (Dev Agent) — 2026-03-02

**Architecture choisie :**
- Mode dual dans `ElioChat` : `ElioChatSimple` (sans userId, comportement 8.1 préservé) + `ElioChatPersisted` (avec userId, persistance complète)
- `useElioMessages` utilise `useInfiniteQuery` pour la pagination inverse (page 0 = messages récents)
- `save-elio-message.ts` créé pour persister les messages user + assistant après chaque échange
- Pas de framer-motion (non disponible) → transition CSS `duration-300` pour AC4 NFR-P2
- Migration `00046` (pas `00011` comme dans les Dev Notes — numéro disponible dans ce projet)
- Auto-génération titre : claude-haiku-4-5-20251001 (modèle léger, 15s timeout, 20 tokens max)

**Décisions techniques :**
- `ElioMessagePersisted` créé séparément de `ElioMessage` pour éviter de casser l'API existante
- `conversationId?: string` ajouté en optionnel à `ElioMessage` pour compatibilité descendante
- L'invalidation TanStack Query se fait côté composant (Server Actions sans queryClient)
- `getWelcomeMessage()` exportée séparément pour testabilité

### Completion Notes

- ✅ AC1 : Conversations fetchées via TanStack Query `['elio-conversations', userId, dashboardType]`, tri updated_at DESC, conversation la plus récente auto-sélectionnée
- ✅ AC2 : Sidebar desktop (w-64, collapsible) + drawer mobile plein écran (< 768px via Tailwind `md:`)
- ✅ AC3 : `newConversation()` crée sans supprimer les anciennes, message d'accueil adapté au dashboard + tutoiement, cache invalidé
- ✅ AC4 : Navigation entre conversations, scroll auto au dernier message, pagination inverse "Charger les messages précédents", transition CSS 300ms < 500ms
- ✅ AC5 : Auto-génération titre après 3 messages via LLM léger, édition manuelle double-clic ou icône ✎
- 22 nouveaux tests (4 fichiers) — 182/182 tests passing dans le module Élio

### Code Review Fixes (Phase 2 — Opus)

- **H1** : Wired `onRenameTitle` through `ConversationList` to `ConversationItem` (title edit was dead code)
- **H2** : Added `lastMessagePreview` to `ElioConversation` type, enriched `getConversations` with join to `elio_messages`, updated `ConversationItem` to display preview
- **H3** : Auto-title generation now combines `persistedMessages` + `localMessages` + current message content (was using stale data)
- **M1** : Added 8 tests for `generate-conversation-title.ts` (LLM call, validation, truncation, message limit)
- **M2** : Added 21 tests for 4 untested server actions (`get-conversations`, `get-messages`, `save-elio-message`, `update-conversation-title`)
- **M3** : Fixed import organization in `elio-chat.tsx`
- **L1** : `listContent` duplicate render documented (acceptable trade-off for readability)
- **L2** : `ConversationSummary` type kept (planned usage in Story 8.3+)

Post-CR: 211/211 tests passing dans le module Élio (29 tests ajoutés via CR)

## File List

### Nouveaux fichiers
- `supabase/migrations/00046_elio_conversations.sql`
- `packages/modules/elio/actions/get-conversations.ts`
- `packages/modules/elio/actions/get-messages.ts`
- `packages/modules/elio/actions/new-conversation.ts`
- `packages/modules/elio/actions/generate-welcome-message.ts`
- `packages/modules/elio/actions/generate-conversation-title.ts`
- `packages/modules/elio/actions/update-conversation-title.ts`
- `packages/modules/elio/actions/save-elio-message.ts`
- `packages/modules/elio/hooks/use-elio-conversations.ts`
- `packages/modules/elio/hooks/use-elio-messages.ts`
- `packages/modules/elio/components/conversation-list.tsx`
- `packages/modules/elio/components/conversation-item.tsx`
- `packages/modules/elio/actions/new-conversation.test.ts`
- `packages/modules/elio/actions/generate-welcome-message.test.ts`
- `packages/modules/elio/hooks/use-elio-conversations.test.ts`
- `packages/modules/elio/hooks/use-elio-messages.test.ts`
- `packages/modules/elio/actions/generate-conversation-title.test.ts`
- `packages/modules/elio/actions/get-conversations.test.ts`
- `packages/modules/elio/actions/get-messages.test.ts`
- `packages/modules/elio/actions/save-elio-message.test.ts`
- `packages/modules/elio/actions/update-conversation-title.test.ts`

### Fichiers modifiés
- `packages/modules/elio/types/elio.types.ts` — ajout `ElioConversation`, `ElioMessagePersisted`, `ConversationSummary`, `conversationId?` dans `ElioMessage`
- `packages/modules/elio/components/elio-chat.tsx` — refactorisé en mode dual (simple/persisté) avec intégration conversations
- `packages/modules/elio/index.ts` — exports des nouveaux hooks, actions et types

## Change Log

- 2026-03-02 : Story 8.2 implémentée — conversations Élio persistantes avec liste/commutation/historique (22 tests ajoutés)
- 2026-03-02 : Code Review fixes (3 HIGH, 3 MEDIUM, 2 LOW) — 29 tests CR ajoutés → 211 tests module Élio
