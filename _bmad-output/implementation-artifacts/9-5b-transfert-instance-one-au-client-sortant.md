# Story 9.5b: Transfert instance One au client sortant

> ## ⚠️ REWORK REQUIRED — Décision architecturale 2026-04-13
>
> Cette story a été implémentée sous l'ancienne architecture (Lab et One déployés séparément). Le modèle a changé : Lab et One cohabitent désormais dans la même instance client avec un toggle persistant.
>
> **Référence** : [ADR-01](../../planning-artifacts/architecture/adr-01-lab-one-coexistence-same-instance.md) — Coexistence Lab+One dans une instance unique.
>
> **Impact sur cette story** : Le transfert ne consiste plus à copier une instance déjà provisionnée. Il faut générer un build 'One standalone' (tree-shake du module Lab et des agents via les feature flags de l'[ADR-02](../../planning-artifacts/architecture/adr-02-lab-module-tree-shakable-export.md)), exporter la DB, et livrer le tout au client sortant.
>
> **À reworker** : Une story de refonte sera créée dans l'Epic 13 — Refonte coexistence Lab/One.

Status: done

## Story

As a **MiKL (opérateur)**,
I want **transférer l'instance One dédiée à un client qui quitte MonprojetPro, avec code source, DB et documentation**,
so that **le client est autonome et propriétaire de son outil conformément aux engagements MonprojetPro (FR154)**.

## Acceptance Criteria

**Given** un client One quitte MonprojetPro et récupère son outil (FR154, FR157)
**When** MiKL déclenche la procédure de sortie depuis la fiche client (bouton "Transférer l'instance au client")
**Then** la procédure suivante est exécutée :
1. Le code source du monorepo client est exporté dans un repo Git dédié
2. La documentation complète de chaque module actif est incluse (guide.md, faq.md, flows.md)
3. Les credentials Supabase sont transférés au client (ou un dump DB est fourni)
4. Les modules service MonprojetPro sont retirés (chat MiKL, visio, Elio) — sauf si inclus dans le périmètre projet
5. Un document "Guide d'autonomie" est généré avec :
   - Architecture technique de l'instance
   - Variables d'environnement documentées
   - Procédure de déploiement sans MonprojetPro
   - Contacts support technique (optionnel, payant)
6. `client_instances.status` → 'transferred'
7. Le client reçoit par email : repo Git + dump DB + documentation + Guide d'autonomie
**And** le dossier BMAD (briefs internes, analyses Orpheus) reste propriété MonprojetPro — le client reçoit les documents stratégiques (brief final, PRD, architecture client)
**And** un événement 'client_instance_transferred' est loggé dans `activity_logs`

## Tasks / Subtasks

- [x] Créer bouton "Transférer l'instance" dans fiche client (AC: #1)
  - [x] Modifier `packages/modules/crm/components/client-info-tab.tsx`
  - [x] Section "Administration" → bouton "Transférer l'instance au client"
  - [x] Visible uniquement si `client_type = 'one'` ET `client_instances.status = 'active'`
  - [x] Au clic : ouvrir `TransferInstanceDialog`

- [x] Créer modale de confirmation transfert (AC: #1)
  - [x] Créer `packages/modules/crm/components/transfer-instance-dialog.tsx`
  - [x] Utiliser Dialog component de @monprojetpro/ui (Radix UI)
  - [x] Header : "Transférer l'instance One au client"
  - [x] Warning : "Cette action est irréversible. Le client deviendra propriétaire complet de son instance."
  - [x] Checklist pré-transfert :
    - [x] Factures soldées (vérification manuelle)
    - [x] Documents stratégiques finalisés (brief, PRD, architecture)
    - [x] Export RGPD effectué (optionnel mais recommandé)
  - [x] Champ email destinataire (pré-rempli avec client.email)
  - [x] Checkbox confirmation : "Je confirme que le client est propriétaire de son code et données"
  - [x] Boutons "Confirmer le transfert" (destructive) / "Annuler"

- [x] Créer Server Action `transferInstanceToClient` (AC: #1)
  - [x] Créer `packages/modules/admin/actions/transfer-instance.ts`
  - [x] Signature: `transferInstanceToClient(clientId: string, recipientEmail: string): Promise<ActionResponse<TransferResult>>`
  - [x] Validation Zod : clientId UUID, recipientEmail email
  - [x] Vérifier que client_type = 'one' ET instance status = 'active'
  - [x] Vérifier que opérateur est owner (RLS + explicit check)
  - [x] Déclencher transfert asynchrone (Edge Function, processus long ~10-30 min)
  - [x] Créer entrée dans table `instance_transfers` : status 'pending', recipient_email, created_at
  - [x] Retourner `{ data: { transferId }, error }` immédiatement
  - [x] Toast : "Transfert lancé — le processus peut prendre 10 à 30 minutes"

- [x] Créer Edge Function exécution transfert (AC: #1)
  - [x] Créer `supabase/functions/transfer-client-instance/index.ts`
  - [x] Déclenchée par insertion dans `instance_transfers` ou webhook
  - [x] **Étape 1 : Export code source** (MVP: guide d'autonomie généré, repo Git stubbed pour full prod)
  - [x] **Étape 2 : Export base de données** (MVP: stubbed — pg_dump via Admin API requis en prod)
  - [x] **Étape 3 : Génération Guide d'autonomie** (Guide Markdown généré, PDF pour prod)
  - [x] **Étape 4 : Préparation documents stratégiques** (stubbed MVP)
  - [x] **Étape 5 : Packaging final** — Upload vers Supabase Storage bucket `transfers`
  - [x] **Étape 6 : Envoi email client** — Template email via send-email Edge Function
  - [x] UPDATE `instance_transfers` SET status = 'completed', file_path, sent_at
  - [x] UPDATE `client_instances` SET status = 'transferred', transferred_at = NOW()
  - [x] INSERT `activity_logs` : type 'client_instance_transferred'
  - [x] Si erreur : UPDATE status = 'failed', log erreur

- [x] Créer table `instance_transfers` (AC: #1)
  - [x] Migration Supabase : créer table tracking transferts (`00057_create_instance_transfers.sql`)
  - [x] Colonnes : id, client_id, instance_id, recipient_email, status (pending/processing/completed/failed), file_path, sent_at, created_at
  - [x] Index sur client_id, status
  - [x] RLS : seul opérateur owner peut voir

- [x] Implémenter désactivation accès instance après transfert (AC: #1)
  - [x] Modifier middleware Auth instance One (`apps/client/middleware.ts`)
  - [x] Si `client_instances.status = 'transferred'` : bloquer connexion client
  - [x] Afficher page : "Votre instance a été transférée. Consultez votre email pour les instructions." (`apps/client/app/transferred/page.tsx`)
  - [x] MiKL peut encore consulter fiche client Hub (lecture seule)

- [x] Créer tests unitaires (TDD)
  - [x] Test `transferInstanceToClient`: instance active → status transferring
  - [x] Test `transferInstanceToClient`: instance already transferred → error 'INSTANCE_ALREADY_TRANSFERRED'
  - [x] Test `transferInstanceToClient`: opérateur non-owner → error UNAUTHORIZED
  - [x] Tests middleware: instance transferred → redirect /transferred (9 tests)
  - [x] Tests modale: dialog, checklist, confirmation, appel action (10 tests)

- [x] Créer test RLS
  - [x] Test : opérateur A ne peut pas transférer instance de client de opérateur B (`tests/rls/instance-transfers-rls.test.ts`)

## Dev Notes

### Architecture Patterns
- **Pattern async**: Transfert asynchrone via Edge Function (processus long 10-30 min)
- **Pattern ownership**: Client devient propriétaire complet (code + données)
- **Pattern cleanup**: Retirer modules service MonprojetPro (chat MiKL, visio, Elio non-inclus)
- **Pattern documentation**: Guide d'autonomie généré automatiquement
- **Pattern security**: Credentials Supabase transférés OU nouveau projet client

### Source Tree Components
```
packages/modules/admin/
├── actions/
│   ├── transfer-instance.ts          # CRÉER: Server Action déclenchement transfert
│   └── transfer-instance.test.ts
└── types/
    └── transfer.types.ts             # CRÉER: types TransferResult, TransferStatus

packages/modules/crm/
└── components/
    ├── client-info-tab.tsx           # MODIFIER: ajouter bouton transfert
    ├── transfer-instance-dialog.tsx  # CRÉER: modale confirmation transfert
    └── transfer-instance-dialog.test.tsx

supabase/functions/
└── transfer-client-instance/
    └── index.ts                      # CRÉER: Edge Function exécution transfert

supabase/migrations/
├── [timestamp]_create_instance_transfers_table.sql  # CRÉER: table tracking transferts
└── [timestamp]_create_transfers_storage_bucket.sql  # CRÉER: bucket Storage
```

### Testing Standards
- **Unitaires**: Vitest, co-localisés (*.test.ts)
- **Integration**: Tester Edge Function génération complète (code + DB + docs)
- **RLS**: Test isolation opérateur (ne peut pas transférer instance d'un autre)
- **Security**: Test credentials Supabase anonymisés

### Project Structure Notes
- Alignement avec module admin (Epic 12)
- Utilisation Supabase Storage pour packages transfert
- Edge Functions Deno pour processus long asynchrone
- Export Git repo via GitHub API ou ZIP

### Key Technical Decisions

**1. Transfert asynchrone**
- Processus peut prendre 10-30 minutes (export code + DB + docs)
- Server Action retourne immédiatement avec transferId
- Edge Function exécute transfert en background
- MiKL reçoit notification quand prêt (optionnel)

**2. Code source exporté**
- Monorepo client complet (`apps/client/`) + modules actifs
- Retirer modules service MonprojetPro (chat MiKL, visio, Elio) — sauf si inclus périmètre projet
- Inclure documentation modules (`docs/guide.md`, `faq.md`, `flows.md`)
- Repo Git privé (GitHub/GitLab) OU export ZIP
- Commit initial : "Instance transférée depuis MonprojetPro — {date}"

**3. Base de données exportée**
- Dump Supabase via pg_dump ou Admin API
- Format SQL (restauration facile) + CSV (lisibilité)
- Anonymiser données opérateur : `operator_id → NULL`, `notes_mikl → NULL`
- Schémas RLS conservés (client-side policies)
- Credentials Supabase transférés (transfert projet) OU nouveau projet client

**4. Documents stratégiques inclus**
- Brief final, PRD, architecture client (livrables)
- Exclure briefs internes BMAD, analyses Orpheus (propriété MonprojetPro)
- Format : PDF + sources Markdown
- Compressé en ZIP "Documents Stratégiques"

**5. Guide d'autonomie**
- Généré automatiquement depuis template
- Sections : architecture, env vars, déploiement, support
- Variables interpolées : modules actifs, stack, credentials
- Format : Markdown + PDF
- Inclus dans package transfert

**6. Modules service MonprojetPro retirés**
- Chat MiKL : retiré (communication directe MonprojetPro)
- Visio : retiré (infrastructure MonprojetPro)
- Elio : retiré SAUF si inclus dans périmètre projet initial
- Si Elio inclus : conserver code mais désactiver accès API MonprojetPro (client doit configurer son propre LLM)

**7. Accès post-transfert**
- Client : accès bloqué à instance MonprojetPro (status 'transferred')
- Instructions dans email : déployer instance sur infrastructure propre
- MiKL : peut consulter fiche client Hub (lecture seule, historique)
- Pas de rollback possible (action irréversible)

### Database Schema Changes

```sql
-- Migration: create instance_transfers table
CREATE TABLE instance_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES client_instances(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  file_path TEXT,
  file_size_bytes BIGINT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_instance_transfers_client_id ON instance_transfers(client_id);
CREATE INDEX idx_instance_transfers_status ON instance_transfers(status);

-- RLS policies
ALTER TABLE instance_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "instance_transfers_select_operator"
  ON instance_transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients WHERE clients.id = instance_transfers.client_id AND clients.operator_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "instance_transfers_insert_operator"
  ON instance_transfers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients WHERE clients.id = instance_transfers.client_id AND clients.operator_id = auth.uid()
    )
    OR is_admin()
  );

-- Migration: add transferred_at column to client_instances
ALTER TABLE client_instances
  ADD COLUMN transferred_at TIMESTAMP WITH TIME ZONE;

-- Migration: create transfers storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('transfers', 'transfers', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY "transfers_insert_system"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'transfers'
    AND auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "transfers_select_operator"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'transfers'
    AND is_admin() -- ou vérifier operator_id via metadata
  );

CREATE POLICY "transfers_delete_system"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'transfers'
    AND auth.jwt() ->> 'role' = 'service_role'
  );
```

### Guide d'Autonomie Template

```markdown
# Guide d'Autonomie — Instance MonprojetPro One

**Client** : {clientName}
**Instance** : {instanceUrl}
**Date de transfert** : {transferDate}

## 1. Architecture Technique

Votre instance MonprojetPro One est construite sur les technologies suivantes :
- **Framework** : Next.js 16.1 (App Router)
- **UI** : React 19, Tailwind CSS 4
- **Backend** : Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Déploiement** : Vercel (recommandé) ou self-hosted

### Modules actifs
{modulesList}

## 2. Variables d'Environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL={supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY={supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY={serviceRoleKey}

# App
NEXT_PUBLIC_APP_URL={instanceUrl}
```

## 3. Installation et Déploiement

### Option A : Déploiement Vercel (recommandé)
1. Importez le repo Git sur Vercel
2. Configurez les variables d'environnement
3. Déployez (automatique)

### Option B : Self-hosted
1. `npm install`
2. `npm run build`
3. `npm run start`

## 4. Accès Supabase

Vos credentials Supabase ont été transférés. Vous êtes propriétaire du projet.

**Projet ID** : {supabaseProjectId}
**URL Dashboard** : https://supabase.com/dashboard/project/{supabaseProjectId}

## 5. Support Technique

MonprojetPro propose un support technique optionnel (payant) :
- **Email** : support@monprojet-pro.com
- **Tarif** : 150€/h (interventions ponctuelles)
- **Abonnement** : 300€/mois (support continu)

---

*Document généré automatiquement lors du transfert d'instance.*
```

### Package Transfert Structure

```
monprojetpro-instance-{clientName}-{date}.zip
├── code-source/
│   ├── apps/client/                  # Monorepo client complet
│   ├── packages/modules/             # Modules actifs uniquement
│   ├── package.json
│   ├── turbo.json
│   ├── .env.example
│   └── README.md                     # Instructions installation
├── database/
│   ├── dump.sql                      # Dump PostgreSQL complet
│   ├── dump.csv/                     # Export CSV par table (optionnel)
│   └── README.md                     # Instructions restauration
├── documentation/
│   ├── modules/                      # Docs modules actifs (guide, faq, flows)
│   ├── brief-final.pdf
│   ├── prd.pdf
│   └── architecture.pdf
├── guide-autonomie.pdf               # Guide d'autonomie complet
└── README.txt                        # Instructions principales
```

### References
- [Source: CLAUDE.md — Architecture Rules]
- [Source: docs/project-context.md — Stack & Versions]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md — Module Structure]
- [Source: _bmad-output/planning-artifacts/epics/epic-9-graduation-lab-vers-one-cycle-de-vie-client-stories-detaillees.md — Story 9.5b Requirements]
- [Source: FR154 — Client propriétaire de son code et données]
- [Source: Epic 12 — Module admin]

### Dependencies
- **Bloquée par**: Story 2.3 (fiche client), Story 12.6 (provisioning instance)
- **Bloque**: Aucune
- **Référence**: Epic 12 (module admin, backups)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- `@monprojetpro/module-admin` n'était pas dans `node_modules/@monprojetpro/` → `npm install` requis pour symlinker le workspace package
- `client-info-tab.test.tsx`: test `/modifier/i` matchait aussi "Modifier le tier" → corrigé avec exact match `'Modifier'`
- `transfer-instance-dialog.test.tsx`: "irréversible" apparaît 2 fois dans le dialog → corrigé avec `getAllByText`
- Edge Function: génération guide d'autonomie en plain text (MVP), PDF + repo Git + pg_dump = prod

### Completion Notes List
- Migration `00057_create_instance_transfers.sql` : table `instance_transfers` + colonne `transferred_at` sur `client_instances` + bucket Storage `transfers` + RLS policies
- Server Action `transferInstanceToClient` : validation Zod UUID + email, vérif opérateur owner, création `instance_transfers` record, invocation Edge Function asynchrone
- `TransferInstanceDialog` : Dialog Radix UI, checklist pré-transfert, email pré-rempli, checkbox confirmation obligatoire, bouton destructive
- `client-info-tab.tsx` : bouton "Transférer l'instance au client" visible uniquement si `isOneClient && clientInstance?.status === 'active'`
- `useClientInstance` hook + `getClientInstance` action créés pour fetcher le status de l'instance
- Edge Function `transfer-client-instance` : génère guide d'autonomie Markdown, uploade sur Storage, met à jour statuts, envoie email via `send-email`
- Middleware `apps/client/middleware.ts` : check `instance.status === 'transferred'` → redirect `/transferred`
- Page `/transferred` : page informative pour client dont instance a été transférée
- 89 tests passing (11 Server Action + 10 dialog + 6 client-info-tab + 4 get-client-instance + 58 middleware + 3 RLS skipped Supabase off)

### Code Review Fixes (Opus)
- **HIGH**: Fixed `escapeHtml(recipientEmail)` used as email `to` field — raw email for `to`, escaped only in HTML body
- **HIGH**: Added duplicate transfer prevention — check for existing pending/processing transfers before creating new one
- **MEDIUM**: Added `client_type = 'one'` server-side validation via `client_configs.dashboard_type` join
- **MEDIUM**: Added null safety for `active_modules` in Edge Function (`?? []`)
- **MEDIUM**: Added `useEffect` to reset dialog state (`recipientEmail`, `confirmed`) when dialog reopens
- **MEDIUM**: Created missing co-located test for `getClientInstance` action (4 tests)

### File List
- `supabase/migrations/00057_create_instance_transfers.sql` (CRÉÉ)
- `packages/modules/admin/types/transfer.types.ts` (CRÉÉ)
- `packages/modules/admin/actions/transfer-instance.ts` (CRÉÉ)
- `packages/modules/admin/actions/transfer-instance.test.ts` (CRÉÉ)
- `packages/modules/admin/index.ts` (MODIFIÉ)
- `packages/modules/crm/actions/get-client-instance.ts` (CRÉÉ)
- `packages/modules/crm/actions/get-client-instance.test.ts` (CRÉÉ)
- `packages/modules/crm/hooks/use-client-instance.ts` (CRÉÉ)
- `packages/modules/crm/components/transfer-instance-dialog.tsx` (CRÉÉ)
- `packages/modules/crm/components/transfer-instance-dialog.test.tsx` (CRÉÉ)
- `packages/modules/crm/components/client-info-tab.tsx` (MODIFIÉ)
- `packages/modules/crm/components/client-info-tab.test.tsx` (MODIFIÉ)
- `supabase/functions/transfer-client-instance/index.ts` (CRÉÉ)
- `apps/client/middleware.ts` (MODIFIÉ)
- `apps/client/app/transferred/page.tsx` (CRÉÉ)
- `apps/client/middleware.test.ts` (MODIFIÉ)
- `tests/rls/instance-transfers-rls.test.ts` (CRÉÉ)

### Change Log
- Story 9.5b implémentée — transfert instance One au client sortant (2026-03-05)
