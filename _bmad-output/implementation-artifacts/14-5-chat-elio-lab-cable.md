# Story 14.5 : Chat Élio Lab Câblé sur l'Agent Assigné

Status: done

## Story

En tant que **client Lab**,
je veux **interagir avec un Élio spécialisé pour chaque étape de mon parcours**,
afin de **bénéficier d'un accompagnement expert adapté au sujet de l'étape en cours**.

## Acceptance Criteria

**Given** un client Lab est sur une étape de son parcours
**When** il ouvre le chat Élio
**Then** le header affiche l'image fox personnalisée de l'agent assigné à cette étape + son nom (ex : "Élio Branding")

**Given** le client ouvre le chat Élio d'une étape
**When** la conversation démarre
**Then** Élio utilise le system prompt + le modèle + la température définis dans le fichier agent (via `elio_lab_agents`)

**Given** MiKL a injecté un contexte non-consommé pour cette étape
**When** le client ouvre le chat
**Then** Élio ouvre la conversation avec le message d'annonce MiKL (Story 14.4) avant toute autre interaction, puis marque le contexte comme consommé

**Given** aucun contexte non-consommé n'existe
**When** le client ouvre le chat
**Then** Élio démarre normalement selon son system prompt

**Given** l'étape n'a pas d'agent assigné (cas legacy ou erreur de config)
**When** le chat s'ouvre
**Then** Élio utilise la configuration globale du client comme fallback (elio_configs existant)

## Tasks / Subtasks

- [ ] Task 1 — Action de résolution de config (AC: #2, #3, #5)
  - [ ] 1.1 `packages/modules/elio/actions/get-effective-step-config.ts` — résout la config complète pour une étape :
    1. Récupère `client_parcours_agent_id` pour ce client + étape
    2. Joint `elio_lab_agents` pour obtenir system_prompt, model, temperature
    3. Récupère contextes non-consommés (`client_step_contexts WHERE consumed_at IS NULL`)
    4. Compose le message d'annonce si contexte présent
    5. Fallback vers `elio_configs` global si pas d'agent assigné
  - [ ] 1.2 Tests co-localisés

- [ ] Task 2 — Intégration chat Lab (AC: #1, #2, #3, #4)
  - [ ] 2.1 Modifier `ElioParcoursPanel` (ou composant chat Lab existant) pour appeler `get-effective-step-config` au chargement
  - [ ] 2.2 Passer `model` et `temperature` de l'agent à l'Edge Function `elio-chat`
  - [ ] 2.3 Injecter le system_prompt de l'agent dans le premier message système
  - [ ] 2.4 Si contexte → injecter le message d'annonce comme premier message Élio
  - [ ] 2.5 Appeler `consume-step-context` après injection (marquer consommé)

- [ ] Task 3 — Header chat (AC: #1)
  - [ ] 3.1 Afficher image agent + nom agent dans le header du chat Élio Lab (remplace l'avatar générique)
  - [ ] 3.2 Fallback : avatar renard générique si image absente

- [ ] Task 4 — Tests
  - [ ] 4.1 Tests unitaires `get-effective-step-config` (agent présent, fallback global, contexte consommé)
  - [ ] 4.2 Test composant header avec image agent

## Dev Notes

### Edge Function elio-chat
L'Edge Function existante accepte déjà `model` et `systemPrompt` en paramètres. Il suffit de les passer depuis le composant client.

### Ordre des messages au démarrage
```
1. [system] system_prompt de l'agent
2. [system] profil de communication du client (existant)
3. [assistant] message d'annonce MiKL (si contexte non-consommé)
4. Conversation normale
```

### Consommation du contexte
`consume-step-context` est appelé côté client (Server Action) dès que le chat charge et présente le message d'annonce. Race condition minime (acceptable).

## File List

**Created:**
- `supabase/migrations/00100_create_client_step_contexts.sql`
- `packages/modules/elio/actions/get-effective-step-config.ts`
- `packages/modules/elio/actions/get-effective-step-config.test.ts`
- `packages/modules/elio/actions/consume-step-context.ts`
- `packages/modules/elio/actions/consume-step-context.test.ts`

**Modified:**
- `packages/modules/elio/actions/send-to-elio.ts` — ajout `agentOverrides?: { model?, temperature? }` + propagation à `callLLM`
- `packages/modules/elio/index.ts` — export `getEffectiveStepConfig`, `consumeStepContext`, `EffectiveStepConfig`
- `packages/modules/parcours/components/step-elio-chat.tsx` — câblage agent assigné, header image, injection message d'annonce MiKL
- `packages/modules/parcours/components/step-elio-chat.test.tsx` — 4 nouveaux tests Story 14.5 (13 tests total)

## Completion Notes

- Migration 00100 crée `client_step_contexts` + SELECT/UPDATE client + policies client sur `elio_lab_agents` et `client_parcours_agents`
- `getEffectiveStepConfig` résout l'agent par `step_order = stepNumber` (correspondance avec `parcours_steps.step_number`)
- `agentOverrides` ignoré pour dashboards `one`/`hub` — dette technique documentée (scope story = `lab` uniquement)
- Fix SCAN : RLS UPDATE WITH CHECK (empêche dé-consommation), logging contextError non-bloquant, condition agentOverrides corrigée
