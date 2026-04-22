# Story 14.3 : Assemblage du Parcours Client depuis le Catalogue

Status: done

## Story

En tant qu'**opérateur MiKL**,
je veux **composer le parcours Lab d'un client en choisissant les agents depuis le catalogue**,
afin de **personnaliser l'accompagnement de chaque client avec les Élio experts adaptés à son besoin**.

## Acceptance Criteria

**Given** MiKL est sur la fiche client → onglet Lab, et le Lab n'est pas encore lancé
**When** il clique "Lancer le Lab"
**Then** un modal d'assemblage s'ouvre avec la liste des agents actifs du catalogue

**Given** le modal d'assemblage est ouvert
**When** MiKL sélectionne des agents et les ordonne
**Then** chaque agent sélectionné devient une étape du parcours avec un label modifiable (ex : "Étape 1 — Identité de marque")

**Given** MiKL a composé le parcours et clique "Lancer"
**When** la sauvegarde est effectuée
**Then** les entrées sont créées dans `client_parcours_agents` et le client voit ses étapes dans son Lab

**Given** un parcours est en cours
**When** MiKL veut ajouter une étape
**Then** un bouton "Ajouter une étape" permet de sélectionner un agent supplémentaire depuis le catalogue — il s'ajoute à la suite

**Given** MiKL ouvre la fiche d'un client dont le parcours est actif
**When** l'onglet Lab se charge
**Then** la liste des étapes du parcours s'affiche avec : image agent, nom agent, label étape, statut (En attente / En cours / Terminé / Ignoré)

**Given** le modal d'assemblage est ouvert avec 0 agent actif dans le catalogue
**When** MiKL essaie de lancer
**Then** un message d'erreur s'affiche : "Aucun agent disponible. Synchronisez d'abord le catalogue Élio Lab."

## Tasks / Subtasks

- [x] Task 1 — Migration SQL `client_parcours_agents` (AC: #3, #4)
  - [x] 1.1 Créer migration `00098_create_client_parcours_agents.sql`
  - [x] 1.2 Table : `id` (UUID PK), `client_id` (UUID FK clients), `elio_lab_agent_id` (UUID FK elio_lab_agents), `step_order` (INTEGER), `step_label` (TEXT), `status` (TEXT CHECK IN ('pending','active','completed','skipped') DEFAULT 'pending'), `created_at`, `updated_at`
  - [x] 1.3 Index : `idx_client_parcours_agents_client_id` sur `client_id`
  - [x] 1.4 RLS : `is_operator()` pour toutes les opérations
  - [x] 1.5 Trigger `trg_client_parcours_agents_updated_at`

- [x] Task 2 — Server Actions (AC: #3, #4, #5)
  - [x] 2.1 `packages/modules/parcours/actions/launch-client-parcours.ts`
  - [x] 2.2 `packages/modules/parcours/actions/get-client-parcours-agents.ts`
  - [x] 2.3 `packages/modules/parcours/actions/add-parcours-step.ts`
  - [x] 2.4 Tests co-localisés (25 tests)

- [x] Task 3 — Modal d'assemblage (AC: #1, #2, #3, #6)
  - [x] 3.1 `packages/modules/parcours/components/launch-parcours-modal.tsx`
  - [x] 3.2 Ordonnancement ↑↓
  - [x] 3.3 Validation : au moins 1 agent

- [x] Task 4 — Vue parcours dans fiche client (AC: #5)
  - [x] 4.1 `ClientParcoursAgentsList` remplace `ParcoursHubTab`
  - [x] 4.2 `packages/modules/parcours/components/client-parcours-agents-list.tsx`
  - [x] 4.3 Bouton "Lancer le Lab" si aucun parcours
  - [x] 4.4 9 tests composant

- [x] Task 5 — Nettoyage
  - [x] 5.1 `ParcoursHubTab` retiré des exports et de l'app Hub
  - [x] 5.2 `packages/modules/parcours/index.ts` mis à jour

## Dev Notes

- `client_parcours_agents` remplace la notion de `parcours_steps` pour la config Élio — les étapes de progression client (complètes/ignorées) restent dans `parcours_steps`
- Le `step_order` commence à 1, pas 0
- Un client peut avoir plusieurs `client_parcours_agents` avec des agents différents ou le même agent répété (cas d'usage : deux sessions branding séparées)
- L'ordonnancement drag & drop est reporté à une story future — boutons ↑↓ suffisent pour le MVP

## File List

- `supabase/migrations/00098_create_client_parcours_agents.sql` (new)
- `packages/modules/parcours/types/parcours.types.ts` (updated — nouveaux types 14.3)
- `packages/modules/parcours/actions/launch-client-parcours.ts` (new)
- `packages/modules/parcours/actions/launch-client-parcours.test.ts` (new)
- `packages/modules/parcours/actions/get-client-parcours-agents.ts` (new)
- `packages/modules/parcours/actions/get-client-parcours-agents.test.ts` (new)
- `packages/modules/parcours/actions/add-parcours-step.ts` (new)
- `packages/modules/parcours/actions/add-parcours-step.test.ts` (new)
- `packages/modules/parcours/components/launch-parcours-modal.tsx` (new)
- `packages/modules/parcours/components/add-step-modal.tsx` (new)
- `packages/modules/parcours/components/client-parcours-agents-list.tsx` (new)
- `packages/modules/parcours/components/client-parcours-agents-list.test.tsx` (new)
- `packages/modules/parcours/index.ts` (updated)
- `apps/hub/app/(dashboard)/modules/crm/clients/[clientId]/client-detail-with-support.tsx` (updated)

## Completion Notes

Migration à appliquer : `npx supabase db push --linked`
`ParcoursHubTab` reste dans le repo mais n'est plus exporté ni utilisé (peut être supprimé dans une story de nettoyage future).
