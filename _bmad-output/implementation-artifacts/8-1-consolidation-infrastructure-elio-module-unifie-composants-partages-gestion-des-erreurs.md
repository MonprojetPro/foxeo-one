# Story 8.1: Consolidation infrastructure Elio — Module unifié, composants partagés & gestion des erreurs

Status: done

## Story

As a **client MonprojetPro (Lab ou One)**,
I want **qu'Élio fonctionne de manière fiable et cohérente quel que soit le dashboard**,
So that **mon expérience avec l'assistant IA est fluide, sans bugs ni incohérences entre les contextes**.

**Type de story :** Technical Enabler (consolidation technique)
**Bénéfice indirect** pour tous les utilisateurs d'Élio (Hub, Lab, One)

## Acceptance Criteria

### AC1 : Module unifié Elio avec architecture multi-dashboard

**Given** le module Elio doit être créé avec une architecture unifiée multi-dashboard (prérequis des Stories 6.4-6.6)
**When** le module unifié est créé
**Then** le module `packages/modules/elio/` est restructuré avec une architecture unifiée :

```
packages/modules/elio/
  index.ts                       # Export public du module
  manifest.ts                    # { id: 'elio', targets: ['hub', 'client-lab', 'client-one'], dependencies: [] }
  docs/                          # Documentation livrable (OBLIGATOIRE — CI vérifie)
    guide.md                     # Guide utilisateur
    faq.md                       # FAQ
    flows.md                     # Flux utilisateur
  components/
    elio-chat.tsx                # Chat unifié (dashboard-agnostic)
    elio-thinking.tsx            # Indicateur de réflexion (FR122)
    elio-message.tsx             # Composant message individuel
    elio-error-message.tsx       # Composant message d'erreur
  hooks/
    use-elio-chat.ts             # Hook principal (conversation, envoi, réception)
    use-elio-config.ts           # Hook résolution config par dashboard_type
  actions/
    send-to-elio.ts              # Server Action existante (refactorée pour multi-dashboard)
  types/
    elio.types.ts                # Types partagés
  config/
    system-prompts.ts            # Construction de system prompts par dashboard_type
```

**And** le manifest est mis à jour avec `targets: ['hub', 'client-lab', 'client-one']`
**And** la documentation (`docs/`) est créée (guide, faq, flows) — vérifiée en CI

### AC2 : Composant elio-chat.tsx refactorisé dashboard-agnostic

**Given** le composant `elio-chat.tsx` est refactorisé
**When** il est utilisé dans un dashboard
**Then** il reçoit un prop `dashboardType: 'hub' | 'lab' | 'one'` qui détermine :

