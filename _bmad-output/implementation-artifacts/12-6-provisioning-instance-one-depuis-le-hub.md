# Story 12.6: Provisioning instance One depuis le Hub

Status: done

## Story

As a **MiKL (operateur)**,
I want **provisionner une nouvelle instance Foxeo One dediee (Vercel + Supabase) directement depuis le Hub**,
so that **chaque client One recoit son propre environnement isole avec ses donnees et son code**.

## Acceptance Criteria

**Given** MiKL clique "Provisionner instance One" sur la fiche client (FR156)
**When** la modale de provisioning s'ouvre
**Then** :
- Slug pre-rempli (kebab-case depuis nom entreprise)
- URL resultante : `https://{slug}.foxeo.io`
- Checkboxes modules a activer
- Tier Elio initial
- Estimation cout mensuel (~5-7€)
- Bouton "Lancer le provisioning"

**Given** MiKL lance le provisioning
**When** `provisionOneInstance(clientId, slug, modules, tier)` s'execute
**Then** le processus en 5 etapes :
1. **Validation** : slug unique, format valide (kebab-case, 3-50 chars), client sans instance active
2. **Supabase** : creation projet via Management API (`POST /v1/projects`), recuperation credentials
3. **Migrations DB** : execution des migrations template sur le nouveau Supabase
4. **Vercel** : creation projet, config env vars, domaine `{slug}.foxeo.io`
5. **Health check** : ping toutes les 10s pendant 5 min max → `status: 'active'`
**And** indicateur progression en temps reel (Realtime) : "Creation Supabase..." → "Migrations..." → "Deploiement..." → "Verification..." → "Pret !"
**And** si echec : rollback (supprimer Supabase/Vercel crees) + `status: 'failed'` + bouton "Reessayer"

**Given** MiKL consulte les instances
**When** il accede a la section "Instances"
**Then** tableau : client, slug (lien), statut, tier, modules, cree le, derniere sante
**And** actions : Voir metriques, Suspendre, Archiver

## Tasks / Subtasks

- [x] Remplacer le stub `provisionOneInstance` par l'implementation reelle (AC: #2)
  - [x] Le stub existe dans `packages/modules/crm/utils/provision-instance.ts` — REMPLACER par vraie implem
  - [x] OU creer `packages/modules/admin/actions/provision-instance.ts` (nouveau module Admin) et deprecier le stub CRM
  - [x] Etape 1 — Validation slug : regex `/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/`, check unicite dans `client_instances`
  - [x] Etape 2 — Supabase Management API : `POST https://api.supabase.com/v1/projects` avec `{ name, db_pass, region: 'eu-west-1', plan: 'free' }`. Token : `SUPABASE_MANAGEMENT_TOKEN` (env var).
  - [x] Etape 3 — Migrations : executer les migrations SQL du template client sur le nouveau Supabase (via `SUPABASE_DB_URL` du nouveau projet). Utiliser `supabase db push` ou SQL direct via `pg` driver.
  - [x] Etape 4 — Vercel API : `POST https://api.vercel.com/v9/projects` puis `POST /env` pour chaque variable, puis `POST /deployments` pour declencher le deploy. Token : `VERCEL_TOKEN` (env var).
  - [x] Etape 5 — Health check : boucle `fetch(instanceUrl/api/hub/health)` toutes les 10s, max 30 tentatives (5 min).
  - [x] Realtime : emettre des evenements de progression via `supabase.channel('provisioning-{clientId}').send()`
  - [x] Rollback : si echec a n'importe quelle etape, supprimer les ressources creees (`DELETE /v1/projects/{id}`, `DELETE /v9/projects/{id}`)

