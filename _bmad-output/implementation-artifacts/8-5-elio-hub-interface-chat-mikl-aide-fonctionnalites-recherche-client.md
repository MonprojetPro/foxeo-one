# Story 8.5: Élio Hub — Interface chat MiKL, aide fonctionnalités & recherche client

Status: done

## Story

As a **MiKL (opérateur)**,
I want **converser avec Élio Hub pour obtenir de l'aide sur les fonctionnalités, rechercher des informations clients et optimiser mon workflow quotidien**,
So that **j'ai un assistant IA dans mon cockpit qui me fait gagner du temps au quotidien**.

## Acceptance Criteria

### AC1 : Interface chat Élio Hub (FR21)

**Given** MiKL accède au module Élio dans le Hub
**When** le chat Élio Hub se charge
**Then** l'interface unifiée `elio-chat.tsx` s'affiche avec `dashboardType='hub'` :

- **Palette Hub** : cyan/turquoise (Minimal Futuriste dark mode)
- **Header** : "Élio Hub — Votre assistant" avec avatar Élio Hub
- **Zone de chat** avec historique
- **Champ de saisie** avec placeholder : "Demande-moi n'importe quoi sur Foxeo..."
- **Panneau de conversations** latéral (Story 8.2)

**And** un message d'accueil s'affiche si c'est la première conversation :
> "Hey MiKL ! Je suis Élio Hub, ton assistant. Je peux t'aider à naviguer dans le Hub, chercher des infos clients, corriger tes textes ou générer des brouillons. Qu'est-ce que tu veux faire ?"

### AC2 : Aide sur les fonctionnalités du Hub (FR22)

**Given** MiKL demande de l'aide sur une fonctionnalité du Hub
**When** il pose une question comme "Comment je crée un nouveau client ?" ou "Où je vois les demandes en attente ?"
**Then** Élio Hub répond avec :

- Une explication claire de la fonctionnalité
- Le chemin de navigation pour y accéder (ex : "Va dans Clients → Nouveau client")
- Un lien cliquable vers la page concernée si possible

**And** le system prompt de Élio Hub inclut un bloc de documentation des fonctionnalités du Hub :

```
# Fonctionnalités Hub disponibles
- Gestion clients : /modules/crm → créer, modifier, voir fiche complète
- Validation Hub : /modules/validation-hub → examiner et traiter les demandes
- Chat clients : /modules/chat → échanger avec les clients
- Documents : /modules/documents → partager et gérer les documents
- Visio : /modules/visio → planifier et lancer des visioconférences
- Analytics : /modules/analytics → consulter les statistiques
```

**And** si MiKL pose une question hors du périmètre Hub, Élio indique :
> "Ça sort un peu de mon périmètre, mais je peux essayer de t'aider quand même !"

### AC3 : Recherche d'informations clients (FR23)

**Given** MiKL demande des informations sur un client
**When** il pose une question comme "Où en est Sandrine ?" ou "Quel est le parcours de Thomas ?"
**Then** Élio Hub effectue une recherche dans Supabase via une fonction dédiée :

- Le system prompt inclut un bloc d'instructions : "Tu as accès à la base de données clients. Utilise les fonctions disponibles pour chercher des informations."
- La Server Action `sendToElio()` détecte les intentions de recherche et exécute les requêtes Supabase correspondantes (clients, parcours, validation_requests, documents)
- Élio répond avec les informations trouvées formatées clairement :
  - Nom, entreprise, type de client, statut
  - Parcours actuel (si Lab) avec progression
  - Dernières demandes de validation
  - Derniers messages échangés

**And** les requêtes respectent les policies RLS (opérateur voit tous ses clients)
**And** si aucun client ne correspond, Élio répond :
> "Je n'ai trouvé aucun client correspondant à '{recherche}'. Tu veux vérifier l'orthographe ?"

### AC4 : Implémentation technique recherche client

**Given** l'implémentation technique de la recherche client
**When** Élio Hub reçoit une question client
**Then** l'approche technique est la suivante :

1. Le LLM reçoit le system prompt avec les schémas de données disponibles
2. Le LLM génère une intention structurée (ex : `{ action: 'search_client', query: 'Sandrine' }`)
3. La Server Action parse la réponse LLM, détecte l'intention, exécute la requête Supabase
4. Les résultats sont réinjectés dans le contexte LLM pour formulation de la réponse finale

**And** cette mécanique de "tool use / function calling" est implémentée dans `send-to-elio.ts` comme un pattern réutilisable

## Tasks / Subtasks

