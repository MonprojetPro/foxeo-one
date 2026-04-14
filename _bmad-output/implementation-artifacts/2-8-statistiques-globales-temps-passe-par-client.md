# Story 2.8: Statistiques globales & temps passé par client

Status: done

## Story

As a **MiKL (opérateur)**,
I want **voir des statistiques globales sur mon portefeuille (clients actifs, taux de graduation, revenus) et le temps passé estimé par client**,
So that **je pilote mon activité avec des données concrètes et je mesure la rentabilité de chaque client**.

## Acceptance Criteria

1. **AC1 — Dashboard KPIs** : Section statistiques du module CRM avec indicateurs (FR80) : nombre total clients (répartition actifs/inactifs/suspendus), répartition par type (Complet/Direct One/Ponctuel) en donut chart ou barres, nombre clients Lab actifs, nombre clients One actifs, taux de graduation Lab→One (% + total), MRR estimé (si module Facturation dispo, sinon "Module Facturation requis"). Cards avec sparklines/tendances (composants Tremor). Données via Server Component (RSC). Skeleton loader spécifique stats.

2. **AC2 — Tooltips KPIs** : Au survol d'un KPI, tooltip affiche le détail de calcul (ex: "12 clients Lab actifs sur 25 total").

3. **AC3 — Temps passé par client** : Section "Temps passé" (FR81) avec liste par client. Temps calculé depuis `activity_logs` : durée visios (réelle), messages (2 min/msg), validations Hub (5 min/validation). Chaque ligne : nom client, type, temps total estimé, dernière activité. Tri par "plus de temps passé" disponible.

4. **AC4 — Performance** : Chargement < 2 secondes (NFR-P1). Requêtes agrégées optimisées côté serveur.

