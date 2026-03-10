# Story 12.7: Monitoring instances One — usage, seuils & alertes

Status: done

## Story

As a **MiKL (operateur)**,
I want **surveiller l'usage des ressources de chaque instance One et recevoir des alertes quand les seuils sont atteints**,
so that **je peux anticiper les depassements de capacite et proposer un upgrade au client avant qu'il ne soit impacte**.

## Acceptance Criteria

**Given** un cron quotidien (Edge Function, 6h00) (FR162)
**When** il s'execute
**Then** pour chaque instance avec `status='active'` :
1. `GET https://{slug}.foxeo.io/api/hub/health` retourne :
   ```typescript
   type UsageMetrics = {
     dbRows: number
     storageUsedMb: number
     bandwidthUsedGb: number
     edgeFunctionCalls: number
   }
   ```
2. Metriques stockees dans `client_instances.usage_metrics` (JSONB)
3. `client_instances.last_health_check` → NOW()

**Given** les seuils de capacite Free tier Supabase (FR163)
**When** un seuil est atteint
**Then** `client_instances.alert_level` = 'none' | 'info' | 'warning' | 'critical' :
| Metrique | 60% (info) | 80% (warning) | 95% (critical) |
|----------|------------|----------------|-----------------|
| DB rows | 300K/500K | 400K/500K | 475K/500K |
| Storage | 600MB/1GB | 800MB/1GB | 950MB/1GB |
| Bandwidth | 1.2GB/2GB | 1.6GB/2GB | 1.9GB/2GB |
| Edge Fns | 300K/500K | 400K/500K | 475K/500K |
**And** notifications : info = in-app seul, warning = in-app + email, critical = in-app + email + badge rouge
**And** notification envoyee une seule fois par palier (pas de spam)

**Given** MiKL consulte le tableau de bord Instances (FR164)
**When** il accede a la section
**Then** :
- Vue d'ensemble : nb instances actives, alertes en cours, cout mensuel estime
- Liste avec badges couleur + barres de progression par metrique
- Detail instance : historique 30 jours (graphique), alertes, modules, bouton "Initier upgrade"

**Given** MiKL initie un upgrade (FR165)
**When** il clique "Initier un upgrade"
**Then** modale avec options Supabase Pro (+25$/mois), Vercel Pro (+20$/mois), Les deux (+45$/mois)
**And** "Contacter le client" : ouvre chat pre-rempli avec message type

## Tasks / Subtasks

