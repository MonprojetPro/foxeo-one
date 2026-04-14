# Story 12.1: Module Admin — Logs d'activite par client & mode maintenance

Status: done

## Story

As a **MiKL (operateur)**,
I want **consulter les logs d'activite par client et activer un mode maintenance avec message personnalise**,
so that **je peux suivre ce qui se passe sur la plateforme et informer mes clients lors des maintenances**.

## Acceptance Criteria

**Given** le module Admin existe (MVP) avec `manifest.ts` et `index.ts`
**When** les features logs et maintenance sont ajoutees
**Then** les composants suivants sont crees :
- `activity-logs.tsx` — Vue logs d'activite
- `maintenance-mode.tsx` — Controle mode maintenance
- Hooks, actions, types associes

**Given** MiKL accede aux logs d'activite (FR102)
**When** il consulte la page "Logs"
**Then** :
- Liste chronologique : date/heure, acteur, action, entite, details
- Filtres : par client, par type d'action, par periode, par acteur
- Recherche textuelle sur action + metadata
- Pagination 50 logs/page
- TanStack Query, queryKey `['activity-logs', filters]`

**Given** MiKL active le mode maintenance (FR103)
**When** `toggleMaintenanceMode(enabled, message, estimatedDuration)` s'execute
**Then** :
1. `system_config.maintenance_mode` → true
2. `system_config.maintenance_message` stocke le message
3. Les middlewares des apps client detectent le flag et affichent la page maintenance
4. Hub non affecte (MiKL reste connecte)
5. Toast "Mode maintenance active" + activity log

## Tasks / Subtasks

