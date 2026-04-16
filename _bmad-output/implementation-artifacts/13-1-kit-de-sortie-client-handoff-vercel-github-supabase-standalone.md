# Story 13.1: Kit de sortie client — handoff Vercel + GitHub + Supabase standalone

> ## Contexte architectural — Décision 2026-04-13
>
> Cette story implémente le **kit de sortie** défini par [ADR-01 Révision 2](../../planning-artifacts/architecture/adr-01-lab-one-coexistence-same-instance.md) et [ADR-02 Révision 2](../../planning-artifacts/architecture/adr-02-lab-module-tree-shakable-export.md).
>
> **Nouveau modèle** : Lab et One cohabitent dans une instance multi-tenant unique pendant toute la durée de l'abonnement. **Aucune instance dédiée n'est créée à la graduation Lab→One.**
>
> Le kit de sortie est le **SEUL** mécanisme qui provisionne un déploiement dédié par client. Il est déclenché UNIQUEMENT lorsque MiKL livre le produit à un client sortant :
> - Résiliation d'abonnement (`subscription_cancelled`)
> - Livraison one-shot d'un projet (coché manuellement par MiKL)
>
> **Remplace** : l'ancienne logique `transferOneInstance()` de la [Story 9.5b](./9-5b-transfert-instance-one-au-client-sortant.md) (flaggée "REWORK REQUIRED"). Cette story 13.1 est la refonte complète.

Status: done
Priority: high (bloque les départs clients)
Estimate: large (orchestration multi-API)

## Story

As a **MiKL (opérateur)**,
I want **pouvoir déclencher un kit de sortie depuis le Hub pour un client donné**,
so that **je puisse lui livrer son produit clé en main (Vercel + GitHub + Supabase + déploiement standalone), sans qu'il ait à toucher au code ou à l'infra**.

## Acceptance Criteria

### AC1 — Trigger depuis le Hub

**Given** MiKL consulte la fiche d'un client
**When** le client a le statut `subscription_cancelled` OU que MiKL coche manuellement "livraison one-shot"
**Then** un bouton "Lancer kit de sortie" est visible sur la fiche client
**And** au clic, une modale de confirmation s'ouvre avec un récap : nom du client, slug souhaité, modules actifs, type de sortie (résiliation ou livraison one-shot)
**And** MiKL doit confirmer explicitement avant le déclenchement

### AC2 — Provisioning Vercel

**Given** le kit de sortie est déclenché
**When** l'étape Vercel démarre
**Then** le script appelle l'API Vercel `POST /v9/projects` avec un token MiKL stocké dans Supabase Vault (`vercel_api_token`)
**And** un nouveau projet Vercel est créé sur l'équipe MiKL avec le nom `monprojetpro-{slug}`
**And** les env vars sont configurées : `NEXT_PUBLIC_ENABLE_LAB_MODULE=false`, `NEXT_PUBLIC_ENABLE_AGENTS=false`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**And** le `vercel_project_id` est stocké dans la table `client_handoffs`

### AC3 — Provisioning GitHub

**Given** le provisioning Vercel a réussi
**When** l'étape GitHub démarre
**Then** le script appelle l'API GitHub `POST /orgs/{org}/repos` avec le token MiKL (`github_pat`)
**And** un repo privé `monprojetpro-{slug}` est créé sur l'organisation MiKL
**And** le `github_repo_url` est stocké dans `client_handoffs`

### AC4 — Provisioning Supabase

**Given** le provisioning GitHub a réussi
**When** l'étape Supabase démarre
**Then** le script appelle l'API Supabase Management `POST /v1/projects` avec le token MiKL (`supabase_management_token`)
**And** un nouveau projet Supabase nommé `monprojetpro-{slug}` est créé
**And** le script récupère `project_url`, `anon_key`, `service_role_key` et les stocke dans `client_handoffs`
**And** si l'API Management n'est pas disponible ou le token expiré, le script bascule en **mode manuel** : il s'arrête, demande à MiKL de créer le projet manuellement, de coller les credentials, puis MiKL relance le script avec `--resume`

### AC5 — Migration des données

**Given** le projet Supabase cible existe
**When** l'étape de migration démarre
**Then** le script extrait toutes les données du client (RLS-filtered) depuis la base multi-tenant : `clients`, `client_configs`, `documents`, `messages`, `briefs`, `submissions`, `notifications`, `chat_history`, etc.
**And** lance les migrations Supabase sur le nouveau projet via `supabase db push --db-url {new_db_url}`
**And** insère les données extraites dans le nouveau Supabase en utilisant le `service_role_key`
**And** vérifie l'intégrité en comparant le `count` des rows avant/après pour chaque table