- [x] **Task 1** : Configurer la palette Hub dans `elio-chat.tsx` (AC: #1, FR21)
  - [x] 1.1 : Vérifier que `dashboardType='hub'` applique la palette cyan/turquoise
  - [x] 1.2 : Tester le header "Élio Hub — Votre assistant"
  - [x] 1.3 : Tester le placeholder "Demande-moi n'importe quoi sur Foxeo..."

- [x] **Task 2** : Créer le message d'accueil Hub (AC: #1)
  - [x] 2.1 : Ajouter dans `config/welcome-messages.ts`
  - [x] 2.2 : Message casual : "Hey MiKL ! Je suis Élio Hub, ton assistant. Je peux t'aider à naviguer dans le Hub, chercher des infos clients, corriger tes textes ou générer des brouillons. Qu'est-ce que tu veux faire ?"

- [x] **Task 3** : Créer la documentation des fonctionnalités Hub (AC: #2, FR22)
  - [x] 3.1 : Créer `config/hub-features-documentation.ts`
  - [x] 3.2 : Lister toutes les fonctionnalités Hub avec chemins de navigation
  - [x] 3.3 : Intégrer dans le system prompt Hub

- [x] **Task 4** : Adapter le system prompt Hub (AC: #2)
  - [x] 4.1 : Modifier `config/system-prompts.ts` pour Hub
  - [x] 4.2 : Ajouter le bloc documentation fonctionnalités
  - [x] 4.3 : Ajouter la phrase hors périmètre

- [x] **Task 5** : Créer le système de recherche client (AC: #3, #4, FR23)
  - [x] 5.1 : Créer `actions/search-client-info.ts`
  - [x] 5.2 : Recherche par nom, entreprise, email
  - [x] 5.3 : Fetch données : client, parcours, validation_requests, messages
  - [x] 5.4 : Respecter RLS (opérateur voit ses clients)
  - [x] 5.5 : Retourner `{ data: clientInfo, error: null }`

- [x] **Task 6** : Implémenter la détection d'intention (AC: #4)
  - [x] 6.1 : Créer `utils/detect-intent.ts`
  - [x] 6.2 : Parser la réponse LLM pour détecter `action: 'search_client'`
  - [x] 6.3 : Extraire le query (nom du client recherché)

- [x] **Task 7** : Intégrer la recherche dans `send-to-elio.ts`
  - [x] 7.1 : Détecter l'intention dans la réponse LLM
  - [x] 7.2 : Exécuter la recherche client si détectée
  - [x] 7.3 : Réinjecter les résultats dans le contexte LLM
  - [x] 7.4 : Retourner la réponse finale formatée

- [x] **Task 8** : Ajouter les schémas DB dans le system prompt
  - [x] 8.1 : Créer `config/hub-database-schemas.ts`
  - [x] 8.2 : Schémas simplifiés : clients, validation_requests, messages, parcours
  - [x] 8.3 : Intégrer dans le system prompt Hub

- [x] **Task 9** : Tests
  - [x] 9.1 : Tester l'aide fonctionnalités (questions Hub)
  - [x] 9.2 : Tester la recherche client (trouvé, non trouvé)
  - [x] 9.3 : Tester la détection d'intention
  - [x] 9.4 : Tester le respect RLS (opérateur ne voit que ses clients)

## Dev Notes

### Documentation fonctionnalités Hub

```typescript
// config/hub-features-documentation.ts
export const HUB_FEATURES_DOCUMENTATION = `
# Fonctionnalités Hub disponibles

## Gestion clients
- **Créer un client** : Va dans "Clients" → Clic sur "Nouveau client"
- **Voir la liste des clients** : "Clients" dans le menu principal
- **Fiche client complète** : Clic sur un client dans la liste
- **Modifier un client** : Fiche client → Bouton "Modifier"

## Validation Hub
- **Voir les demandes en attente** : "Validation Hub" dans le menu
- **Traiter une demande** : Clic sur une demande → Boutons Valider/Refuser/Demander précisions
- **Compter les demandes** : Badge sur l'icône Validation Hub (temps réel)

## Communication
- **Chat avec un client** : Fiche client → Onglet "Messages" OU "Chat" dans le menu
- **Visio avec un client** : "Visio" dans le menu → Démarrer une salle
- **Voir l'historique visio** : "Visio" → Onglet "Historique"

## Documents
- **Partager un document** : "Documents" → Upload → Partager avec client
- **Voir les documents d'un client** : Fiche client → Onglet "Documents"

## Analytics
- **Statistiques globales** : "Analytics" dans le menu
- **Temps passé par client** : Analytics → Onglet "Temps passé"

## Administration
- **Logs d'activité** : "Admin" → "Logs"
- **Mode maintenance** : "Admin" → "Système" → Toggle maintenance
- **Surveiller les instances** : "Admin" → "Instances"
`
```

### Schémas DB pour recherche client

```typescript
// config/hub-database-schemas.ts
export const HUB_DATABASE_SCHEMAS = `
# Schémas de base de données disponibles

## Table clients
- id (UUID)
- operator_id (UUID) — ID de l'opérateur
- name (TEXT) — Nom complet
- email (TEXT)
- company (TEXT) — Entreprise
- client_type (TEXT) — 'ponctuel' | 'lab' | 'one'
- status (TEXT) — 'active' | 'suspended' | 'archived'
- created_at (TIMESTAMP)

## Table validation_requests
- id (UUID)
- client_id (UUID)
- type (TEXT) — 'brief_lab' | 'evolution_one'
- title (TEXT)
- status (TEXT) — 'pending' | 'approved' | 'rejected'
- created_at (TIMESTAMP)

## Table elio_messages
- id (UUID)
- conversation_id (UUID)
- role (TEXT) — 'user' | 'assistant'
- content (TEXT)
- created_at (TIMESTAMP)

## Table parcours (Lab uniquement)
- id (UUID)
- client_id (UUID)
- current_step (INTEGER)
- total_steps (INTEGER)
- status (TEXT) — 'in_progress' | 'completed'

**Note** : Tu peux rechercher et filtrer ces tables pour répondre aux questions de MiKL.
`
```

### Détection d'intention

```typescript
// utils/detect-intent.ts
export interface Intent {
  action: 'search_client' | 'help_feature' | 'general'
  query?: string
  feature?: string
}

export function detectIntent(userMessage: string): Intent {
  const lowerMessage = userMessage.toLowerCase()

  // Recherche client
  const clientPatterns = [
    /où en est (.+)\?/,
    /quel est le parcours de (.+)\?/,
    /infos? (sur|client) (.+)/,
    /recherche (.+)/,
  ]

  for (const pattern of clientPatterns) {
    const match = lowerMessage.match(pattern)
    if (match) {
      const query = match[match.length - 1] // Dernier groupe de capture
      return { action: 'search_client', query }
    }
  }

  // Aide fonctionnalités
  const helpPatterns = [
    /comment (je |)(.+)\?/,
    /où (je |)(.+)\?/,
    /c'est quoi (.+)\?/,
  ]

  for (const pattern of helpPatterns) {
    const match = lowerMessage.match(pattern)
    if (match) {
      return { action: 'help_feature', feature: match[match.length - 1] }
    }
  }

  return { action: 'general' }
}
```

### Recherche client

```typescript
// actions/search-client-info.ts
'use server'

import { createServerClient } from '@foxeo/supabase/server'

export async function searchClientInfo(query: string): Promise<ActionResponse<ClientInfo>> {
  const supabase = createServerClient()

  // 1. Rechercher le client (nom, email, entreprise)
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
    .limit(5)

  if (clientError) {
    return { data: null, error: { message: 'Erreur de recherche', code: 'DB_ERROR' } }
  }

  if (!clients || clients.length === 0) {
    return { data: null, error: { message: 'Aucun client trouvé', code: 'NOT_FOUND' } }
  }

  // Si plusieurs résultats, retourner la liste
  if (clients.length > 1) {
    return {
      data: {
        multiple: true,
        clients: clients.map(c => ({ name: c.name, email: c.email, company: c.company })),
      },
      error: null,
    }
  }

  // Un seul client trouvé → fetch détails complets
  const client = clients[0]

  // 2. Fetch parcours si Lab
  let parcours = null
  if (client.client_type === 'lab') {
    const { data } = await supabase
      .from('parcours')
      .select('*')
      .eq('client_id', client.id)
      .single()
    parcours = data
  }

  // 3. Fetch dernières demandes validation
  const { data: requests } = await supabase
    .from('validation_requests')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(3)

  // 4. Fetch derniers messages
  const { data: recentMessages } = await supabase
    .from('elio_messages')
    .select('*, elio_conversations!inner(user_id)')
    .eq('elio_conversations.user_id', client.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    data: {
      client,
      parcours,
      validationRequests: requests ?? [],
      recentMessages: recentMessages ?? [],
    },
    error: null,
  }
}
```

### Integration dans send-to-elio.ts

```typescript
// actions/send-to-elio.ts
export async function sendToElio(
  dashboardType: DashboardType,
  message: string,
  clientId?: string
): Promise<ActionResponse<ElioMessage>> {
  // ... code existant ...

  // Détecter l'intention (Hub uniquement)
  if (dashboardType === 'hub') {
    const intent = detectIntent(message)

    if (intent.action === 'search_client' && intent.query) {
      // Exécuter la recherche
      const { data: clientInfo, error: searchError } = await searchClientInfo(intent.query)

      if (searchError) {
        return {
          data: null,
          error: { message: `Je n'ai trouvé aucun client correspondant à "${intent.query}". Tu veux vérifier l'orthographe ?`, code: 'NOT_FOUND' },
        }
      }

      // Réinjecter les résultats dans le contexte LLM
      const enrichedPrompt = `${systemPrompt}\n\n# Résultats de recherche client\n${JSON.stringify(clientInfo, null, 2)}\n\nFormule une réponse claire avec ces informations.`

      // Appel LLM avec le contexte enrichi
      // ...
    }
  }

  // Appel LLM standard
  // ...
}
```

### References

- [Source: Epic 8 — Story 8.5](file:///_bmad-output/planning-artifacts/epics/epic-8-agents-ia-elio-hub-lab-one-stories-detaillees.md#story-85)
- [Source: PRD — FR21, FR22, FR23](file:///_bmad-output/planning-artifacts/prd/functional-requirements-foxeo-plateforme.md)

---

## Dev Agent Record

### Implementation Plan

- Task 1: Exporté `PALETTE_CLASSES`, `PALETTE_FOCUS_RING`, `HEADER_LABELS`, `HUB_PLACEHOLDER_DEFAULT` depuis `elio-chat.tsx`. Ajouté un `<header>` dans `ElioChatSimple` et `ElioChatPersisted` affichant le titre selon `dashboardType`.
- Task 2: Mis à jour le message d'accueil Hub casual dans `generate-welcome-message.ts` avec le message exact spécifié par l'AC1.
- Task 3: Créé `config/hub-features-documentation.ts` avec documentation complète de toutes les fonctionnalités Hub + chemins de navigation.
- Task 4: Mis à jour `buildHubPrompt()` dans `system-prompts.ts` pour injecter `HUB_FEATURES_DOCUMENTATION`, `HUB_DATABASE_SCHEMAS` et la phrase hors périmètre.
- Task 5: Créé `actions/search-client-info.ts` — recherche clients par nom/email/entreprise, fetch parcours (Lab uniquement), validation_requests et elio_messages. RLS via `createServerSupabaseClient`.
- Task 6: Créé `utils/detect-intent.ts` — détection d'intention regex-based: `search_client`, `help_feature`, `general`.
- Task 7: Mis à jour `send-to-elio.ts` pour détecter l'intention Hub avant l'appel LLM et réinjecter les résultats de recherche dans le system prompt.
- Task 8: Créé `config/hub-database-schemas.ts` intégré dans le system prompt Hub.
- Task 9: 75 tests écrits et passants (7 fichiers de test).

### Completion Notes

- Tous les ACs satisfaits : AC1 (palette + header + placeholder), AC2 (fonctionnalités + hors périmètre), AC3 (recherche client RLS), AC4 (détection d'intention + réinjection LLM)
- Pattern detect-intent est réutilisable pour les stories suivantes
- Tests: 81 passing, 0 failing (75 Phase 1 + 6 CR fixes)
- CR Fixes: (1) HUB_PLACEHOLDER_DEFAULT auto-appliqué pour Hub, (2) .order().limit() sur elio_messages, (3) SQL wildcard escaping, (4) types explicites au lieu de Record<string,unknown>, (5) JSX indentation ElioChatPersisted, (6) hub-database-schemas.test.ts ajouté

## File List

### New Files
- `packages/modules/elio/components/elio-chat.test.ts`
- `packages/modules/elio/config/hub-features-documentation.ts`
- `packages/modules/elio/config/hub-features-documentation.test.ts`
- `packages/modules/elio/config/hub-database-schemas.ts`
- `packages/modules/elio/utils/detect-intent.ts`
- `packages/modules/elio/utils/detect-intent.test.ts`
- `packages/modules/elio/actions/search-client-info.ts`
- `packages/modules/elio/actions/search-client-info.test.ts`

### Modified Files
- `packages/modules/elio/components/elio-chat.tsx`
- `packages/modules/elio/config/system-prompts.ts`
- `packages/modules/elio/config/system-prompts.test.ts`
- `packages/modules/elio/actions/generate-welcome-message.ts`
- `packages/modules/elio/actions/generate-welcome-message.test.ts`
- `packages/modules/elio/actions/send-to-elio.ts`
- `packages/modules/elio/actions/send-to-elio.test.ts`
- `packages/modules/elio/index.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/modules/elio/config/hub-database-schemas.test.ts`
- `_bmad-output/implementation-artifacts/8-5-elio-hub-interface-chat-mikl-aide-fonctionnalites-recherche-client.md`

## Change Log

- 2026-03-04: Story 8.5 implémentée — Interface Hub Élio avec palette, header, message d'accueil enrichi, documentation fonctionnalités, schémas DB, détection d'intention, recherche client RLS, intégration send-to-elio. 75 tests.

---

**Story créée le** : 2026-02-13
**Story prête pour développement** : ✅ Oui
**Dépendances** : Story 8.1, 8.2
**FRs couvertes** : FR21 (chat Hub), FR22 (aide fonctionnalités), FR23 (recherche client)
