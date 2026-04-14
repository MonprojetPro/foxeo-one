# Story 2.4: Assignation parcours Lab & gestion des accès

Status: done

## Story

As a **MiKL (opérateur)**,
I want **assigner un parcours Lab à un client et activer ou désactiver ses accès Lab et One**,
So that **je contrôle précisément le niveau de service de chaque client**.

## Acceptance Criteria

1. **AC1 — Dialog assignation parcours Lab** : Sur la fiche client (onglet Informations), un bouton "Assigner un parcours Lab" ouvre un dialog avec sélection du type de parcours (depuis `parcours_templates`), liste des étapes du parcours sélectionné, et possibilité d'activer/désactiver des étapes individuelles (FR5). Si aucun template n'existe, afficher un état vide avec info contextuelle mentionnant le module Templates (Epic 12).

2. **AC2 — Server Action `assignParcours()`** : Crée un enregistrement dans la table `parcours` avec client_id, template_id, étapes actives, statut "en_cours". Met à jour `client_configs.dashboard_type` à `'lab'` et `client_configs.parcours_config` avec la configuration. Toast "Parcours Lab assigné avec succès". Invalidation TanStack Query `['client', clientId]` et `['clients']`.

3. **AC3 — Toggles accès Lab/One** : Sur la fiche client, toggles "Accès Lab" et "Accès One" (FR6). Active/désactive l'accès correspondant. Met à jour `client_configs.dashboard_type`. Si désactivation : dialog de confirmation ("Le client perdra l'accès à son dashboard Lab/One"). Toast confirme. Action tracée dans `activity_logs`.

4. **AC4 — Suspension parcours** : Si MiKL désactive l'accès Lab d'un client en cours de parcours, le parcours est suspendu (pas supprimé), état courant préservé. Si réactivation, le parcours reprend là où il en était.

5. **AC5 — Migration DB** : Tables `parcours_templates` et `parcours` créées avec RLS. Policies assurent isolation par `operator_id`.