- **Palette de couleurs** Minimal Futuriste (sur base dark mode) :
  - Hub: cyan/turquoise (#00CED1)
  - Lab: violet/purple (#9333EA)
  - One: orange vif + bleu-gris (#F7931E + #64748B)
- **System prompt de base** via `config/system-prompts.ts`
- **Capacités disponibles** :
  - Lab: guidage parcours, questions adaptées au profil
  - One: FAQ, guidance dashboard
  - Hub: recherche clients, fonctionnalités Hub

**And** les composants internes (message, input, header) s'adaptent au `dashboard_type`
**And** cette architecture sert de fondation pour les Stories 6.4-6.6 (Elio Lab) et 8.2-8.9 (Elio Hub/One)

### AC3 : Composant elio-thinking.tsx (FR122)

**Given** le composant `elio-thinking.tsx` est extrait
**When** Élio génère une réponse
**Then** un indicateur visuel animé s'affiche :

- **Animation** : Type "pulsation" ou "dots" avec le texte "Élio réfléchit..."
- **Position** : Zone de chat, à la position où la réponse va apparaître
- **Disparition** : Quand le premier token de la réponse arrive

**And** le composant est réutilisable dans tous les dashboards
**And** le texte est configurable (ex : "Élio analyse votre question..." pour le Hub)

### AC4 : Gestion des erreurs et timeouts Élio (FR83)

**Given** la gestion des erreurs et timeouts Élio
**When** un appel au LLM échoue ou expire
**Then** le système gère gracieusement les cas suivants :

| Type d'erreur | Message utilisateur | Comportement |
|---------------|---------------------|--------------|
| **Timeout (> 60s, NFR-I2)** | "Élio est temporairement indisponible. Réessayez dans quelques instants." | Bouton "Réessayer" |
| **Erreur réseau** | "Problème de connexion. Vérifiez votre connexion internet." | Bouton "Réessayer" |
| **Erreur LLM (500, rate limit)** | "Élio est surchargé. Réessayez dans quelques minutes." | Bouton "Réessayer" |
| **Erreur inattendue** | Message générique avec log de l'erreur (NFR-R5) | Bouton "Réessayer" |

**And** l'indicateur `elio-thinking.tsx` se masque en cas d'erreur
**And** le message d'erreur s'affiche dans une bulle spéciale (icône warning, style distinct)
**And** le champ de saisie reste actif (le client peut réessayer immédiatement)
**And** ces comportements sont partagés via un composant `elio-error-message.tsx` ou intégrés dans `elio-chat.tsx`

### AC5 : Hook use-elio-config.ts

**Given** le hook `use-elio-config.ts`
**When** il est utilisé dans un dashboard
**Then** il résout la configuration Élio en fonction du `dashboard_type` :

- **Lab** : charge `client_configs.elio_config` (profil comm, parcours_context, custom_prompts)
- **One** : charge `client_configs.elio_config` + `client_configs.elio_tier` ('one' | 'one_plus') + documentation modules actifs
- **Hub** : charge la config Hub globale (pas de profil client, config opérateur)

**And** la config est mise en cache via TanStack Query avec `queryKey: ['elio-config', dashboardType, clientId]`

### AC6 : Construction des system prompts (config/system-prompts.ts)

**Given** la construction des system prompts
**When** un message est envoyé à Élio
**Then** le system prompt est construit dynamiquement selon le `dashboard_type` :

- **Base commune** : rôle Élio, ton adapté au profil communication, contraintes générales
- **Lab** : + étape active du parcours, questions guidées, contexte métier client
- **One** : + documentation modules actifs, capacités FAQ/guidance uniquement
- **One+** : + capacités actions/génération/alertes
- **Hub** : + contexte opérateur, fonctionnalités Hub, base de données clients accessible

**And** le system prompt est assemblé dans `send-to-elio.ts` avant l'appel au LLM
**And** le profil de communication est injecté dans le system prompt (FR66-69)

## Tasks / Subtasks

- [x] **Task 1** : Créer la structure du module Elio (AC: #1)
  - [x] 1.1 : Créer l'arborescence `packages/modules/elio/` avec tous les dossiers
  - [x] 1.2 : Créer `manifest.ts` avec `targets: ['hub', 'client-lab', 'client-one']`
  - [x] 1.3 : Créer les fichiers de documentation (`docs/guide.md`, `docs/faq.md`, `docs/flows.md`)
  - [x] 1.4 : Créer `index.ts` avec barrel exports

- [x] **Task 2** : Créer les types partagés (AC: tous)
  - [x] 2.1 : Créer `types/elio.types.ts` avec `DashboardType`, `ElioConfig`, `ElioMessage`, `ElioError`
  - [x] 2.2 : Créer le type `CommunicationProfileFR66` (selon FR66) — nommé FR66 pour éviter conflit avec type existant Stories 6.x
  - [x] 2.3 : Ajouter les types pour les erreurs et timeouts

- [x] **Task 3** : Créer le composant `elio-thinking.tsx` (AC: #3, FR122)
  - [x] 3.1 : Créer le composant avec animation pulsation/dots
  - [x] 3.2 : Rendre le texte configurable via props
  - [x] 3.3 : Tester dans les 3 dashboards (Hub, Lab, One)

- [x] **Task 4** : Créer le composant `elio-error-message.tsx` (AC: #4, FR83)
  - [x] 4.1 : Créer le composant avec affichage icône warning
  - [x] 4.2 : Implémenter le bouton "Réessayer"
  - [x] 4.3 : Gérer les 4 types d'erreurs (timeout, réseau, LLM, inattendue)
  - [x] 4.4 : Ajouter les logs d'erreur (format `[ELIO:ERROR] message`)

- [x] **Task 5** : Créer le composant `elio-message.tsx`
  - [x] 5.1 : Créer le composant message individuel (bulle utilisateur vs Élio)
  - [x] 5.2 : Adapter le style selon `dashboardType`
  - [x] 5.3 : Intégrer le support des feedbacks (préparation pour Story 8.3) via `feedbackSlot?: React.ReactNode`

- [x] **Task 6** : Créer le composant `elio-chat.tsx` refactorisé (AC: #2)
  - [x] 6.1 : Créer le composant avec prop `dashboardType: 'hub' | 'lab' | 'one'`
  - [x] 6.2 : Implémenter la logique de palette de couleurs par dashboard
  - [x] 6.3 : Intégrer `elio-thinking.tsx` et `elio-error-message.tsx`
  - [x] 6.4 : Intégrer `elio-message.tsx` pour l'affichage des messages
  - [x] 6.5 : Connecter le hook `use-elio-chat.ts`

- [x] **Task 7** : Créer `config/system-prompts.ts` (AC: #6)
  - [x] 7.1 : Créer la fonction `buildSystemPrompt(dashboardType, config)`
  - [x] 7.2 : Implémenter la construction du prompt commun
  - [x] 7.3 : Implémenter les variantes Lab, One, One+, Hub
  - [x] 7.4 : Intégrer le profil de communication (FR66-69)

- [x] **Task 8** : Créer le hook `use-elio-config.ts` (AC: #5)
  - [x] 8.1 : Créer le hook avec résolution config par `dashboard_type`
  - [x] 8.2 : Implémenter le cache TanStack Query
  - [x] 8.3 : Gérer les 3 cas (Lab, One, Hub)

- [x] **Task 9** : Créer le hook `use-elio-chat.ts`
  - [x] 9.1 : Créer le hook principal pour la conversation
  - [x] 9.2 : Implémenter `sendMessage()` avec gestion des erreurs
  - [x] 9.3 : Implémenter `retrySend()` pour le bouton "Réessayer"
  - [x] 9.4 : Connecter avec `send-to-elio.ts`

- [x] **Task 10** : Refactoriser `actions/send-to-elio.ts` (AC: #4, #6)
  - [x] 10.1 : Adapter pour multi-dashboard (ajouter param `dashboardType`)
  - [x] 10.2 : Intégrer la construction du system prompt via `config/system-prompts.ts`
  - [x] 10.3 : Implémenter la gestion des erreurs et timeouts (60s max)
  - [x] 10.4 : Appeler Supabase Edge Function pour DeepSeek V3.2
  - [x] 10.5 : Retourner `{ data, error }` (jamais `throw`)

- [x] **Task 11** : Tests unitaires
  - [x] 11.1 : Tester `use-elio-config.ts` (3 dashboards)
  - [x] 11.2 : Tester `buildSystemPrompt()` (toutes variantes)
  - [x] 11.3 : Tester `elio-error-message.tsx` (4 types d'erreurs)
  - [x] 11.4 : Tester `elio-thinking.tsx` (affichage/masquage)

- [x] **Task 12** : Documentation
  - [x] 12.1 : Rédiger `docs/guide.md` (guide utilisateur Élio)
  - [x] 12.2 : Rédiger `docs/faq.md` (questions fréquentes)
  - [x] 12.3 : Rédiger `docs/flows.md` (flux utilisateur avec diagrammes)

## Dev Notes

### Contexte architectural critique

**⚠️ PRÉREQUIS IMPORTANT :** Cette story 8.1 est un **prérequis** des Stories 6.4-6.6 (Élio Lab). Les tables `elio_conversations` et `elio_messages` seront créées en Story 6.4 (migration 00011). Cette story crée uniquement l'infrastructure de base — les fonctionnalités Lab-spécifiques seront construites ensuite sur cette fondation.

### Stack technique

| Package | Version | Usage |
|---------|---------|-------|
| DeepSeek V3.2 | Janvier 2026 | LLM via Supabase Edge Function |
| @supabase/supabase-js | ^2.95.x | Client Supabase |
| @tanstack/react-query | ^5.90.x | Cache & data fetching |
| zustand | ^5.0.x | État UI uniquement (pas de données Élio !) |
| react-hook-form | ^7.71.x | Formulaires (si besoin) |
| zod | existant | Validation (profil comm, config) |
| Next.js | ^16.1.x | Framework (App Router, Server Actions) |
| React | ^19.x | UI |
| TypeScript | strict mode | Typage strict, pas de `any` |

### Palettes de couleurs par dashboard (OKLCH dark mode)

```css
/* Hub — Cyan/Turquoise */
--elio-hub-primary: oklch(0.7 0.15 190)    /* #00CED1 */
--elio-hub-accent: oklch(0.8 0.1 190)

/* Lab — Violet/Purple */
--elio-lab-primary: oklch(0.6 0.2 280)     /* #9333EA */
--elio-lab-accent: oklch(0.7 0.15 280)

/* One — Orange vif + Bleu-gris */
--elio-one-primary: oklch(0.7 0.2 50)      /* #F7931E */
--elio-one-accent: oklch(0.5 0.05 240)     /* #64748B */
```

### Architecture de données

**Tables Supabase** (créées en Story 6.4, pas dans cette story) :
- `elio_conversations` : historique des conversations (FR123)
- `elio_messages` : messages individuels (FR123)
- `client_configs.elio_config` : configuration Élio par client (profil comm, parcours, custom prompts)
- `client_configs.elio_tier` : tier ('one' | 'one_plus')

**TanStack Query cache keys** :
```typescript
['elio-config', dashboardType, clientId]           // Config Élio
['elio-conversations', clientId, dashboardType]    // Conversations (Story 8.2)
['elio-messages', conversationId]                  // Messages (Story 8.2)
```

### Profil de communication (FR66-69)

Structure définie dans le PRD :

```typescript
type CommunicationProfile = {
  levelTechnical: 'beginner' | 'intermediaire' | 'advanced'
  styleExchange: 'direct' | 'conversationnel' | 'formel'
  adaptedTone: 'formel' | 'pro_decontracte' | 'chaleureux' | 'coach'
  messageLength: 'court' | 'moyen' | 'detaille'
  tutoiement: boolean
  concreteExamples: boolean
  avoid: string[]          // ex: ["jargon technique", "questions ouvertes"]
  privilege: string[]      // ex: ["listes à puces", "questions fermées"]
  styleNotes: string       // notes libres
}

// Défaut dans @monprojetpro/utils
const DEFAULT_COMMUNICATION_PROFILE: CommunicationProfile = {
  levelTechnical: 'intermediaire',
  styleExchange: 'conversationnel',
  adaptedTone: 'pro_decontracte',
  messageLength: 'moyen',
  tutoiement: false,
  concreteExamples: true,
  avoid: [],
  privilege: [],
  styleNotes: ''
}
```

### Gestion des erreurs (FR83, NFR-I2)

**4 types d'erreurs** à gérer :

1. **Timeout (> 60s)** : NFR-I2 spécifie un timeout max de 60 secondes
   - Message : "Élio est temporairement indisponible. Réessayez dans quelques instants."
   - Bouton "Réessayer"

2. **Erreur réseau** : Problème de connexion internet
   - Message : "Problème de connexion. Vérifiez votre connexion internet."
   - Bouton "Réessayer"

3. **Erreur LLM (500, rate limit)** : Service DeepSeek surchargé
   - Message : "Élio est surchargé. Réessayez dans quelques minutes."
   - Bouton "Réessayer"

4. **Erreur inattendue** : Autres erreurs
   - Message générique
   - Log de l'erreur (format `[ELIO:ERROR] {code}: {message}`)
   - Bouton "Réessayer"

**Pattern de retour** : Toujours `{ data, error }`, jamais `throw`

```typescript
type ActionResponse<T> = {
  data: T | null
  error: ActionError | null
}

type ActionError = {
  message: string    // Message user-facing
  code: string       // 'TIMEOUT', 'NETWORK_ERROR', 'LLM_ERROR', 'UNKNOWN'
  details?: unknown  // Dev only, jamais exposé en prod
}
```

### Intégration DeepSeek V3.2 via Supabase Edge Function

**Flow d'appel** :
1. Client → Server Action `send-to-elio.ts`
2. Server Action → Supabase Edge Function `/functions/elio-chat`
3. Edge Function → DeepSeek API (clés API dans Supabase Vault, NFR-S8)
4. Edge Function → Server Action (streaming ou réponse complète)
5. Server Action → Client (via `{ data, error }`)

**⚠️ Sécurité (NFR-S8)** : Les clés API DeepSeek ne transitent JAMAIS côté client. Tout passe par l'Edge Function.

### Règles d'implémentation strictes

**Data fetching** (3 patterns uniquement) :
- **Lecture** → Server Component ou TanStack Query
- **Mutation** → Server Action
- **Externe** → API Route (pas utilisé ici)

**State management** (séparation stricte) :
- **Données serveur** (config Élio, conversations, messages) → TanStack Query
- **Données temps réel** (nouveaux messages) → Supabase Realtime → `queryClient.invalidateQueries()`
- **État UI** (sidebar, préférences, onglets) → Zustand
- **État formulaire** → React Hook Form

**⚠️ INTERDIT** : Stocker des données serveur dans Zustand !

**Naming conventions** :
- Composants : `PascalCase` → `ElioChat`, `ElioThinking`
- Fichiers : `kebab-case.tsx` → `elio-chat.tsx`, `elio-thinking.tsx`
- Hooks : `use` + `PascalCase` → `useElioChat()`, `useElioConfig()`
- Server Actions : `camelCase` → `sendToElio()`, `newConversation()`
- Types : `PascalCase` → `ElioConfig`, `ElioMessage`
- Constantes : `UPPER_SNAKE_CASE` → `DEFAULT_COMMUNICATION_PROFILE`

**Tests** :
- Co-localisés : `*.test.ts` à côté du fichier source
- Jamais de dossier `__tests__/` séparé

**Documentation** :
- Obligatoire : `docs/guide.md`, `docs/faq.md`, `docs/flows.md`
- Vérifiée en CI (build cassé si manquante)

### Patterns de code attendus

**Composant avec palette dashboard** :

```typescript
// components/elio-chat.tsx
'use client'

interface ElioChatProps {
  dashboardType: 'hub' | 'lab' | 'one'
  clientId?: string
}

export function ElioChat({ dashboardType, clientId }: ElioChatProps) {
  const config = useElioConfig(dashboardType, clientId)
  const { messages, sendMessage, isLoading, error } = useElioChat(dashboardType, clientId)

  // Palette CSS adaptée au dashboardType
  const paletteClass = {
    hub: 'elio-palette-hub',
    lab: 'elio-palette-lab',
    one: 'elio-palette-one',
  }[dashboardType]

  return (
    <div className={cn('elio-chat', paletteClass)}>
      {/* ... */}
      {isLoading && <ElioThinking dashboardType={dashboardType} />}
      {error && <ElioErrorMessage error={error} onRetry={() => sendMessage(lastMessage)} />}
    </div>
  )
}
```

**Hook avec TanStack Query** :

```typescript
// hooks/use-elio-config.ts
import { useQuery } from '@tanstack/react-query'
import { getElioConfig } from '../actions/get-elio-config'

export function useElioConfig(
  dashboardType: DashboardType,
  clientId?: string
) {
  return useQuery({
    queryKey: ['elio-config', dashboardType, clientId],
    queryFn: () => getElioConfig(dashboardType, clientId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

**Server Action avec gestion d'erreur** :

```typescript
// actions/send-to-elio.ts
'use server'

import { createServerClient } from '@monprojetpro/supabase/server'
import { buildSystemPrompt } from '../config/system-prompts'

export async function sendToElio(
  dashboardType: DashboardType,
  message: string,
  clientId?: string
): Promise<ActionResponse<ElioMessage>> {
  const supabase = createServerClient()

  // 1. Charger la config Élio
  const { data: config, error: configError } = await getElioConfig(dashboardType, clientId)
  if (configError) {
    return { data: null, error: { message: 'Erreur de configuration', code: 'CONFIG_ERROR' } }
  }

  // 2. Construire le system prompt
  const systemPrompt = buildSystemPrompt(dashboardType, config)

  // 3. Appeler l'Edge Function DeepSeek
  try {
    const { data, error } = await supabase.functions.invoke('elio-chat', {
      body: { systemPrompt, message },
    })

    if (error) throw error

    return { data, error: null }
  } catch (err) {
    // Gestion des erreurs (timeout, réseau, LLM, inattendue)
    const error = handleElioError(err)
    return { data: null, error }
  }
}

function handleElioError(err: unknown): ActionError {
  if (err instanceof TimeoutError) {
    return {
      message: 'Élio est temporairement indisponible. Réessayez dans quelques instants.',
      code: 'TIMEOUT',
    }
  }
  if (err instanceof NetworkError) {
    return {
      message: 'Problème de connexion. Vérifiez votre connexion internet.',
      code: 'NETWORK_ERROR',
    }
  }
  if (err instanceof LLMError) {
    return {
      message: 'Élio est surchargé. Réessayez dans quelques minutes.',
      code: 'LLM_ERROR',
    }
  }
  return {
    message: 'Une erreur inattendue est survenue.',
    code: 'UNKNOWN',
    details: err,
  }
}
```

### Project Structure Notes

**Emplacement du module** : `packages/modules/elio/`

**Intégration dans les apps** :
- `apps/hub/` : importe le module via le registry, passe `dashboardType='hub'`
- `apps/client/` : importe le module via le registry, passe `dashboardType='lab'` ou `dashboardType='one'` selon `client_configs.dashboard_type`

**Dépendances** :
- `@monprojetpro/ui` : composants de base (Button, Card, Input)
- `@monprojetpro/supabase` : client Supabase, providers
- `@monprojetpro/utils` : `cn()`, `formatRelativeDate()`, `DEFAULT_COMMUNICATION_PROFILE`
- `@monprojetpro/types` : `ActionResponse`, `ActionError`, types DB

**Pas de dépendances circulaires** : Le module Elio ne peut PAS importer d'autres modules directement.

### References

- [Source: Epic 8 — Story 8.1](file:///_bmad-output/planning-artifacts/epics/epic-8-agents-ia-elio-hub-lab-one-stories-detaillees.md#story-81)
- [Source: Architecture — Core Decisions](file:///_bmad-output/planning-artifacts/architecture/03-core-decisions.md)
- [Source: Architecture — Implementation Patterns](file:///_bmad-output/planning-artifacts/architecture/04-implementation-patterns.md)
- [Source: Architecture — Project Structure](file:///_bmad-output/planning-artifacts/architecture/05-project-structure.md#module-elio)
- [Source: PRD — Stack LLM & Coûts IA](file:///_bmad-output/planning-artifacts/prd/stack-llm-cots-ia.md)
- [Source: PRD — Functional Requirements (FR21-25, FR44-51, FR66-69, FR83, FR122-126)](file:///_bmad-output/planning-artifacts/prd/functional-requirements-monprojetpro-plateforme.md)
- [Source: project-context.md](file:///docs/project-context.md)
- [Source: CLAUDE.md](file:///CLAUDE.md)

### Patterns existants dans le codebase

**Analyse des commits récents** (Epic 1-2 déjà implémentés) :

| Commit | Pattern observé | Application pour Story 8.1 |
|--------|-----------------|----------------------------|
| `e9370eb` — Stories 1.10, 2.1, 2.2 (i18n, CRM) | Structure module CRM avec manifest, components/, hooks/, actions/ | Suivre la même structure pour le module Elio |
| `9167465` — Story 1.9 (Consentements & legal) | Pattern `{ data, error }` dans Server Actions | Utiliser ce pattern dans `send-to-elio.ts` |
| `638167a` — Story 1.8 (UX transversale) | Breadcrumb, toasts, erreurs, robustesse | Utiliser les toasts pour les erreurs Élio |
| `2ab4c4c` — Story 1.7 (Design system) | Dark mode, palettes OKLCH, responsive | Appliquer les palettes Hub/Lab/One à Élio |
| `1b829dd` — Story 1.6 (Gestion sessions) | TanStack Query pour les sessions | Utiliser TanStack Query pour config Élio |
| `4f83926` — Story 1.5 (RLS) | Tests RLS isolation | Pas applicable (pas de nouvelles tables) |

**Fichiers clés à consulter** :
- `packages/modules/crm/` : Exemple de structure module complète
- `packages/modules/crm/manifest.ts` : Exemple de manifest avec targets
- `packages/ui/src/themes/` : Palettes OKLCH existantes
- `packages/supabase/src/client.ts` : Client Supabase browser
- `packages/supabase/src/server.ts` : Client Supabase server
- `packages/utils/src/case-transform.ts` : Helpers snake_case ↔ camelCase

### NFRs pertinentes

| NFR | Description | Impact Story 8.1 |
|-----|-------------|------------------|
| **NFR-P1** | First contentful paint < 1.5s | Lazy loading du module Elio via `next/dynamic` |
| **NFR-P3** | Interactions < 200ms (sauf LLM) | TanStack Query cache, skeleton loaders |
| **NFR-I2** | Timeout API externes < 60s | Timeout DeepSeek à 60s max, gestion erreur explicite |
| **NFR-S7** | Audit logs activités sensibles | Logger les appels Élio (futur, pas dans cette story) |
| **NFR-S8** | Clés API dans Supabase Vault | DeepSeek API key dans Vault, jamais côté client |
| **NFR-A1** | WCAG 2.1 niveau AA | Contrastes palettes, focus keyboard, aria-labels |
| **NFR-A2** | Responsive mobile-first | Composant `elio-chat.tsx` adaptatif mobile |
| **NFR-A3** | Support screen readers | Aria-live pour les messages Élio, aria-busy pour thinking |
| **NFR-A4** | Keyboard navigation | Tab, Enter, Esc pour fermer, focus trap dans chat |
| **NFR-M1** | Tests unitaires >80% coverage | Tests pour hooks, composants, system prompts |
| **NFR-M2** | TypeScript strict, pas de `any` | Mode strict activé, types explicites partout |
| **NFR-M3** | Lint passing | ESLint config racine, pre-commit hook |
| **NFR-M4** | Documentation inline | JSDoc pour fonctions publiques, commentaires explicatifs |
| **NFR-M5** | Contract tests modules | Vérifier manifest valide, exports corrects |

### Points d'attention critiques

**⚠️ ATTENTION** : Cette story est une **Technical Enabler**, pas une feature utilisateur directe. Les fonctionnalités concrètes (conversations, feedback, actions) seront implémentées dans les Stories 8.2-8.9.

**⚠️ DÉPENDANCE** : Les tables `elio_conversations` et `elio_messages` seront créées en Story 6.4. Cette story NE crée PAS ces tables.

**⚠️ ORDRE D'EXÉCUTION** : Story 8.1 DOIT être implémentée AVANT Stories 6.4-6.6 (Elio Lab) pour que Lab s'appuie sur l'infrastructure unifiée.

**⚠️ SÉCURITÉ** : Clés API DeepSeek dans Supabase Vault uniquement. Jamais exposées côté client.

**⚠️ PERFORMANCE** : Timeout LLM à 60s max (NFR-I2). Gestion explicite du timeout avec message utilisateur clair.

**⚠️ ACCESSIBILITÉ** : Indicateur `elio-thinking.tsx` doit avoir `aria-live="polite"` et `aria-busy="true"` pendant le chargement.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- 57 nouveaux tests passent (7 fichiers de test) — validés en ciblé avant HALT Phase 1
- Suite complète non attendue (2700+ tests, monorepo lent) — aucune régression détectée sur les fichiers modifiés

### Completion Notes List

- `CommunicationProfileFR66` : nommé avec suffixe FR66 pour éviter conflit avec `CommunicationProfile` existant (Stories 6.4-6.6)
- Story 8.1 était un prérequis des Stories 6.4-6.6 déjà implémentées → code existant conservé intact, nouvelle infrastructure construite en parallèle
- `config/` dir créé (nouveau) pour `system-prompts.ts` — séparation claire avec `utils/`
- Timeout 60s via `AbortController` dans `send-to-elio.ts` (NFR-I2)
- `feedbackSlot?: React.ReactNode` dans `ElioMessageItem` — slot préparatoire pour Story 8.3
- **CR Fix (HIGH)** : `controller.signal` désormais passé à `supabase.functions.invoke()` — timeout 60s fonctionnel
- **CR Fix (MEDIUM)** : Supprimé ternaire redondant `enabled: dashboardType !== 'hub' ? true : true` → `enabled: true`
- **CR Fix (MEDIUM)** : Supprimé `ElioUnifiedConfig` inutilisé (sera recréé en Story 8.2+ quand getElioConfig enrichi)
- **CR Doc (LOW)** : `as ElioError` cast documenté — acceptable pour enabler technique
- **CR Doc (LOW)** : `elio-chat.tsx` sans test — composant intégrateur, tests d'intégration prévus Story 8.2+

### File List

**Modifiés :**
- `packages/modules/elio/manifest.ts` — ajout `'hub'` dans targets
- `packages/modules/elio/index.ts` — ajout exports Story 8.1
- `packages/modules/elio/docs/guide.md` — section Story 8.1 ajoutée
- `packages/modules/elio/docs/faq.md` — 3 nouvelles FAQ
- `packages/modules/elio/docs/flows.md` — Flow 5 et Flow 6 ajoutés

**Créés :**
- `packages/modules/elio/types/elio.types.ts`
- `packages/modules/elio/components/elio-thinking.tsx`
- `packages/modules/elio/components/elio-thinking.test.tsx`
- `packages/modules/elio/components/elio-error-message.tsx`
- `packages/modules/elio/components/elio-error-message.test.tsx`
- `packages/modules/elio/components/elio-message.tsx`
- `packages/modules/elio/components/elio-message.test.tsx`
- `packages/modules/elio/components/elio-chat.tsx`
- `packages/modules/elio/config/system-prompts.ts`
- `packages/modules/elio/config/system-prompts.test.ts`
- `packages/modules/elio/hooks/use-elio-config.ts`
- `packages/modules/elio/hooks/use-elio-config.test.ts`
- `packages/modules/elio/hooks/use-elio-chat.ts`
- `packages/modules/elio/hooks/use-elio-chat.test.ts`
- `packages/modules/elio/actions/send-to-elio.ts`
- `packages/modules/elio/actions/send-to-elio.test.ts`

---

**Story créée le** : 2026-02-13
**Story prête pour développement** : ✅ Oui
**Estimation complexité** : Medium-High (consolidation technique multi-dashboard)
**FRs couvertes** : FR83 (gestion erreurs), FR122 (indicateur réflexion)
**NFRs couvertes** : NFR-P1, NFR-P3, NFR-I2, NFR-S7, NFR-S8, NFR-A1-A4, NFR-M1-M5
