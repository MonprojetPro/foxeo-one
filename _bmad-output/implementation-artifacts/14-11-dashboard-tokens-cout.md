# Story 14.11 : Dashboard Tokens & Coûts IA

Status: ready-for-dev

## Story

En tant qu'**opérateur MiKL**,
je veux **voir en temps réel la consommation de tokens et les coûts associés**,
afin de **piloter mes dépenses API et réagir si la consommation dépasse mon budget**.

## Acceptance Criteria

**Given** MiKL est sur `/elio/hub`
**When** la page se charge
**Then** un dashboard avec des cartes stylées affiche la consommation tokens du mois en cours

**Given** le dashboard est chargé
**When** MiKL regarde les cartes
**Then** il voit : tokens totaux ce mois, coût estimé en euros, répartition par agent Lab, top 5 clients consommateurs, tendance hebdomadaire (mini graphique)

**Given** MiKL a défini un seuil d'alerte (ex : 50€/mois)
**When** la consommation atteint 80% du seuil
**Then** une notification Hub s'affiche : "⚠️ 80% de ton budget IA mensuel atteint (40€ / 50€)"

**Given** MiKL regarde la carte "Par agent"
**When** il clique sur un agent
**Then** un détail s'affiche : nombre de conversations, tokens moyens par conversation, coût total agent

**Given** MiKL veut configurer son seuil d'alerte
**When** il clique "Configurer le budget"
**Then** un champ input permet de saisir le seuil en euros — sauvegardé dans `system_config`

## Tasks / Subtasks

- [ ] Task 1 — Tracking tokens (AC: #1, #2)
  - [ ] 1.1 Migration `00100_create_elio_token_usage.sql` — table : `id`, `client_id`, `elio_lab_agent_id` (nullable), `conversation_id`, `input_tokens`, `output_tokens`, `model`, `cost_eur` (NUMERIC), `created_at`
  - [ ] 1.2 RLS : `is_operator()` uniquement
  - [ ] 1.3 Server Action `packages/modules/elio/actions/log-token-usage.ts` — appelée après chaque réponse Élio avec les données de consommation

- [ ] Task 2 — Calcul coût en euros (AC: #2)
  - [ ] 2.1 `packages/modules/elio/utils/token-cost-calculator.ts` — table de tarifs par modèle (Haiku/Sonnet/Opus, input/output séparés, basé sur tarifs Anthropic API publics)
  - [ ] 2.2 Tests unitaires du calculateur

- [ ] Task 3 — Server Actions dashboard (AC: #2, #3, #4)
  - [ ] 3.1 `packages/modules/elio/actions/get-token-usage-summary.ts` — agrège par période, par agent, par client
  - [ ] 3.2 `packages/modules/elio/actions/get-token-usage-by-agent.ts` — détail par agent
  - [ ] 3.3 `packages/modules/elio/actions/set-token-budget-alert.ts` — sauvegarde seuil dans `system_config`
  - [ ] 3.4 Tests co-localisés

- [ ] Task 4 — Composants cartes dashboard (AC: #1, #2, #4, #5)
  - [ ] 4.1 `packages/modules/elio/components/token-usage-card.tsx` — carte stylée dark Hub (accent cyan, chiffre large, tendance)
  - [ ] 4.2 `packages/modules/elio/components/token-cost-card.tsx` — carte coût euros avec barre de budget
  - [ ] 4.3 `packages/modules/elio/components/token-by-agent-card.tsx` — répartition par agent (mini barres)
  - [ ] 4.4 `packages/modules/elio/components/token-by-client-card.tsx` — top 5 clients
  - [ ] 4.5 `packages/modules/elio/components/token-trend-chart.tsx` — mini graphique tendance (Recharts ou CSS bars)
  - [ ] 4.6 Tests des composants

- [ ] Task 5 — Page Hub `/elio/hub` (AC: #1, #3, #5)
  - [ ] 5.1 `apps/hub/app/(dashboard)/elio/hub/page.tsx` — grille de cartes dashboard + bouton "Configurer le budget"
  - [ ] 5.2 Modal budget alert avec input euros
  - [ ] 5.3 TanStack Query pour le chargement des métriques

- [ ] Task 6 — Intégration tracking dans le chat
  - [ ] 6.1 Modifier le flux chat Élio Lab pour appeler `log-token-usage` après chaque réponse (les tokens sont retournés par l'API Anthropic dans les metadata)

## Dev Notes

### Tarifs Anthropic (Avril 2026 — à mettre à jour si nécessaire)
| Modèle | Input ($/1M tokens) | Output ($/1M tokens) |
|--------|--------------------|--------------------|
| Haiku 4.5 | $0.80 | $4.00 |
| Sonnet 4.6 | $3.00 | $15.00 |
| Opus 4.6 | $15.00 | $75.00 |

Taux de conversion USD → EUR : utiliser 0.92 (fixe pour l'affichage — pas besoin de taux temps réel).

### Tracking asynchrone
`log-token-usage` est appelé en fire-and-forget (pas de await bloquant) pour ne pas ralentir le chat.

### Graphique tendance
Utiliser des CSS bars simples plutôt qu'une librairie Recharts pour rester léger. Si Recharts est déjà dans le projet, l'utiliser.

## File List

*(auto-généré à la complétion)*