- [x] Creer la modale de provisioning (AC: #1)
  - [x] Creer `packages/modules/admin/components/provision-instance-modal.tsx` — 'use client'
  - [x] Champ slug avec validation temps reel (format + unicite)
  - [x] Checkboxes modules
  - [x] Select tier Elio
  - [x] Indicateur de progression (subscribe Realtime channel `provisioning-{clientId}`)
  - [x] Affichage erreur + bouton "Reessayer"

- [x] Creer la liste des instances (AC: #3)
  - [x] Creer `packages/modules/admin/components/instances-list.tsx`
  - [x] Fetch `client_instances` avec JOIN sur `clients`
  - [x] Badge statut, liens slug, actions Suspendre/Archiver
  - [x] Page dediee `apps/hub/app/(dashboard)/modules/admin/instances/page.tsx`

- [x] Creer les tests unitaires
  - [x] Test `provision-instance.ts` : validation slug, mock Supabase API, mock Vercel API, rollback sur echec (20 tests)
  - [x] Test `provision-instance-modal.tsx` : rendu, progression, erreur (9 tests)
  - [x] Test `instances-list.tsx` : rendu, badges, actions (4 tests)

## Dev Notes

### Architecture Patterns

- **Remplacement stub** : le stub `packages/modules/crm/utils/provision-instance.ts` cree `client_instances` mais ne fait pas de vrai provisioning. Cette story le remplace. Attention : d'autres stories peuvent l'appeler — verifier les references avant de modifier la signature.
- **Supabase Management API** : `Authorization: Bearer {SUPABASE_MANAGEMENT_TOKEN}`. Token genere dans Supabase Dashboard → Account → Access Tokens. Scope : project management.
- **Vercel API** : `Authorization: Bearer {VERCEL_TOKEN}`. Token genere dans Vercel Dashboard → Account → Tokens.
- **Variables d'environnement instance** : les env vars Vercel de l'instance (SUPABASE_URL, ANON_KEY, INSTANCE_SECRET, etc.) sont creees via l'API Vercel avant le deploiement. Le `INSTANCE_SECRET` est un UUID v4 genere au moment du provisioning.
- **Migrations template** : la methode exacte depends de l'infrastructure. Option MVP : stocker les SQL de migration dans un bucket Supabase Storage `templates/migrations/` et les executer via API Supabase (ou pg connection directe).
- **Progress Realtime** : utiliser un channel ephemere `provisioning:{clientId}` pour envoyer les etapes de progression. Le front s'abonne pendant la duree du provisioning.

### Source Tree

```
packages/modules/admin/
├── actions/
│   ├── provision-instance.ts           # CREER (remplace stub CRM)
│   └── provision-instance.test.ts      # CREER
├── components/
│   ├── provision-instance-modal.tsx    # CREER
│   ├── provision-instance-modal.test.tsx # CREER
│   ├── instances-list.tsx              # CREER
│   └── instances-list.test.tsx         # CREER

apps/hub/app/(dashboard)/modules/admin/instances/
└── page.tsx                            # CREER

packages/modules/crm/utils/
└── provision-instance.ts              # MODIFIER: deleger a admin action ou deprecier
```

### Existing Code Findings

- **`provision-instance.ts` (CRM MVP)** : `packages/modules/crm/utils/provision-instance.ts` — cree uniquement un enregistrement `client_instances` avec `status='active'`. A REMPLACER par le vrai provisioning.
- **`client_instances` table** : deja creee (Epic 9). Schema : `id, client_id, slug, instance_url, status, supabase_url, vercel_project_id, instance_secret, metadata, created_at`.
- **`INSTANCE_SECRET`** : reference dans le middleware client pour les health checks Hub → Instance.

### Technical Constraints

- **Supabase Free tier** : le provisioning sur Free tier cree un projet fonctionnel. Les limitations (500k rows, 500MB storage) s'appliquent — c'est prevu, Story 12.7 gere les alertes de seuil.
- **Temps de deploiement Vercel** : 2-4 minutes en general. Le health check avec timeout 5 min couvre ce cas.
- **Mocks en dev** : sans tokens Supabase Management et Vercel reels, mocker les API calls dans les tests. En dev local, documenter les etapes manuelles.

### References

- [Source: epic-12-administration-analytics-templates-stories-detaillees.md#Story 12.6]
- [Source: packages/modules/crm/utils/provision-instance.ts] — stub a remplacer
- [Supabase Management API: https://api.supabase.com/]
- [Vercel API: https://vercel.com/docs/rest-api]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Mock fetch URL check corrigé (condition `!urlStr.includes('/')` toujours fausse → remplacée par domain check)
- Test `/Base/i` ambigu car "Supabase" match → remplacé par `getAllByText`

### Completion Notes List
- Nouveau `provisionOneInstanceFromHub` Server Action dans `@foxeo/module-admin` avec les 5 étapes complètes
- Stub CRM `provisionOneInstance` conservé (utilisé par `graduateClient`) avec commentaire @deprecated
- Env vars `SUPABASE_MANAGEMENT_TOKEN` / `VERCEL_TOKEN` : si absentes, les étapes API sont skippées (dev mode)
- Realtime progress via `supabase.channel('provisioning:{clientId}').send()` depuis le Server Action
- Rollback complet : DELETE Supabase project + DELETE Vercel project + status='failed'
- `ProvisionInstanceModal` : validation slug temps réel, Realtime subscription, retry button
- `InstancesList` : TanStack Query, table avec badges, liens, actions Suspendre/Archiver avec confirmation
- Hook `useInstances` : TanStack Query avec JOIN clients sur `client_instances`
- Onglet "Instances One" ajouté dans la page admin principale
- **CR fixes** : error handling delete functions (H1), removed dead channelRef/useRef (H2), extracted SLUG_REGEX+toSlug to shared utils (M1/M5), activity log error check (M2), rollback status update error check (M3), double-click guard isSubmitting (M4)

### File List
- packages/modules/admin/actions/provision-instance.ts (NEW)
- packages/modules/admin/actions/provision-instance.test.ts (NEW)
- packages/modules/admin/components/provision-instance-modal.tsx (NEW)
- packages/modules/admin/components/provision-instance-modal.test.tsx (NEW)
- packages/modules/admin/components/instances-list.tsx (NEW)
- packages/modules/admin/components/instances-list.test.tsx (NEW)
- packages/modules/admin/hooks/use-instances.ts (NEW)
- packages/modules/admin/utils/slug-validation.ts (NEW - shared SLUG_REGEX + toSlug)
- packages/modules/admin/index.ts (MODIFIED - new exports)
- apps/hub/app/(dashboard)/modules/admin/instances/page.tsx (NEW)
- apps/hub/app/(dashboard)/modules/admin/page.tsx (MODIFIED - Instances tab)
- packages/modules/crm/utils/provision-instance.ts (MODIFIED - @deprecated comment)

## Change Log
- 2026-03-10: Story 12.6 implemented — real provisioning action, modal, instances list, 33 tests passing
- 2026-03-10: Code review fixes (2H, 5M) — error handling, dead code removal, shared utils, double-click guard