5. **AC5 — Tests** : Tests unitaires co-localisés. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Server Actions / fonctions agrégation (AC: #1, #3)
  - [x] 1.1 `actions/get-portfolio-stats.ts` — Requête agrégée : count par type, count par statut, count Lab/One actifs
  - [x] 1.2 `actions/get-graduation-rate.ts` — Calcul taux graduation depuis `activity_logs` (type: 'client_graduated')
  - [x] 1.3 `actions/get-time-per-client.ts` — Requête `activity_logs` agrégée par client avec estimation temps
  - [x] 1.4 Constantes durées moyennes : `TIME_ESTIMATES = { visio: 'real', message: 120, validation: 300 }` (en secondes)

- [x] Task 2 — Types TypeScript (AC: #1, #3)
  - [x] 2.1 Types : `PortfolioStats`, `GraduationRate`, `ClientTimeEstimate`, `TimeEstimateConfig`
  - [x] 2.2 Schémas Zod si nécessaire

- [x] Task 3 — Hooks TanStack Query (AC: #1, #3)
  - [x] 3.1 `hooks/use-portfolio-stats.ts` — queryKey `['portfolio-stats']`
  - [x] 3.2 `hooks/use-time-per-client.ts` — queryKey `['time-per-client']`
  - [x] 3.3 StaleTime élevé (5-10 min) car données agrégées peu volatiles

- [x] Task 4 — Composants UI (AC: #1, #2, #3)
  - [x] 4.1 `components/stats-dashboard.tsx` — Layout grille des KPI cards
  - [x] 4.2 `components/kpi-card.tsx` — Card individuelle : valeur, label, sparkline/tendance, tooltip
  - [x] 4.3 `components/client-type-chart.tsx` — Donut chart répartition par type (Tremor `DonutChart`)
  - [x] 4.4 `components/time-per-client-table.tsx` — Table temps passé avec tri, formatage durée humain
  - [x] 4.5 `components/stats-skeleton.tsx` — Skeleton spécifique stats (grille de cards grisées)

- [x] Task 5 — Route et intégration (AC: #1)
  - [x] 5.1 Ajouter route `/modules/crm/stats` dans le manifest CRM
  - [x] 5.2 Page Server Component avec données initiales pré-fetchées
  - [x] 5.3 Sous-navigation CRM : Clients | Rappels | Statistiques

- [x] Task 6 — Tests (AC: #5)
  - [x] 6.1 Tests Server Actions : calculs agrégation, cas vides, performance
  - [x] 6.2 Tests composants : rendu cards, chart, table
  - [x] 6.3 Tests hooks
  - [x] 6.4 Tests edge cases : 0 clients, pas de graduations, pas d'activity_logs

- [x] Task 7 — Documentation (AC: #5)
  - [x] 7.1 MAJ `docs/guide.md`, `faq.md`, `flows.md`

## Dev Notes

### Architecture — Règles critiques

- **Data fetching** : Server Component (RSC) pour le chargement initial des stats. Les données agrégées sont calculées côté serveur — ne JAMAIS faire l'agrégation côté client.
- **State** : TanStack Query pour cache côté client avec staleTime élevé (5-10 min).
- **Pas de mutation** : Cette story est en lecture seule. Pas de Server Action de mutation.
- **Response format** : `{ data, error }` pour toutes les actions.
- **Logging** : `[CRM:GET_STATS]`, `[CRM:GET_TIME_PER_CLIENT]`

### Requêtes Supabase — Agrégation

**Stats portefeuille** — Requête unique agrégée :
```typescript
// Utiliser .rpc() ou requêtes individuelles groupées
const { data: clients } = await supabase
  .from('clients')
  .select('id, client_type, status')
  .eq('operator_id', operatorId)

// Puis agrégation TypeScript (plus flexible que SQL pour ce cas)
const stats = {
  total: clients.length,
  byStatus: { active: 0, suspended: 0, archived: 0 },
  byType: { complet: 0, direct_one: 0, ponctuel: 0 },
  labActive: clients.filter(c => c.status === 'active' && c.client_type === 'complet').length,
  // etc.
}
```

**Temps passé** — Agrégation `activity_logs` :
```sql
SELECT
  c.id, c.name, c.client_type,
  COUNT(*) FILTER (WHERE al.action = 'message_sent') as message_count,
  COUNT(*) FILTER (WHERE al.action = 'validation_completed') as validation_count,
  SUM(CASE WHEN al.action = 'visio_completed' THEN (al.metadata->>'duration_seconds')::int ELSE 0 END) as visio_seconds,
  MAX(al.created_at) as last_activity
FROM clients c
LEFT JOIN activity_logs al ON al.entity_id = c.id AND al.entity_type = 'client'
WHERE c.operator_id = $1
GROUP BY c.id, c.name, c.client_type
ORDER BY (message_count * 120 + validation_count * 300 + visio_seconds) DESC
```

**Taux graduation** : Compter les events `client_graduated` / total clients Lab ayant terminé.

### Composants Tremor

Le CLAUDE.md mentionne Tremor pour les dashboard blocks. Utiliser :
- `DonutChart` pour répartition par type
- `BarChart` pour répartition par statut (optionnel)
- `Card` + `Metric` pour KPIs individuels
- `SparkChart` pour tendances (si données historiques disponibles)

**Import** : `import { DonutChart, Card, Metric } from '@tremor/react'`

**ATTENTION** : Vérifier que Tremor est installé dans les dépendances du module CRM. Si pas installé, l'ajouter au `package.json` du module ou utiliser des composants shadcn/ui simples comme fallback.

### Formatage durée humaine

```typescript
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes}min`
}
```

### Performance (NFR-P1)

- Requêtes agrégées côté serveur (pas de fetch de toutes les lignes pour compter côté client)
- Utiliser `supabase.rpc()` pour les requêtes complexes si nécessaire (fonction SQL custom)
- StaleTime TanStack Query : 5-10 min pour éviter les re-fetches inutiles
- Skeleton loader immédiat, pas de spinner

### Tables DB utilisées (lecture seule)

- `clients` : liste clients pour agrégation
- `client_configs` : dashboard_type pour identifier Lab/One
- `activity_logs` : actions pour calcul temps passé
- **Pas de nouvelle migration** pour cette story (lecture seule sur tables existantes)

### Fichiers à créer

- `packages/modules/crm/actions/get-portfolio-stats.ts`
- `packages/modules/crm/actions/get-graduation-rate.ts`
- `packages/modules/crm/actions/get-time-per-client.ts`
- `packages/modules/crm/hooks/use-portfolio-stats.ts`
- `packages/modules/crm/hooks/use-time-per-client.ts`
- `packages/modules/crm/components/stats-dashboard.tsx`
- `packages/modules/crm/components/kpi-card.tsx`
- `packages/modules/crm/components/client-type-chart.tsx`
- `packages/modules/crm/components/time-per-client-table.tsx`
- `packages/modules/crm/components/stats-skeleton.tsx`
- `packages/modules/crm/utils/time-estimates.ts`
- Tests co-localisés

### Fichiers à modifier

- `packages/modules/crm/types/crm.types.ts`
- `packages/modules/crm/manifest.ts` (ajouter route stats)
- `packages/modules/crm/index.ts` (exports)
- `packages/modules/crm/docs/guide.md`, `faq.md`, `flows.md`

### Dépendances

- **Story 2.1** : Module CRM existant
- `activity_logs` table (migration 00005) — déjà existante
- MRR : dépend du module Facturation (Epic 11) — afficher placeholder si non disponible

### Anti-patterns — Interdit

- NE PAS faire d'agrégation côté client (tout côté serveur)
- NE PAS stocker les stats dans Zustand
- NE PAS utiliser fetch() côté client pour les données
- NE PAS throw dans les Server Actions
- NE PAS bloquer le rendu en attendant toutes les stats (charger en parallèle avec skeletons individuels)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-2-*.md#Story 2.8]
- [Source: supabase/migrations/00005_create_activity_logs.sql]
- [Source: docs/project-context.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Tremor non installé dans le projet. Utilisation de composants shadcn/ui (@monprojetpro/ui) comme fallback pour les KPI cards et le donut chart SVG custom. Conforme aux Dev Notes ("utiliser des composants shadcn/ui simples comme fallback").

### Completion Notes List

- Task 1: 3 Server Actions créées (get-portfolio-stats, get-graduation-rate, get-time-per-client) + constantes TIME_ESTIMATES. 20 tests passent.
- Task 2: 7 types Zod ajoutés à crm.types.ts (PortfolioStats, GraduationRate, ClientTimeEstimate, StatusCounts, TypeCounts, MrrInfo, TimeEstimateConfig). 32 tests types passent.
- Task 3: 3 hooks TanStack Query (usePortfolioStats, useGraduationRate, useTimePerClient) avec staleTime 10min. 11 tests passent.
- Task 4: 6 composants UI créés (StatsDashboard, KpiCard, ClientTypeChart, TimePerClientTable, StatsSkeleton, CrmSubNav). Donut chart en SVG pur. 30 tests composants passent.
- Task 5: Route /modules/crm/stats ajoutée au manifest + app route RSC avec parallel fetch. CrmSubNav composant sous-navigation.
- Task 6: 65 fichiers de test, 388 tests total, 0 échec, 0 régression.
- Task 7: guide.md, faq.md, flows.md mis à jour avec section statistiques complète.

### File List

**Fichiers créés :**
- packages/modules/crm/actions/get-portfolio-stats.ts
- packages/modules/crm/actions/get-portfolio-stats.test.ts
- packages/modules/crm/actions/get-graduation-rate.ts
- packages/modules/crm/actions/get-graduation-rate.test.ts
- packages/modules/crm/actions/get-time-per-client.ts
- packages/modules/crm/actions/get-time-per-client.test.ts
- packages/modules/crm/hooks/use-portfolio-stats.ts
- packages/modules/crm/hooks/use-portfolio-stats.test.tsx
- packages/modules/crm/hooks/use-time-per-client.ts
- packages/modules/crm/hooks/use-time-per-client.test.tsx
- packages/modules/crm/components/stats-dashboard.tsx
- packages/modules/crm/components/stats-dashboard.test.tsx
- packages/modules/crm/components/kpi-card.tsx
- packages/modules/crm/components/kpi-card.test.tsx
- packages/modules/crm/components/client-type-chart.tsx
- packages/modules/crm/components/client-type-chart.test.tsx
- packages/modules/crm/components/time-per-client-table.tsx
- packages/modules/crm/components/time-per-client-table.test.tsx
- packages/modules/crm/components/stats-skeleton.tsx
- packages/modules/crm/components/stats-skeleton.test.tsx
- packages/modules/crm/components/crm-sub-nav.tsx
- packages/modules/crm/components/crm-sub-nav.test.tsx
- packages/modules/crm/utils/time-estimates.ts
- packages/modules/crm/utils/time-estimates.test.ts
- apps/hub/app/(dashboard)/modules/crm/stats/page.tsx
- apps/hub/app/(dashboard)/modules/crm/stats/stats-page-client.tsx
- apps/hub/app/(dashboard)/modules/crm/stats/loading.tsx

**Fichiers modifiés :**
- packages/modules/crm/types/crm.types.ts (ajout types stats Story 2.8)
- packages/modules/crm/types/crm.types.test.ts (ajout tests types stats)
- packages/modules/crm/manifest.ts (ajout route /modules/crm/stats + activity_logs dans requiredTables)
- packages/modules/crm/index.ts (ajout exports stats)
- packages/modules/crm/docs/guide.md (ajout section statistiques)
- packages/modules/crm/docs/faq.md (ajout FAQ statistiques)
- packages/modules/crm/docs/flows.md (ajout flux statistiques)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status 2-8 → in-progress → review)

### Senior Developer Review (AI)

**Reviewer:** Amelia (Dev Agent) — Claude Sonnet 4.5
**Date:** 2026-02-15

**Issues Found:** 1 High, 4 Medium, 3 Low

**Fixed (5/5 HIGH+MEDIUM):**
- [x] H1: Runtime crash MRR tooltip — null-safe access ajouté (stats-dashboard.tsx:61)
- [x] M1: Sprint-status.yaml désynchronisé (in-progress → review)
- [x] M2: .limit(50000) réduit à 10000 + TODO RPC migration documenté (get-time-per-client.ts:64)
- [x] M3: Renommage totalLabCompleted → totalLabClients (7 fichiers)
- [x] M4: Ternaire redondant simplifié (résolu par fix H1)

**Non corrigés (3 LOW — action items):**
- [ ] L1: Accessibilité donut chart — ajouter role="img" + aria-label (client-type-chart.tsx)
- [ ] L2: Duplication skeleton — loading.tsx devrait réutiliser StatsSkeleton
- [ ] L3: Event type naming — documenter que graduated_to_one remplace client_graduated des Dev Notes

**Tests post-review:** 65 fichiers, 389 tests, 0 échec, 0 régression

### Change Log

- 2026-02-15: Story 2.8 implementee — Dashboard statistiques CRM avec KPIs, donut chart, table temps passe, sous-navigation, 388 tests (0 regression)
- 2026-02-15: Code review — 5 fixes (H1 crash tooltip, M1 sprint sync, M2 limit 50K→10K, M3 rename totalLabCompleted, M4 ternaire). 389 tests, 0 regression.
