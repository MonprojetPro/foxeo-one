# Story 14.4 : Chat Élio embarqué dans la page étape

Status: done

## Story

As a **client Lab sur la page d'une étape**,
I want **discuter avec Élio directement dans la page de l'étape (colonne gauche, sous la description), avec un Élio configuré spécifiquement pour cette étape**,
so that **je bénéficie d'un accompagnement contextuel sans quitter la page, et ma conversation est persistée et liée à l'étape**.

## Acceptance Criteria

**Given** un client accède à une étape avec statut 'current'
**When** la page se charge
**Then** le chat Élio apparaît sous la section "Pourquoi cette étape ?" avec : zone de messages scrollable (hauteur ~420px), input en bas, avatar Élio + nom persona (depuis elio_step_configs.persona_name ou 'Élio' par défaut)

**Given** un client envoie un message dans le StepElioChat
**When** la réponse arrive
**Then** le message est persisté dans `elio_messages` via une conversation liée au step_id (colonne `step_id` dans elio_conversations), le system prompt utilisé est celui de `elio_step_configs.system_prompt_override` (ou fallback global)

**Given** un client revient sur une étape où il avait déjà discuté
**When** la page se charge
**Then** la conversation existante (elio_conversations WHERE step_id = X AND client_id = Y) est chargée avec l'historique des messages

**Given** une étape a le statut 'locked'
**When** la page se charge
**Then** le chat est désactivé visuellement (opacity 50%, input disabled), avec message "Cette étape n'est pas encore accessible"

**Given** une étape a le statut 'completed'
**When** la page se charge
**Then** le chat affiche l'historique en lecture seule (input disabled), sauf si l'étape a été rouverte (status revenu à 'current')

**Given** l'étape a un statut 'pending_review' (ajouté en Story 14.3)
**When** la page se charge
**Then** le chat est en lecture seule avec message "Votre soumission est en cours d'examen par MiKL"

## Tasks / Subtasks

- [x] Task 1 — Migration ALTER elio_conversations (AC: #2, #3)
  - [x] 1.1 Créer migration `00099_add_step_id_to_elio_conversations.sql`
  - [x] 1.2 ALTER TABLE elio_conversations ADD COLUMN step_id UUID REFERENCES parcours_steps(id) — nullable
  - [x] 1.3 Index sur step_id pour les lookups

- [x] Task 2 — Action getOrCreateStepConversation (AC: #2, #3)
  - [x] 2.1 Créer `packages/modules/parcours/actions/get-or-create-step-conversation.ts`
  - [x] 2.2 Test co-localisé (6 tests)

- [x] Task 3 — Composant StepElioChat (AC: #1, #4, #5, #6)
  - [x] 3.1 Créer `packages/modules/parcours/components/step-elio-chat.tsx`
  - [x] 3.2 Props : stepId, stepStatus, stepNumber, clientId
  - [x] 3.3 Gestion conversation + historique + config Élio via actions parcours
  - [x] 3.4 Zone scrollable 420px, auto-scroll sur nouveau message
  - [x] 3.5 Input disabled si isReadonly(status) || locked
  - [x] 3.6 Messages styles : user (bg violet), assistant (bg dark), injection MiKL (fond orange — prépare 14.5)
  - [x] 3.7 Affichage du persona_name dans le header du chat (via getEffectiveElioConfig)
  - [x] 3.8 Test du composant (9 tests — états disabled, chargement, messages, erreur)

- [x] Task 4 — Intégration dans ParcoursStepDetail (AC: #1)
  - [x] 4.1 Importer StepElioChat dans parcours-step-detail.tsx
  - [x] 4.2 Placer après la section "Pourquoi cette étape ?" dans la colonne gauche
  - [x] 4.3 11 tests existants parcours-step-detail.test.tsx passent

## Dev Notes

### Architecture — Règles critiques

- `useElioChat` du module elio gère déjà l'envoi/réception — ne PAS recréer de logique chat
- Le hook a besoin d'un `conversationId` — le résoudre via `getOrCreateStepConversation` au montage
- Le system prompt est passé à l'Edge Function `elio-chat` via le champ `systemPrompt` dans le body (déjà supporté par sendToElio)
- `getEffectiveElioConfig` (Story 14.1) fournit le system prompt à utiliser
- Pattern `{ data, error }` pour toutes les actions
- Ne PAS importer directement depuis le module `elio` des composants — uniquement les hooks et actions via barrel export

### Base de données

```sql
-- Migration 00097_add_step_id_to_elio_conversations.sql

ALTER TABLE elio_conversations
  ADD COLUMN step_id UUID REFERENCES parcours_steps(id) ON DELETE SET NULL;

CREATE INDEX idx_elio_conversations_step_id ON elio_conversations(step_id);

COMMENT ON COLUMN elio_conversations.step_id IS 'FK vers parcours_steps — lie la conversation à une étape spécifique du parcours';
```

### Fichiers à créer / modifier

```
supabase/migrations/00097_add_step_id_to_elio_conversations.sql       # CRÉER

packages/modules/parcours/actions/get-or-create-step-conversation.ts   # CRÉER
packages/modules/parcours/actions/get-or-create-step-conversation.test.ts # CRÉER
packages/modules/parcours/components/step-elio-chat.tsx                 # CRÉER
packages/modules/parcours/components/step-elio-chat.test.tsx            # CRÉER
packages/modules/parcours/components/parcours-step-detail.tsx           # MODIFIER — ajout StepElioChat
packages/modules/parcours/components/parcours-step-detail.test.tsx      # MODIFIER — mock StepElioChat
```

## File List (auto-generated at completion)

**Created:**
- `supabase/migrations/00099_add_step_id_to_elio_conversations.sql`
- `packages/modules/parcours/actions/get-or-create-step-conversation.ts`
- `packages/modules/parcours/actions/get-or-create-step-conversation.test.ts`
- `packages/modules/parcours/components/step-elio-chat.tsx`
- `packages/modules/parcours/components/step-elio-chat.test.tsx`

**Modified:**
- `packages/modules/elio/actions/send-to-elio.ts` — param `systemPromptOverride?` ajouté
- `packages/modules/elio/types/elio.types.ts` — `injectedByMikl?` ajouté à ElioMessageMetadata (prépare 14.5)
- `packages/modules/parcours/components/parcours-step-detail.tsx` — prop `clientId?` + StepElioChat
- `packages/modules/parcours/components/parcours-step-detail.test.tsx` — mock StepElioChat
- `apps/client/app/(dashboard)/modules/parcours/steps/[stepNumber]/page.tsx` — passe clientId

## Completion Notes

- Migration numérotée 00099 (00097 et 00098 déjà prises par autres stories de l'Epic 14)
- `sendToElio` étendu avec `systemPromptOverride?` — s'applique au chemin générique (Lab/Hub sans intent)
- Le modèle/température spécifiques à l'étape (depuis `getEffectiveElioConfig`) ne sont pas transmis à l'Edge Function — `sendToElio` utilise le modèle global client. Amélioration possible dans une story future.
- Le panneau right-column (CTA "Ouvrir le chat Élio complet") est conservé tel quel — le `StepElioChat` se trouve dans la colonne gauche sous "Pourquoi cette étape ?", conformément aux AC
- Fix SCAN : race condition sur saveElioMessage vérifiée avant appel LLM, RLS `step_id` cross-client ajoutée en migration, `isReadonly()` utilisée cohéremment