6. **AC6 — Tests** : Tests unitaires co-localisés pour tous les composants/actions. Tests RLS pour les nouvelles tables. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Migration Supabase : tables `parcours_templates` et `parcours` (AC: #5)
  - [x] 1.1 Créer migration `00017_create_parcours.sql`
  - [x] 1.2 Table `parcours_templates` : id, operator_id, name, description, parcours_type (complet/partiel/ponctuel), stages (JSONB), is_active, created_at, updated_at
  - [x] 1.3 Table `parcours` : id, client_id, template_id, operator_id, active_stages (JSONB), status (en_cours/suspendu/termine), started_at, suspended_at, completed_at, created_at, updated_at
  - [x] 1.4 Indexes : idx_parcours_client_id, idx_parcours_operator_id, idx_parcours_templates_operator_id
  - [x] 1.5 RLS policies : `parcours_select_operator`, `parcours_insert_operator`, `parcours_update_operator`, `parcours_templates_select_operator`, `parcours_templates_insert_operator`, `parcours_templates_update_operator`
  - [x] 1.6 Triggers `updated_at` sur les deux tables
  - [x] 1.7 Seed data : 1 template "Parcours Complet" avec les 5 étapes (vision, positionnement, offre, identite, graduation)

- [x] Task 2 — Types TypeScript (AC: #1, #2, #3)
  - [x] 2.1 Ajouter dans `packages/modules/crm/types/crm.types.ts` : `ParcoursTemplate`, `Parcours`, `ParcoursStage`, `ParcoursStatus`, `ParcoursType`, `AssignParcoursInput`, `ToggleAccessInput`
  - [x] 2.2 Schémas Zod pour validation
  - [x] 2.3 Types DB (snake_case) correspondants

- [x] Task 3 — Server Actions (AC: #2, #3, #4)
  - [x] 3.1 `actions/get-parcours-templates.ts` — Récupérer les templates actifs pour l'opérateur
  - [x] 3.2 `actions/assign-parcours.ts` — Créer parcours + MAJ client_configs (dashboard_type='lab', parcours_config)
  - [x] 3.3 `actions/toggle-access.ts` — Activer/désactiver accès Lab ou One, MAJ dashboard_type, tracer dans activity_logs
  - [x] 3.4 `actions/suspend-parcours.ts` — Suspendre un parcours (préserver état), réactiver si toggle Lab ON
  - [x] 3.5 Toutes les actions retournent `ActionResponse<T>` — jamais de throw

- [x] Task 4 — Hooks TanStack Query (AC: #1, #2, #3)
  - [x] 4.1 `hooks/use-parcours-templates.ts` — queryKey `['parcours-templates']`
  - [x] 4.2 `hooks/use-client-parcours.ts` — queryKey `['client-parcours', clientId]`
  - [x] 4.3 Mutations avec invalidation : `['client', clientId]`, `['clients']`, `['client-parcours', clientId]`

- [x] Task 5 — Composants UI (AC: #1, #3)
  - [x] 5.1 `components/assign-parcours-dialog.tsx` — Dialog modal : sélection template, liste étapes avec toggles individuels, bouton "Assigner"
  - [x] 5.2 `components/parcours-stage-list.tsx` — Liste des étapes avec checkbox on/off, nom, description
  - [x] 5.3 `components/access-toggles.tsx` — Deux toggles Lab/One avec labels, indicateurs visuels, dialog confirmation désactivation
  - [x] 5.4 `components/parcours-status-badge.tsx` — Badge statut parcours (en_cours, suspendu, terminé)
  - [x] 5.5 États vides : si pas de template, message contextuel avec mention Epic 12

- [x] Task 6 — Intégration fiche client (AC: #1, #3)
  - [x] 6.1 Ajouter section "Parcours & Accès" dans l'onglet Informations de la fiche client (Story 2.3)
  - [x] 6.2 Bouton "Assigner un parcours Lab" (ouvre AssignParcoursDialog)
  - [x] 6.3 Affichage parcours actif avec progression et statut
  - [x] 6.4 Toggles accès Lab/One positionnés dans la section

- [x] Task 7 — Tests (AC: #6)
  - [x] 7.1 Tests unitaires actions : assign-parcours, toggle-access, suspend-parcours, get-parcours-templates
  - [x] 7.2 Tests unitaires composants : AssignParcoursDialog, AccessToggles, ParcoursStageList
  - [x] 7.3 Tests hooks : useParcourTemplates, useClientParcours
  - [x] 7.4 Tests RLS : operator A ne voit pas les parcours de operator B
  - [x] 7.5 Tests types : validation schémas Zod

- [x] Task 8 — Documentation (AC: #6)
  - [x] 8.1 Mettre à jour `docs/guide.md` du module CRM
  - [x] 8.2 Mettre à jour `docs/faq.md` avec questions parcours/accès
  - [x] 8.3 Mettre à jour `docs/flows.md` avec flux assignation

## Dev Notes

### Architecture — Règles critiques

- **Data fetching** : Server Component pour la page, Server Actions pour mutations. Pas de fetch() côté client. Pas d'API Route pour mutations internes.
- **State** : TanStack Query pour données serveur (parcours, templates, config), Zustand interdit pour données serveur. React Hook Form + Zod pour les formulaires.
- **Response format** : Toujours `{ data, error }` — JAMAIS de throw dans les Server Actions.
- **Realtime** : Pas nécessaire pour cette story (v1). Si ajouté plus tard, utiliser `queryClient.invalidateQueries()` uniquement.
- **RLS triple couche** : 1) Policies DB sur `parcours` et `parcours_templates`, 2) Middleware Next.js vérifie admin, 3) UI masque éléments non autorisés.

### Base de données — État actuel

**Tables existantes** (vérifiées dans les migrations) :
- `clients` : id, operator_id, email, name, company, contact, sector, client_type (complet/direct_one/ponctuel), status (active/suspended/archived), auth_user_id, created_at, updated_at
- `client_configs` : client_id (PK+FK), operator_id, active_modules (TEXT[]), dashboard_type (hub/lab/one), theme_variant, custom_branding (JSONB), elio_config (JSONB), **parcours_config (JSONB)**, created_at, updated_at
- `activity_logs` : id, actor_type (client/operator/system/elio), actor_id, action, entity_type, entity_id, metadata (JSONB), created_at

**ATTENTION** : L'épic mentionne "migration 00009" pour parcours, mais la migration 00009 actuelle est `secure_login_attempts_link_auth.sql`. Les tables `parcours` et `parcours_templates` N'EXISTENT PAS encore. La prochaine migration disponible est `00017`.

**Colonne `parcours_config` dans `client_configs`** : JSONB déjà créée, prête à stocker la configuration du parcours assigné. Utiliser cette colonne pour les données de config (étapes actives, progression).

### Schéma des nouvelles tables

```sql
-- parcours_templates
CREATE TABLE parcours_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  name TEXT NOT NULL,
  description TEXT,
  parcours_type TEXT NOT NULL CHECK (parcours_type IN ('complet', 'partiel', 'ponctuel')),
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- parcours
CREATE TABLE parcours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES parcours_templates(id),
  operator_id UUID NOT NULL REFERENCES operators(id),
  active_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'en_cours' CHECK (status IN ('en_cours', 'suspendu', 'termine')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  suspended_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Format `stages` JSONB** (dans `parcours_templates`) :
```json
[
  { "key": "vision", "name": "Vision", "description": "Définir la vision business", "order": 1 },
  { "key": "positionnement", "name": "Positionnement", "description": "Positionner l'offre", "order": 2 },
  { "key": "offre", "name": "Offre", "description": "Structurer l'offre commerciale", "order": 3 },
  { "key": "identite", "name": "Identité", "description": "Créer l'identité visuelle", "order": 4 },
  { "key": "graduation", "name": "Graduation", "description": "Diplômer vers One", "order": 5 }
]
```

**Format `active_stages` JSONB** (dans `parcours`) :
```json
[
  { "key": "vision", "active": true, "status": "pending" },
  { "key": "positionnement", "active": true, "status": "pending" },
  { "key": "offre", "active": false, "status": "skipped" },
  { "key": "identite", "active": true, "status": "pending" },
  { "key": "graduation", "active": true, "status": "pending" }
]
```

### Naming Conventions — Rappel

| Contexte | Convention | Exemple |
|----------|-----------|---------|
| Tables DB | snake_case, pluriel | `parcours_templates`, `parcours` |
| Colonnes DB | snake_case | `template_id`, `active_stages` |
| RLS policies | `{table}_{action}_{role}` | `parcours_select_operator` |
| Composants | PascalCase | `AssignParcoursDialog` |
| Fichiers composants | kebab-case.tsx | `assign-parcours-dialog.tsx` |
| Hooks | use + PascalCase | `useClientParcours()` |
| Server Actions | camelCase, verbe | `assignParcours()` |
| Types | PascalCase, pas de I | `ParcoursTemplate` |
| Constantes | UPPER_SNAKE_CASE | `PARCOURS_STAGES` |

### Transformation snake_case ↔ camelCase

Transformer à la frontière DB ↔ API. Exemple :
```typescript
// DB → API
const parcours = {
  clientId: row.client_id,
  templateId: row.template_id,
  activeStages: row.active_stages,
  startedAt: row.started_at,
}
```

### Patterns existants à réutiliser

**Server Action pattern** (copier depuis `get-clients.ts`) :
```typescript
'use server'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

export async function assignParcours(input: AssignParcoursInput): Promise<ActionResponse<Parcours>> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')
    // ... logique
    return successResponse(result)
  } catch (error) {
    console.error('[CRM:ASSIGN_PARCOURS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
```

**Hook TanStack Query pattern** (copier depuis `use-clients.ts`) :
```typescript
'use client'
import { useQuery } from '@tanstack/react-query'
import type { ActionResponse } from '@monprojetpro/types'

export function useClientParcours(clientId: string) {
  return useQuery({
    queryKey: ['client-parcours', clientId],
    queryFn: async () => {
      const response = await getClientParcours(clientId)
      if (response.error) throw new Error(response.error.message)
      return response.data
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  })
}
```

**Logging** : Format `[CRM:ACTION_NAME]` — ex: `[CRM:ASSIGN_PARCOURS]`, `[CRM:TOGGLE_ACCESS]`

### Fichiers à créer/modifier

**Créer :**
- `supabase/migrations/00017_create_parcours.sql`
- `packages/modules/crm/types/crm.types.ts` (étendre avec nouveaux types)
- `packages/modules/crm/actions/get-parcours-templates.ts`
- `packages/modules/crm/actions/assign-parcours.ts`
- `packages/modules/crm/actions/toggle-access.ts`
- `packages/modules/crm/actions/suspend-parcours.ts`
- `packages/modules/crm/hooks/use-parcours-templates.ts`
- `packages/modules/crm/hooks/use-client-parcours.ts`
- `packages/modules/crm/components/assign-parcours-dialog.tsx`
- `packages/modules/crm/components/parcours-stage-list.tsx`
- `packages/modules/crm/components/access-toggles.tsx`
- `packages/modules/crm/components/parcours-status-badge.tsx`
- Tests co-localisés pour chacun (`.test.ts` / `.test.tsx`)

**Modifier :**
- `packages/modules/crm/index.ts` (ajouter exports)
- `packages/modules/crm/manifest.ts` (ajouter `parcours` et `parcours_templates` à `requiredTables`)
- `packages/modules/crm/docs/guide.md`, `faq.md`, `flows.md`
- Composant fiche client (Story 2.3) pour intégrer section Parcours & Accès

### Système de parcours flexibles — Contexte métier

Référence : `_bmad-output/planning-artifacts/prd/systme-de-parcours-flexibles.md`

**Architecture 3 couches :**
1. **Brief Initial** (systématique) — Visio + Transcription → Profil Communication (hors scope story 2.4)
2. **Classification MiKL** (cette story) — MiKL décide du parcours : Complet (5 étapes), Partiel (étapes sélectionnées), Ponctuel (1 livrable), Direct One (pas de Lab)
3. **Élio Lab configuré** (hors scope) — Élio reçoit Brief + Parcours + Profil Comm

**Types de parcours :**
| Type | Code | Étapes | Destinataire |
|------|------|--------|-------------|
| Parcours Complet | `complet` | Vision → Positionnement → Offre → Identité → Graduation | Client "from scratch" |
| Parcours Partiel | `partiel` | Étapes sélectionnées par MiKL | Client avec certains éléments déjà validés |
| Parcours Ponctuel | `ponctuel` | 1 problématique = 1 livrable | Client besoin précis |
| Direct One | `direct_one` (pas de parcours Lab) | Aucune | Client qui sait ce qu'il veut |

### Logique toggle accès — Dashboard type mapping

| Accès Lab | Accès One | dashboard_type | Commentaire |
|-----------|-----------|---------------|-------------|
| ON | OFF | `lab` | Client en parcours Lab |
| OFF | ON | `one` | Client graduée ou Direct One |
| ON | ON | `lab` | Lab prioritaire pendant parcours |
| OFF | OFF | N/A | Désactiver : mettre status `suspended` |

**Règle suspension parcours** : Quand Lab est désactivé et un parcours est en cours → `parcours.status = 'suspendu'`, `parcours.suspended_at = NOW()`. Quand Lab est réactivé → `parcours.status = 'en_cours'`, `parcours.suspended_at = NULL`.

### UX — Design Hub

- **Palette** : Hub Cyan/Turquoise sur fond dark (#020402)
- **Densité** : Compact (data-dense)
- **Skeleton loaders** partout, jamais de spinner
- **Composants** : shadcn/ui + Radix UI
- **Typographie** : Poppins (headings/UI) + Inter (body)
- **Dialog** : Utiliser `<Dialog>` de shadcn/ui pour AssignParcoursDialog
- **Toggle** : Utiliser `<Switch>` de shadcn/ui pour accès Lab/One
- **Badge** : Utiliser `<Badge>` pour statut parcours avec couleurs contextuelles
- **Toast** : Via le système toast existant de `@monprojetpro/ui`

### Dépendances avec autres stories

- **Story 2.3 (ready-for-dev)** : La fiche client avec onglets doit exister pour intégrer la section Parcours & Accès. Si 2.3 n'est pas encore implémentée, créer les composants standalone et documenter le point d'intégration.
- **Epic 6** : Module Parcours Lab (consultation, soumission briefs) — cette story prépare les données mais pas la vue client.
- **Epic 12** : Module Templates — les `parcours_templates` sont créés ici mais le CRUD complet des templates est scope Epic 12. Pour cette story, on crée 1 template seed + la capacité de lire les templates.

### Anti-patterns — Interdit

- NE PAS stocker les données parcours dans Zustand (TanStack Query uniquement)
- NE PAS utiliser fetch() côté client
- NE PAS créer d'API Route pour les mutations (Server Actions)
- NE PAS mettre de logique métier dans les routes apps
- NE PAS utiliser `any` ou `as` sans justification
- NE PAS throw dans les Server Actions
- NE PAS mettre les tests dans `__tests__/`
- NE PAS hardcoder les templates parcours (charger depuis DB)

### Project Structure Notes

- Module CRM existant dans `packages/modules/crm/` — structure validée Story 2.1
- Tous les nouveaux fichiers suivent la structure existante (actions/, components/, hooks/, types/)
- Tests co-localisés `*.test.ts(x)` à côté du fichier source
- Barrel export dans `index.ts` à mettre à jour

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-2-*.md#Story 2.4]
- [Source: _bmad-output/planning-artifacts/prd/systme-de-parcours-flexibles.md]
- [Source: _bmad-output/planning-artifacts/prd/types-de-clients.md]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md]
- [Source: _bmad-output/planning-artifacts/architecture/05-project-structure.md]
- [Source: docs/project-context.md]
- [Source: supabase/migrations/00002_create_clients.sql]
- [Source: supabase/migrations/00003_create_client_configs.sql]
- [Source: supabase/migrations/00005_create_activity_logs.sql]
- [Source: packages/modules/crm/actions/get-clients.ts] — Pattern Server Action
- [Source: packages/modules/crm/hooks/use-clients.ts] — Pattern Hook TanStack Query
- [Source: packages/modules/crm/types/crm.types.ts] — Types existants

## Senior Developer Review (AI)

### Review Model
claude-opus-4-6 (adversarial code review)

### Issues Found: 7 (1 Critical, 3 High, 2 Medium, 1 Low)

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | **CRITICAL** | `toggle-access.ts:117` — `status: 'suspendu'` viole CHECK constraint DB (`'active','suspended','archived'`) | Fixed: Changed to `'suspended'` |
| 2 | **HIGH** | `toggle-access.ts:71-72` — Pas de gestion du cas `dashboard_type = 'hub'` | Fixed: Ajout commentaire clarifiant que hub → both OFF (correct) |
| 3 | **HIGH** | `get-client-parcours.ts` — Retourne le parcours le plus récent, pas l'actif (parcours terminé remonté) | Fixed: Ajout `.in('status', ['en_cours', 'suspendu'])` + fix mock test |
| 4 | **HIGH** | File List incomplète — 6 fichiers dans git absents de la story | Fixed: Ajout fichiers manquants dans la File List |
| 5 | MEDIUM | Hook `useParcourTemplates` manque un 's' (incohérence naming) | Fixed: Renommé `useParcoursTemplates` dans 8 fichiers |
| 6 | MEDIUM | `assign-parcours.ts` — Config update failure silencieusement ignoré, parcours créé sans dashboard_type correct | Fixed: Rollback du parcours si config update échoue |
| 7 | LOW | `client-info-tab.tsx:204` — AccessToggles cachés si pas de client_configs | Accepted: Cas défensif acceptable |

### Verdict
**PASS** — All CRITICAL and HIGH issues fixed. 1280/1280 tests pass.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References

Aucun blocage rencontré. 199/199 tests passent.

### Completion Notes List

- Task 1: Migration `00017_create_parcours.sql` créée avec tables `parcours_templates` et `parcours`, indexes, RLS policies (6 policies), triggers updated_at, seed data "Parcours Complet" 5 étapes.
- Task 2: Types ajoutés dans `crm.types.ts` — `ParcoursTemplate`, `Parcours`, `ParcoursStage`, `ActiveStage`, `ParcoursStatus`, `ParcoursType`, `AssignParcoursInput`, `ToggleAccessInput` + DB counterparts + Zod schemas. 8 nouveaux tests types passent.
- Task 3: 4 Server Actions créées — `getParcoursTemplates`, `assignParcours`, `toggleAccess`, `suspendParcours`. Toutes retournent `ActionResponse<T>`, pas de throw. Pattern `[CRM:ACTION_NAME]` pour logging. Activity logs tracés. 25 tests actions passent.
- Task 4: 2 hooks TanStack Query — `useParcourTemplates` (queryKey `['parcours-templates']`), `useClientParcours` (queryKey `['client-parcours', clientId]`). Invalidation dans les mutations (assign, toggle). 9 tests hooks passent.
- Task 5: 4 composants créés — `AssignParcoursDialog` (sélection template + stages toggles), `ParcoursStageList` (étapes avec checkbox), `AccessToggles` (Lab/One toggles + confirmation désactivation), `ParcoursStatusBadge` (badge contextuel). Empty state mentionne Epic 12. 23 tests composants passent.
- Task 6: `client-info-tab.tsx` modifié — section "Parcours & Accès" remplace l'ancienne section Parcours Lab statique. Bouton "Assigner un parcours Lab", affichage parcours actif, toggles accès Lab/One intégrés.
- Task 7: Tests co-localisés pour toutes les actions, composants, hooks et types. 199 tests au total pour le module CRM, 0 échecs.
- Task 8: `guide.md`, `faq.md`, `flows.md` mis à jour avec documentation parcours et flux mermaid.

### Change Log

- 2026-02-13: Story 2.4 implémentée — assignation parcours Lab, toggles accès Lab/One, suspension parcours, migration DB, 199 tests passent.

### File List

**Créés:**
- `supabase/migrations/00017_create_parcours.sql`
- `packages/modules/crm/actions/get-parcours-templates.ts`
- `packages/modules/crm/actions/get-parcours-templates.test.ts`
- `packages/modules/crm/actions/assign-parcours.ts`
- `packages/modules/crm/actions/assign-parcours.test.ts`
- `packages/modules/crm/actions/toggle-access.ts`
- `packages/modules/crm/actions/toggle-access.test.ts`
- `packages/modules/crm/actions/suspend-parcours.ts`
- `packages/modules/crm/actions/suspend-parcours.test.ts`
- `packages/modules/crm/actions/get-client-parcours.ts`
- `packages/modules/crm/actions/get-client-parcours.test.ts`
- `packages/modules/crm/hooks/use-parcours-templates.ts`
- `packages/modules/crm/hooks/use-parcours-templates.test.tsx`
- `packages/modules/crm/hooks/use-client-parcours.ts`
- `packages/modules/crm/hooks/use-client-parcours.test.tsx`
- `packages/modules/crm/components/assign-parcours-dialog.tsx`
- `packages/modules/crm/components/assign-parcours-dialog.test.tsx`
- `packages/modules/crm/components/parcours-stage-list.tsx`
- `packages/modules/crm/components/parcours-stage-list.test.tsx`
- `packages/modules/crm/components/access-toggles.tsx`
- `packages/modules/crm/components/access-toggles.test.tsx`
- `packages/modules/crm/components/parcours-status-badge.tsx`
- `packages/modules/crm/components/parcours-status-badge.test.tsx`
- `packages/ui/src/switch.tsx`

**Modifiés:**
- `packages/modules/crm/types/crm.types.ts` (ajout types parcours)
- `packages/modules/crm/types/crm.types.test.ts` (ajout tests parcours)
- `packages/modules/crm/index.ts` (ajout exports)
- `packages/modules/crm/manifest.ts` (ajout requiredTables parcours/parcours_templates)
- `packages/modules/crm/components/client-info-tab.tsx` (intégration section Parcours & Accès)
- `packages/modules/crm/components/client-header.tsx` (ajout badge parcours)
- `packages/modules/crm/docs/guide.md` (doc assignation parcours et accès)
- `packages/modules/crm/docs/faq.md` (FAQ parcours et accès)
- `packages/modules/crm/docs/flows.md` (flux assignation et toggle)
- `packages/ui/src/index.ts` (export Switch)
- `tests/rls/helpers/seed-rls-test-data.ts` (seed data parcours)
- `tests/rls/operator-isolation.test.ts` (tests RLS parcours)