- [x] Creer l'endpoint `/api/hub/health` sur l'instance One (AC: #1)
  - [x] Creer `apps/client/app/api/hub/health/route.ts`
  - [x] Auth : verifier `X-Hub-Secret` header (== `process.env.INSTANCE_SECRET`) — HMAC validation
  - [x] Calculer `dbRows` : `SELECT count FROM pg_stat_user_tables`
  - [x] Calculer `storageUsedMb` : Supabase Storage API ou estimation
  - [x] `bandwidthUsedGb` et `edgeFunctionCalls` : Supabase Management API ou valeurs approximees
  - [x] Retourner `UsageMetrics` en JSON

- [x] Creer l'Edge Function `instances-monitor-cron` (AC: #1, #2)
  - [x] Creer `supabase/functions/instances-monitor-cron/index.ts`
  - [x] Cron quotidien 6h00 via pg_cron
  - [x] Fetch toutes les instances `status='active'` depuis `client_instances`
  - [x] Pour chaque instance : `GET {instance_url}/api/hub/health` avec `X-Hub-Secret` header
  - [x] UPDATE `client_instances SET usage_metrics={metrics}, last_health_check=NOW()`
  - [x] Evaluer les seuils → UPDATE `alert_level`
  - [x] Si nouveau palier franchi : envoyer notification (check `previous_alert_level` dans `usage_metrics`)

- [x] Creer les migrations colonnes instances (AC: #2)
  - [x] Creer `supabase/migrations/00069_add_instance_monitoring_fields.sql` (numéro 00068 déjà utilisé)
    ```sql
    ALTER TABLE client_instances ADD COLUMN IF NOT EXISTS usage_metrics JSONB DEFAULT '{}';
    ALTER TABLE client_instances ADD COLUMN IF NOT EXISTS alert_level TEXT DEFAULT 'none';
    ALTER TABLE client_instances ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ;
    ```

- [x] Creer le tableau de bord Instances (AC: #3)
  - [x] Creer `packages/modules/admin/components/instances-dashboard.tsx`
  - [x] `useInstancesMonitoring()` hook : TanStack Query sur `client_instances`
  - [x] Vue d'ensemble : compteurs instances, alertes, MRR estime
  - [x] Liste avec `ProgressBar` par metrique (pourcentage du seuil Free)
  - [x] Filtre par `alert_level`
  - [x] Panneau detail : historique metriques (`usage_metrics_history` dans metadata) + graphique 30j

- [x] Creer la modale upgrade (AC: #4)
  - [x] Creer `packages/modules/admin/components/upgrade-instance-modal.tsx`
  - [x] Options Supabase Pro / Vercel Pro / Les deux avec cout estime
  - [x] Recommandation auto basee sur la metrique critique
  - [x] Bouton "Contacter le client" → pre-remplir le chat MiKL avec message type
  - [x] Bouton "Confirmer upgrade" → `upgradeInstance(instanceId, plan)` Server Action (enregistre l'intention, implementation manuelle)

- [x] Creer les tests unitaires
  - [x] Test `/api/hub/health` : auth secret, calcul metriques, format retour (6 tests)
  - [x] Test `instances-monitor-cron` : calcul seuils, escalade, pourcentages, titre notification (13 tests)
  - [x] Test `instances-dashboard.tsx` : rendu badges, progress bars, filtre (6 tests)

## Dev Notes

### Architecture Patterns

- **`INSTANCE_SECRET` auth** : chaque instance a un secret unique (genere au provisioning, stocke dans `client_instances.instance_secret` cote Hub et `process.env.INSTANCE_SECRET` cote instance Vercel). Le Hub envoie ce secret dans `X-Hub-Secret` — l'instance le verifie.
- **Historique 30 jours** : stocker les metriques historiques dans `usage_metrics_history: UsageMetrics[]` (tableau JSONB dans `client_instances.metadata`). Conserver les 30 derniers snapshots, supprimer les plus anciens.
- **Palier de notification** : comparer `alert_level` actuel vs precedent. Si `alert_level` monte (ex: info → warning), envoyer la notification. Si stable ou descend, pas de notification.
- **Pre-remplir le chat** : utiliser le pattern existant de navigation avec parametres URL ou Zustand store pour pre-remplir le message chat.

### Source Tree

```
apps/client/app/api/hub/health/
└── route.ts                              # CREER: endpoint health check

supabase/functions/instances-monitor-cron/
└── index.ts                              # CREER: Edge Function cron

supabase/migrations/
└── 00068_add_instance_monitoring_fields.sql  # CREER

packages/modules/admin/
├── components/
│   ├── instances-dashboard.tsx           # CREER
│   ├── instances-dashboard.test.tsx      # CREER
│   ├── upgrade-instance-modal.tsx        # CREER
│   └── upgrade-instance-modal.test.tsx   # CREER
└── hooks/
    └── use-instances-monitoring.ts       # CREER
```

### Existing Code Findings

- **`client_instances` table** : creee Epic 9. `instance_url`, `instance_secret`, `status` existent.
- **Pattern Edge Function cron** : `check-inactivity`, `elio-alerts-cron` — meme pattern.
- **`/api/hub/health` pattern** : inspire du endpoint `GET /api/hub/health` mentionne dans Story 12.6 pour le health check du provisioning.

### Technical Constraints

- **Calcul `dbRows`** : `SELECT reltuples::bigint FROM pg_class WHERE relname = 'table'` ou `SELECT sum(n_live_tup) FROM pg_stat_user_tables`. Disponible avec `service_role` (bypass RLS).
- **`bandwidthUsedGb`** : Supabase ne expose pas facilement la bande passante via SQL. Pour le MVP : valeur approximee ou lecture via Supabase Management API (si token disponible).

### References

- [Source: epic-12-administration-analytics-templates-stories-detaillees.md#Story 12.7]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Migration numéro ajusté : 00068 déjà pris par p2_integration_tables → 00069
- `bandwidthUsedGb` / `edgeFunctionCalls` : non disponibles via SQL Supabase, retournés à 0 (MVP — Supabase Management API nécessite token séparé)
- Logique pure Edge Function extraite dans `instances-monitor-logic.ts` (pattern health-check-cron)
- Tests badge : filtre et badge ont le même texte → utiliser `getAllByText` + `closest('[data-slot="badge"]')`
- Test computeAlertLevel : 350K dbRows = 'info' (< 400K seuil warning), corrigé en 400K

### Completion Notes List
- Endpoint `/api/hub/health` avec comparaison HMAC constant-time + fallback pg_stat_user_tables
- Edge Function `instances-monitor-cron` : fetch métriques, calcul seuils, UPDATE DB, historique 30j dans metadata, notification in-app + email si warning/critical
- Migration 00069 : colonnes `usage_metrics`, `alert_level` (avec CHECK constraint), `last_health_check` + index conditionnel
- Dashboard `InstancesDashboard` : vue d'ensemble 3 KPIs, liste filtrée avec ProgressBars, panneau détail, slot modale upgrade
- `upgradeInstance()` Server Action : enregistre l'intention dans `client_instances.metadata.upgrade_request`
- `UpgradeInstanceModal` : 3 options avec recommandation auto basée sur métriques, "Contacter le client" via slot callback
- 25 tests : 6 route, 13 logique, 6 dashboard
- **CR fixes** : dead imports supprimés (route.ts), import statique @supabase/supabase-js, auth opérateur ajoutée (upgrade-instance), getMetricLevel centralisé dans hook (seuils absolus), storage calc via file.metadata.size

### File List
- apps/client/app/api/hub/health/route.ts (CRÉÉ)
- apps/client/app/api/hub/health/route.test.ts (CRÉÉ)
- supabase/functions/instances-monitor-cron/index.ts (CRÉÉ)
- supabase/functions/instances-monitor-cron/instances-monitor-logic.ts (CRÉÉ)
- supabase/functions/instances-monitor-cron/instances-monitor-logic.test.ts (CRÉÉ)
- supabase/migrations/00069_add_instance_monitoring_fields.sql (CRÉÉ)
- packages/modules/admin/hooks/use-instances-monitoring.ts (CRÉÉ)
- packages/modules/admin/components/instances-dashboard.tsx (CRÉÉ)
- packages/modules/admin/components/instances-dashboard.test.tsx (CRÉÉ)
- packages/modules/admin/components/upgrade-instance-modal.tsx (CRÉÉ)
- packages/modules/admin/actions/upgrade-instance.ts (CRÉÉ)