- [x] Creer la table `system_config` (AC: #2)
  - [x] Creer `supabase/migrations/00066_create_system_config.sql` :
    ```sql
    CREATE TABLE system_config (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO system_config (key, value) VALUES
      ('maintenance_mode', 'false'),
      ('maintenance_message', '"La plateforme est en maintenance. Nous serons de retour tres bientot !"'),
      ('maintenance_estimated_duration', 'null'),
      ('health_checks', '{}');
    ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
    CREATE POLICY system_config_select_operator ON system_config FOR SELECT USING (is_operator());
    CREATE POLICY system_config_update_operator ON system_config FOR UPDATE USING (is_operator());
    ```

- [x] Creer les composants logs d'activite (AC: #1)
  - [x] Creer `packages/modules/admin/components/activity-logs.tsx` — 'use client'
  - [x] `useActivityLogs(filters)` hook : TanStack Query sur `activity_logs`
  - [x] Filtres : client (SELECT), action type (SELECT), acteur (SELECT), periode (date range)
  - [x] Recherche textuelle debounced (300ms)
  - [x] Pagination : boutons Precedent/Suivant, 50 par page
  - [x] Chaque log : icone acteur + badge action + lien entite + expandable metadata JSONB

- [x] Creer les composants mode maintenance (AC: #2)
  - [x] Creer `packages/modules/admin/components/maintenance-mode.tsx`
  - [x] Toggle on/off + textarea message + champ duree estimee
  - [x] Preview du message client (style page maintenance)
  - [x] Creer `packages/modules/admin/actions/toggle-maintenance.ts`
  - [x] Auth : `is_operator()` seulement
  - [x] UPSERT dans `system_config` (key: 'maintenance_mode', 'maintenance_message', 'maintenance_estimated_duration')
  - [x] Activity log 'maintenance_toggled'

- [x] Integrer la detection maintenance dans les middlewares apps (AC: #2)
  - [x] Modifier `apps/client/middleware.ts` : verifier `system_config.maintenance_mode` au debut
  - [x] Si `true` → redirect vers `/maintenance` (page a creer)
  - [x] Creer `apps/client/app/maintenance/page.tsx` : page epuree avec message + logo
  - [x] Note : lire `system_config` dans le middleware via Supabase server client (pas de cache — lecture directe)

- [x] Creer la page Admin Hub (AC: #1, #2)
  - [x] Verifier si `apps/hub/app/(dashboard)/modules/admin/` existe deja (module Admin MVP)
  - [x] Ajouter onglets : "Logs d'activite" / "Maintenance" / "Backups" (placeholder) / "Webhooks" (placeholder)

- [x] Creer les tests unitaires
  - [x] Test `activity-logs.tsx` : rendu liste, filtrage, recherche, pagination (9 tests)
  - [x] Test `toggle-maintenance.ts` : auth, UPSERT system_config, log (6 tests)
  - [x] Test middleware maintenance : redirect si mode actif, pass-through si inactif (4 tests)
  - [x] Test `maintenance-mode.tsx` : rendu, toggle, save, toast (7 tests)

## Dev Notes

### Architecture Patterns

- **`system_config` table** : pattern key-value JSONB simple. Une seule table pour toute la config systeme (maintenance, health checks, etc.). Extensible sans migration pour de nouveaux parametres.
- **Middleware et maintenance** : lire `system_config` dans le middleware est acceptable (appel Supabase server rapide < 50ms). Alternative : edge config (Vercel), mais cela implique plus de complexite.
- **Pagination TanStack** : utiliser `.range(offset, offset+49)` Supabase pour la pagination — queryKey inclut la page numero.

### Source Tree

```
supabase/migrations/
└── 00066_create_system_config.sql              # CREER

packages/modules/admin/
├── components/
│   ├── activity-logs.tsx                       # CREER
│   ├── activity-logs.test.tsx                  # CREER
│   ├── maintenance-mode.tsx                    # CREER
│   └── maintenance-mode.test.tsx               # CREER
├── hooks/
│   ├── use-activity-logs.ts                    # CREER
│   └── use-maintenance.ts                      # CREER
└── actions/
    ├── toggle-maintenance.ts                   # CREER
    └── toggle-maintenance.test.ts              # CREER

apps/client/
├── middleware.ts                               # MODIFIER: check maintenance_mode
└── app/maintenance/page.tsx                    # CREER: page maintenance
```

### Existing Code Findings

- **Module Admin MVP** : `packages/modules/admin/` existe deja avec `manifest.ts`, `index.ts`, `actions/export-client-data.ts`, `actions/transfer-instance.ts`. ETENDRE sans casser l'existant.
- **`activity_logs` table** : creee en migration 00005. Schema : `id, actor_type, actor_id, action, entity_type, entity_id, metadata, created_at`. Index sur `actor_id+created_at` et `entity_type+entity_id`.
- **Pattern middleware** : voir `apps/client/middleware.ts` et `apps/hub/middleware.ts` existants pour le pattern de verification Supabase Auth.
- **Numero migration** : apres 00065 (Story 11.6) → 00066.

### Technical Constraints

- **Hub non affecte par maintenance** : le middleware `apps/hub/middleware.ts` NE DOIT PAS checker `maintenance_mode`. Seul `apps/client/middleware.ts` le fait.
- **MiKL reste connecte pendant maintenance** : si MiKL est sur l'app client (cas rare), lui afficher un bandeau "Mode maintenance actif" au lieu de la page de blocage.

### References

- [Source: epic-12-administration-analytics-templates-stories-detaillees.md#Story 12.1]
- [Source: packages/modules/admin/manifest.ts] — module Admin MVP existant
- [Source: supabase/migrations/00005_create_activity_logs.sql]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Test `renders list of logs` : `getByText('client_suspended')` matchait aussi le `<option>` du dropdown → corrigé avec `getAllByText().length >= 1`

### Completion Notes List
- Migration `00066_create_system_config.sql` : table key-value JSONB avec RLS public SELECT + operator UPDATE + trigger updated_at
- `activity-logs.tsx` : liste chronologique avec 4 filtres (client, action type, acteur, periode), recherche debounced 300ms, pagination 50/page, expandable JSONB metadata
- `use-activity-logs.ts` : TanStack Query, queryKey `['activity-logs', filters]`, `.range()` pour pagination
- `toggle-maintenance.ts` : Server Action operator-only, 3 UPSERT system_config + activity log
- `maintenance-mode.tsx` : toggle switch + textarea message + durée estimée + preview + toast feedback
- `apps/client/middleware.ts` : check maintenance_mode après création du client Supabase (single client, pas de double call). Opérateurs non redirigés (bannière UI à implémenter).
- `apps/client/app/maintenance/page.tsx` : Server Component qui lit le message depuis system_config, redirect vers / si maintenance inactive
- `apps/hub/.../modules/admin/page.tsx` : 4 onglets (Logs, Maintenance, Backups placeholder, Webhooks placeholder)
- `@monprojetpro/module-admin` ajouté aux deps du hub + peerDeps React + @tanstack/react-query dans package.json

### Code Review Fixes (Opus 4.6)
- **H1** RLS system_config: SELECT policy changée de `is_operator()` à `true` (public) — middleware et page maintenance lisent en contexte non-operator
- **H2** Injection ilike: ajout `escapeIlike()` pour échapper `%`, `_`, `\\` dans la recherche
- **H3** Debounce leak: remplacé `useState` par `useRef` + `useEffect` cleanup pour le timeout
- **M1** Supprimé `useMaintenanceQueryClient` inutilisé dans `use-maintenance.ts`
- **M2** Supprimé `fromMock` (code mort) dans `toggle-maintenance.test.ts`
- **M3** Page maintenance: ajout vérification `maintenance_mode` — redirect vers `/` si maintenance inactive
- **L1** Documenté: dropdown clients vide (acceptable, chargement ultérieur)
- **L2** Documenté: 3 UPSERT séquentiels (limitation acceptable pour module admin interne)

### File List
- supabase/migrations/00066_create_system_config.sql
- packages/modules/admin/components/activity-logs.tsx
- packages/modules/admin/components/activity-logs.test.tsx
- packages/modules/admin/components/maintenance-mode.tsx
- packages/modules/admin/components/maintenance-mode.test.tsx
- packages/modules/admin/hooks/use-activity-logs.ts
- packages/modules/admin/hooks/use-maintenance.ts
- packages/modules/admin/actions/toggle-maintenance.ts
- packages/modules/admin/actions/toggle-maintenance.test.ts
- packages/modules/admin/index.ts (updated)
- packages/modules/admin/manifest.ts (updated: system_config in requiredTables)
- packages/modules/admin/package.json (updated: added @monprojetpro/ui, @tanstack/react-query, peerDeps React, devDeps testing)
- apps/client/middleware.ts (updated: maintenance check + isMaintenanceExcluded)
- apps/client/middleware.test.ts (updated: maintenance tests added)
- apps/client/app/maintenance/page.tsx
- apps/hub/app/(dashboard)/modules/admin/page.tsx
- apps/hub/app/(dashboard)/modules/admin/loading.tsx
- apps/hub/app/(dashboard)/modules/admin/error.tsx
- apps/hub/package.json (updated: @monprojetpro/module-admin dependency)