### AC6 — Push du build standalone

**Given** le nouveau Supabase est peuplé
**When** l'étape de build standalone démarre
**Then** le script clone localement `apps/client` (current branch master)
**And** configure les env vars dans le clone via un `.env.local` : `NEXT_PUBLIC_ENABLE_LAB_MODULE=false`, `NEXT_PUBLIC_ENABLE_AGENTS=false`, + credentials Supabase du nouveau projet
**And** initialise un nouveau git repo dans le clone
**And** pousse vers le repo GitHub créé en AC3 via le token PAT

### AC7 — Connexion Vercel ↔ GitHub

**Given** le code standalone est poussé sur GitHub
**When** l'étape de connexion démarre
**Then** le script appelle l'API Vercel `POST /v1/integrations/git` pour connecter le projet Vercel au repo GitHub
**And** déclenche un premier déploiement
**And** attend que le déploiement soit en statut `ready` (polling toutes les 5 secondes, max 5 minutes)

### AC8 — Sortie & credentials

**Given** le déploiement est `ready`
**When** l'étape finale de génération du dossier de remise démarre
**Then** le script génère un dossier `/handoff-output/{slug}/` contenant :
- `credentials.json` (Vercel project URL, GitHub repo URL, Supabase URL/keys, comptes admin)
- `email-draft.md` (modèle d'email français au client : "Bonjour, voici votre dashboard MonprojetPro en tant que produit autonome...")
- `transfer-checklist.md` (checklist des transferts manuels : 1. Vercel → Settings → Transfer ownership → email client. 2. GitHub → Settings → Transfer → username client. 3. Supabase → Settings → Transfer organization.)
**And** le Hub affiche un récap avec un lien "Télécharger le dossier de remise"
**And** le client a `subscription_status = 'handed_off'`

### AC9 — Logs & rollback

**Given** le kit de sortie est en cours d'exécution
**When** une étape quelconque échoue
**Then** chaque étape est loggée dans `client_handoffs` (timestamp, status, error si applicable)
**And** le script s'arrête à l'étape échouée et propose un `--resume` depuis cette étape
**And** aucun rollback automatique destructif n'est exécuté — MiKL peut supprimer manuellement les ressources créées si nécessaire

### AC10 — Tests

**Given** la story est implémentée
**When** la CI tourne
**Then** des tests unitaires existent sur les helpers (`vercel-client`, `github-client`, `supabase-management-client`) avec mocks
**And** des tests d'intégration en mode `dry-run` simulent les appels API sans rien créer réellement
**And** des tests E2E en mode "sandbox" tournent sur des comptes Vercel/GitHub/Supabase de test

## Tasks / Subtasks

- [x] Migration DB : créer table `client_handoffs` (AC: #9)
  - [x] Colonnes : `id`, `client_id`, `status`, `vercel_project_id`, `github_repo_url`, `supabase_project_url`, `supabase_url`, `supabase_anon_key`, `supabase_service_role_key` (encrypted), `error_log`, `started_at`, `completed_at`
  - [x] Index sur `client_id`, `status`
  - [x] RLS : seul opérateur owner peut voir

- [x] Stocker tokens MiKL dans Supabase Vault (AC: #2, #3, #4)
  - [x] `vercel_api_token`
  - [x] `github_pat`
  - [x] `supabase_management_token`

- [x] Créer wrapper `packages/handoff/src/clients/vercel-client.ts` (AC: #2, #7)
  - [x] `createProject(name, envVars)`
  - [x] `connectGitRepo(projectId, repoUrl)`
  - [x] `triggerDeployment(projectId)`
  - [x] `pollDeploymentStatus(deploymentId)` — max 5 min

- [x] Créer wrapper `packages/handoff/src/clients/github-client.ts` (AC: #3, #6)
  - [x] `createRepo(org, name, private: true)`
  - [x] `pushInitialCommit(repoUrl, localPath, token)`

- [x] Créer wrapper `packages/handoff/src/clients/supabase-management-client.ts` (AC: #4)
  - [x] `createProject(name)`
  - [x] `getProjectKeys(projectId)` — url, anon_key, service_role_key
  - [x] Fallback mode manuel si API indisponible

- [x] Créer extracteur de données client `packages/handoff/src/extract-client-data.ts` (AC: #5)
  - [x] Extract RLS-filtered depuis multi-tenant : `clients`, `client_configs`, `documents`, `messages`, `briefs`, `submissions`, `notifications`, `chat_history`, etc.

- [x] Créer importeur `packages/handoff/src/import-to-new-db.ts` (AC: #5)
  - [x] Lancer migrations via `supabase db push --db-url {new_db_url}`
  - [x] Insert données via service_role_key
  - [x] Vérification intégrité (count rows avant/après)

- [x] Créer cloneur + push GitHub `packages/handoff/src/build-standalone-and-push.ts` (AC: #6)
  - [x] Clone `apps/client` local
  - [x] Écrire `.env.local` avec flags tree-shaking + Supabase creds
  - [x] Init git repo + push vers repo GitHub

- [x] Créer orchestrateur `packages/handoff/src/run-handoff.ts` (AC: #9)
  - [x] Séquence des 7 étapes
  - [x] Support `--resume` depuis étape échouée
  - [x] Logging dans `client_handoffs` à chaque étape

- [x] Server Action Hub `apps/hub/app/actions/start-handoff.ts` (AC: #1)
  - [x] Validation Zod : `clientId` UUID, `handoffType` ('subscription_cancelled' | 'one_shot')
  - [x] Vérif opérateur owner
  - [x] Déclenchement orchestrateur en background
  - [x] Retour `{ data: { handoffId }, error }`

- [x] UI Hub : bouton "Lancer kit de sortie" sur fiche client (AC: #1)
  - [x] Modifier la fiche client (Story 9.5b à reworker — remplacer l'ancien bouton "Transférer l'instance")
  - [x] Visible si `subscription_status = 'subscription_cancelled'` OU checkbox "livraison one-shot"
  - [x] Modale confirmation avec récap

- [x] Génération du dossier de remise (AC: #8)
  - [x] `handoff-output/{slug}/credentials.json`
  - [x] `handoff-output/{slug}/email-draft.md`
  - [x] `handoff-output/{slug}/transfer-checklist.md`
  - [x] Mise à jour `client.subscription_status = 'handed_off'`

- [x] Tests unitaires (AC: #10)
  - [x] Mocks API Vercel / GitHub / Supabase Management
  - [x] Helpers testés isolément

- [x] Tests d'intégration dry-run (AC: #10)
  - [x] Simuler les appels API sans créer de ressources réelles

- [x] Documentation `packages/handoff/README.md`
  - [x] Procédure complète
  - [x] Variables d'environnement requises
  - [x] Mode `--resume`
  - [x] Mode manuel (fallback Supabase Management)

## Dev Notes

### Architecture Patterns
- **Pattern orchestration** : script séquentiel avec `--resume` par étape (pas de rollback destructif)
- **Pattern fallback** : mode manuel si API Supabase Management indisponible
- **Pattern secrets** : tokens MiKL stockés dans Supabase Vault, jamais en clair
- **Pattern tree-shaking** : le build standalone désactive Lab + agents via feature flags (`NEXT_PUBLIC_ENABLE_LAB_MODULE=false`, `NEXT_PUBLIC_ENABLE_AGENTS=false`)
- **Pattern handoff unique** : c'est le SEUL moment du cycle de vie où une instance dédiée est créée

### Source Tree Components

```
packages/handoff/                               # CRÉER: nouveau package
├── src/
│   ├── clients/
│   │   ├── vercel-client.ts                    # CRÉER
│   │   ├── vercel-client.test.ts
│   │   ├── github-client.ts                    # CRÉER
│   │   ├── github-client.test.ts
│   │   ├── supabase-management-client.ts       # CRÉER
│   │   └── supabase-management-client.test.ts
│   ├── extract-client-data.ts                  # CRÉER
│   ├── import-to-new-db.ts                     # CRÉER
│   ├── build-standalone-and-push.ts            # CRÉER
│   ├── run-handoff.ts                          # CRÉER (orchestrateur)
│   └── run-handoff.test.ts
├── package.json
└── README.md                                   # CRÉER

apps/hub/
└── app/
    └── actions/
        ├── start-handoff.ts                    # CRÉER
        └── start-handoff.test.ts

packages/modules/crm/
└── components/
    └── client-info-tab.tsx                     # MODIFIER: remplacer bouton "Transférer" par "Lancer kit de sortie"

supabase/migrations/
└── [timestamp]_create_client_handoffs.sql      # CRÉER

handoff-output/                                 # Généré au runtime, ignoré Git
└── {slug}/
    ├── credentials.json
    ├── email-draft.md
    └── transfer-checklist.md
```

### Testing Standards
- **Unitaires** : Vitest, co-localisés (`*.test.ts`), mocks API externes
- **Integration dry-run** : script en mode simulation (pas d'appels réels)
- **E2E sandbox** : comptes de test Vercel/GitHub/Supabase dédiés
- **Pas de full suite** : tests ciblés sur les fichiers de la story

### Key Technical Decisions

**1. Langage & runtime**
- TypeScript, Node.js (script local sur le poste de MiKL OU Edge Function selon complexité de l'orchestration)
- Le script peut être lancé en ligne de commande ou déclenché depuis le Hub via Server Action

**2. Tokens MiKL dans Supabase Vault**
- `vercel_api_token`, `github_pat`, `supabase_management_token`
- Accès uniquement depuis Server Actions / Edge Function avec `service_role_key`
- Rotation manuelle par MiKL si compromission

**3. Mode `--resume`**
- Chaque étape écrit son statut dans `client_handoffs`
- En cas d'échec, MiKL peut relancer avec `--resume --handoff-id={id}` qui reprend à la dernière étape non complétée
- Pas de rollback automatique : MiKL supprime manuellement les ressources créées si besoin

**4. Mode manuel Supabase Management**
- Si l'API Management renvoie 401/503/timeout, le script bascule en mode manuel
- Affiche les instructions : "Créer manuellement le projet Supabase `monprojetpro-{slug}` puis relancer avec `--resume --supabase-url=... --anon-key=... --service-role-key=...`"
- Permet de ne pas bloquer le handoff si l'API est indisponible

**5. Tree-shaking standalone**
- Le build standalone utilise les feature flags `NEXT_PUBLIC_ENABLE_LAB_MODULE=false` et `NEXT_PUBLIC_ENABLE_AGENTS=false`
- Ces flags doivent être câblés dans le webpack config (voir Story 13.0 — dépendance)
- Le résultat : un build ~30-40% plus léger (pas de code Lab, pas de code agents Élio)

**6. Extraction RLS-filtered**
- L'extracteur utilise une connexion avec le `service_role_key` de la base multi-tenant
- Toutes les queries filtrent par `client_id = {target}`
- Préserver les FK : exporter dans l'ordre topologique (parents avant enfants)

**7. Dossier de remise**
- `credentials.json` contient toutes les infos sensibles — à transmettre de manière sécurisée (pas par email en clair)
- `email-draft.md` : template à relire et envoyer manuellement par MiKL
- `transfer-checklist.md` : étapes manuelles de transfert de propriété (Vercel, GitHub, Supabase ne peuvent PAS être transférés via API)

### Database Schema Changes

```sql
-- Migration: create client_handoffs table
CREATE TABLE client_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  handoff_type TEXT NOT NULL CHECK (handoff_type IN ('subscription_cancelled', 'one_shot')),
  status TEXT NOT NULL CHECK (status IN (
    'pending',
    'vercel_provisioning',
    'github_provisioning',
    'supabase_provisioning',
    'data_migration',
    'build_push',
    'deployment',
    'finalizing',
    'completed',
    'failed'
  )) DEFAULT 'pending',
  current_step TEXT,
  vercel_project_id TEXT,
  github_repo_url TEXT,
  supabase_project_url TEXT,
  supabase_url TEXT,
  supabase_anon_key TEXT,
  supabase_service_role_key TEXT, -- encrypted via Supabase Vault
  error_log JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_client_handoffs_client_id ON client_handoffs(client_id);
CREATE INDEX idx_client_handoffs_status ON client_handoffs(status);

ALTER TABLE client_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_handoffs_select_operator"
  ON client_handoffs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients WHERE clients.id = client_handoffs.client_id AND clients.operator_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "client_handoffs_insert_operator"
  ON client_handoffs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients WHERE clients.id = client_handoffs.client_id AND clients.operator_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "client_handoffs_update_operator"
  ON client_handoffs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients WHERE clients.id = client_handoffs.client_id AND clients.operator_id = auth.uid()
    )
    OR is_admin()
  );

-- Add subscription_status 'handed_off' to clients
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_subscription_status_check;
ALTER TABLE clients
  ADD CONSTRAINT clients_subscription_status_check
  CHECK (subscription_status IN ('active', 'trial', 'suspended', 'subscription_cancelled', 'handed_off'));
```

### References

- [Source: ADR-01 Révision 2 — Coexistence Lab+One dans une instance unique]
- [Source: ADR-02 Révision 2 — Tree-shaking Lab/agents via feature flags]
- [Source: Story 9.5b — Ancienne logique transferInstance à remplacer]
- [Source: Vercel REST API — https://vercel.com/docs/rest-api]
- [Source: GitHub REST API — https://docs.github.com/en/rest]
- [Source: Supabase Management API — https://supabase.com/docs/reference/api/introduction]
- [Source: CLAUDE.md — Architecture Rules]

### Dependencies

- **Bloquée par** :
  - **Story 13.0** (à créer) — Tree-shaking infrastructure : câblage des flags `NEXT_PUBLIC_ENABLE_LAB_MODULE` et `NEXT_PUBLIC_ENABLE_AGENTS` dans le webpack config
  - **Story 9.5b** (existante, à reworker) — Suppression de l'ancienne logique `transferOneInstance()` et du bouton "Transférer l'instance" sur la fiche client
- **Bloque** : tous les départs clients (résiliations + livraisons one-shot)

### Risks

- **Rate limits Vercel/GitHub/Supabase** : implémenter retry logic avec backoff exponentiel, délais entre appels
- **Tokens API MiKL en clair** : stocker dans Supabase Vault (pas dans `.env`, pas dans le code)
- **Provisioning Supabase Management lent** : l'API peut prendre 2-3 minutes pour créer un projet — polling avec timeout 5 min, fallback mode manuel
- **Migration de données volumineuses** : batch INSERT, transaction par table, gérer les FK dans le bon ordre
- **Transferts de propriété non-API** : Vercel, GitHub et Supabase ne permettent PAS le transfert de propriété via API — la `transfer-checklist.md` documente les étapes manuelles que MiKL doit exécuter après le handoff

## Dev Agent Record

### Context Reference

### Agent Model Used
Claude Opus 4.6

### Debug Log References

### Completion Notes List
- Migration 00085 : table `client_handoffs` + statuts `subscription_cancelled`/`handed_off` sur `clients`
- Package `@monprojetpro/handoff` avec 3 clients API (Vercel, GitHub, Supabase Management)
- Extracteur/importeur de données RLS-filtered avec pagination (limit 100k)
- Builder standalone + push GitHub via API (blobs/tree/commit/ref)
- Orchestrateur 7 étapes avec support --resume
- Server Action `startHandoff` avec validation Zod + vérifs owner/status/doublon
- UI : bouton "Lancer kit de sortie" + modale confirmation sur fiche client
- CR fixes : .env.local retiré du push, crypto.randomBytes, env vars vérifiées, policy DELETE admin

### File List
- supabase/migrations/00085_create_client_handoffs.sql
- packages/handoff/package.json
- packages/handoff/tsconfig.json
- packages/handoff/src/index.ts
- packages/handoff/src/types.ts
- packages/handoff/src/clients/vercel-client.ts
- packages/handoff/src/clients/vercel-client.test.ts
- packages/handoff/src/clients/github-client.ts
- packages/handoff/src/clients/github-client.test.ts
- packages/handoff/src/clients/supabase-management-client.ts
- packages/handoff/src/clients/supabase-management-client.test.ts
- packages/handoff/src/extract-client-data.ts
- packages/handoff/src/extract-client-data.test.ts
- packages/handoff/src/import-to-new-db.ts
- packages/handoff/src/import-to-new-db.test.ts
- packages/handoff/src/build-standalone-and-push.ts
- packages/handoff/src/run-handoff.ts
- packages/handoff/src/run-handoff.test.ts
- packages/modules/crm/actions/start-handoff.ts
- packages/modules/crm/actions/start-handoff.test.ts
- packages/modules/crm/components/handoff-dialog.tsx
- packages/modules/crm/components/client-info-tab.tsx (modifié)

### Change Log

- Story 13.1 créée — kit de sortie client Vercel + GitHub + Supabase standalone (2026-04-13)
- Story 13.1 implémentée — 22 fichiers, 34 tests (2026-04-16)
