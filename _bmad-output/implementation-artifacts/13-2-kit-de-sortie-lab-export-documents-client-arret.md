# Story 13.2: Kit de sortie Lab — export documents client arrêt parcours

> ## Contexte — Décision 2026-04-14
>
> Cette story complète le kit de sortie One ([Story 13.1](./13-1-kit-de-sortie-client-handoff-vercel-github-supabase-standalone.md)) avec un **kit de sortie Lab** plus léger : aucun provisioning Vercel / GitHub / Supabase n'est nécessaire — le client n'a jamais eu d'instance One dédiée. Il s'agit uniquement d'exporter proprement tous les livrables produits pendant le parcours Lab (briefs, PRD, chats Élio Lab, documents générés) dans un ZIP téléchargeable, puis de couper l'accès Lab après un délai de grâce.

Status: ready-for-dev
Priority: medium
Estimate: medium (~2-3 jours — orchestration export + ZIP + email)

## Story

As a **MiKL (opérateur)**,
I want **pouvoir déclencher un kit de sortie Lab pour un client qui arrête son parcours Lab sans graduer**,
so that **je puisse lui livrer tous ses documents (briefs, PRD, chats Élio Lab, documents générés) dans un export ZIP récupérable, et couper proprement son accès Lab**.

## Acceptance Criteria

### AC1 — Trigger depuis le Hub

**Given** MiKL consulte la fiche d'un client
**When** `client.dashboard_type === 'lab'` ET `client.graduated_at IS NULL`
**Then** un bouton "Lancer kit de sortie Lab" est visible sur la fiche client
**And** au clic, une modale de confirmation s'ouvre avec un récap : nombre de documents, nombre de briefs, nombre de conversations Élio Lab
**And** MiKL doit confirmer explicitement avant le déclenchement

### AC2 — Extraction des documents

**Given** le kit de sortie Lab est déclenché
**When** l'étape d'extraction des documents démarre
**Then** le script liste tous les documents du client via `documents` table (RLS-filtered `client_id`)
**And** récupère chaque fichier depuis Supabase Storage
**And** les inclut dans le ZIP sous `/documents/` en préservant les noms d'origine

### AC3 — Extraction des briefs

**Given** les documents ont été extraits
**When** l'étape d'extraction des briefs démarre
**Then** le script exporte tous les briefs du parcours Lab (validés et en cours)
**And** chaque brief est converti en Markdown lisible et stocké sous `/briefs/{brief_name}.md`
**And** inclut le PRD final existant si disponible

### AC4 — Extraction des chats Élio Lab

**Given** les briefs ont été exportés
**When** l'étape d'extraction des conversations démarre
**Then** le script exporte l'historique complet des conversations Élio Lab du client
**And** chaque conversation est convertie en Markdown transcript lisible sous `/chats/elio-lab-{date}.md`
**And** chaque message est horodaté avec `role` (user/assistant)

### AC5 — Génération du PRD consolidé

**Given** les briefs ont été exportés
**When** aucun PRD consolidé n'existe déjà
**Then** le script compile tous les briefs validés en un document PRD unique
**And** stocke le fichier `PRD.md` à la racine du ZIP
**And** préserve l'ordre logique (contexte, objectifs, scope, fonctionnalités, UX, techniques)

### AC6 — Packaging ZIP

**Given** tous les contenus ont été extraits
**When** l'étape de packaging démarre
**Then** le script crée le ZIP côté serveur (Edge Function ou Server Action via `jszip`)
**And** stocke le ZIP dans Supabase Storage bucket `lab-exports/{client_id}/{timestamp}.zip`
**And** génère un lien signé valable **14 jours**
**And** stocke le lien dans `client_lab_exports.zip_url`

### AC7 — Email au client

**Given** le ZIP est disponible
**When** l'étape d'envoi email démarre
**Then** un email est envoyé au client avec le lien de téléchargement
**And** le corps explique le contenu du ZIP (documents, briefs, PRD, chats)
**And** informe que l'accès Lab sera coupé automatiquement **7 jours après la génération**
**And** un email de relance est planifié à J+7 avant coupure

### AC8 — Marquage DB + audit

**Given** l'export a été envoyé
**When** l'étape de marquage démarre
**Then** `client.status` passe à `'archived_lab'`
**And** un enregistrement est créé dans `client_lab_exports` : `id`, `client_id`, `zip_url`, `generated_at`, `downloaded_at` (null), `expires_at` (+14j)
**And** une entrée `activity_logs` est créée avec `action: 'lab_exit_kit_generated'`

### AC9 — Coupure accès après 7 jours

**Given** un client a `status: 'archived_lab'` ET `generated_at + 7 days < NOW()`
**When** le client tente d'accéder à son dashboard Lab
**Then** le middleware bloque l'accès
**And** redirige vers `/archived` (page existante Story 9.5c)
**And** affiche un message "Ton parcours Lab a été archivé. Si tu n'as pas téléchargé ton export, contacte MiKL."

## Tasks / Subtasks

- [ ] Migration DB : créer table `client_lab_exports` (AC: #8)
  - [ ] Colonnes : `id`, `client_id`, `zip_url`, `generated_at`, `downloaded_at`, `expires_at`, `created_at`, `updated_at`
  - [ ] Index sur `client_id`
  - [ ] RLS : opérateur owner + client owner peuvent SELECT
  - [ ] Trigger `trg_client_lab_exports_updated_at`
- [ ] Migration DB : ajouter `'archived_lab'` à la CHECK constraint `clients.status`
  - [ ] DROP + re-ADD la constraint avec le nouveau statut
- [ ] Extracteur documents `packages/modules/parcours/actions/export-lab-documents.ts` (AC: #2)
  - [ ] Query `documents WHERE client_id = ?`
  - [ ] Fetch chaque fichier via Supabase Storage `download()`
  - [ ] Retourne `Array<{ path, buffer }>`
- [ ] Extracteur briefs + PRD `packages/modules/parcours/actions/export-lab-briefs.ts` (AC: #3, #5)
  - [ ] Query `briefs WHERE client_id = ?`
  - [ ] Convertit chaque brief en Markdown lisible
  - [ ] Compile le PRD consolidé à partir des briefs validés
- [ ] Extracteur chats `packages/modules/elio/actions/export-lab-chats.ts` (AC: #4)
  - [ ] Query `conversations` + `messages` filtrés sur Élio Lab
  - [ ] Convertit chaque conversation en transcript Markdown horodaté
- [ ] Packager ZIP `packages/modules/parcours/utils/build-lab-zip.ts` (AC: #6)
  - [ ] Utiliser `jszip`
  - [ ] Structure : `/documents/`, `/briefs/`, `/chats/`, `/PRD.md`
- [ ] Upload Storage + signed URL `packages/modules/parcours/actions/upload-lab-export.ts` (AC: #6)
  - [ ] Bucket `lab-exports` (créer si inexistant via migration)
  - [ ] `createSignedUrl(path, 14 * 24 * 3600)`
- [ ] Email service `packages/modules/email/actions/send-lab-export-email.ts` (AC: #7)
  - [ ] Réutiliser infra email existante (Story 12.3 templates)
  - [ ] Template `lab_exit_kit_ready` + template relance `lab_exit_kit_reminder` (J+7)
- [ ] Orchestrateur `packages/modules/parcours/actions/start-lab-exit-kit.ts`
  - [ ] Server Action `{ data: { exportId }, error }`
  - [ ] Enchaîne : extract docs → briefs → chats → PRD → ZIP → upload → email → marquage DB
- [ ] UI Hub : bouton "Lancer kit de sortie Lab" sur fiche client CRM (AC: #1)
  - [ ] Modifier `packages/modules/crm/components/client-info-tab.tsx`
  - [ ] Visible si `dashboard_type === 'lab'` ET `graduated_at IS NULL`
  - [ ] Modale confirmation avec récap counts
- [ ] Middleware : check `status === 'archived_lab'` (AC: #9)
  - [ ] Dans `apps/client/middleware.ts`
  - [ ] Si `generated_at + 7 days < NOW()` → redirect `/archived`
- [ ] Tests unitaires des extracteurs (documents, briefs, chats, PRD)
- [ ] Tests intégration workflow complet (mock Storage + email)

## Dev Notes

### Architecture Patterns
- **Pattern export** : orchestration séquentielle avec Server Action unique (pas d'Edge Function pour cette story — volume attendu raisonnable)
- **Pattern email** : réutilisation infra email Story 12.3 (templates réutilisables)
- **Pattern délai de grâce** : coupure accès à J+7 (middleware check, pas de cron nécessaire)
- **Pattern signed URL** : 14 jours pour donner de la marge au client

### Source Tree Components

```
packages/modules/parcours/
├── actions/
│   ├── export-lab-documents.ts           # CRÉER
│   ├── export-lab-documents.test.ts
│   ├── export-lab-briefs.ts              # CRÉER
│   ├── export-lab-briefs.test.ts
│   ├── upload-lab-export.ts              # CRÉER
│   └── start-lab-exit-kit.ts             # CRÉER (orchestrateur)
├── utils/
│   ├── build-lab-zip.ts                  # CRÉER
│   └── build-lab-zip.test.ts

packages/modules/elio/
└── actions/
    ├── export-lab-chats.ts                # CRÉER
    └── export-lab-chats.test.ts

packages/modules/email/
└── actions/
    └── send-lab-export-email.ts           # CRÉER

packages/modules/crm/
└── components/
    └── client-info-tab.tsx                # MODIFIER: ajouter bouton "Lancer kit de sortie Lab"

apps/client/
└── middleware.ts                          # MODIFIER: check 'archived_lab' + coupure J+7

supabase/migrations/
├── [timestamp]_create_client_lab_exports.sql   # CRÉER
└── [timestamp]_add_archived_lab_status.sql     # CRÉER
```

### Testing Standards
- Vitest, co-localisés (`*.test.ts`)
- Mock Supabase Storage + email service
- Tester uniquement les fichiers de la story (pas de full suite)

### Database Schema Changes

```sql
-- Migration: create client_lab_exports
CREATE TABLE client_lab_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  zip_url TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  downloaded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_client_lab_exports_client_id ON client_lab_exports(client_id);

ALTER TABLE client_lab_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_lab_exports_select_operator_or_owner"
  ON client_lab_exports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM clients WHERE clients.id = client_lab_exports.client_id
            AND (clients.operator_id = auth.uid() OR clients.auth_user_id = auth.uid()))
    OR is_admin()
  );

CREATE POLICY "client_lab_exports_insert_operator"
  ON client_lab_exports FOR INSERT
  WITH CHECK (is_operator());

CREATE TRIGGER trg_client_lab_exports_updated_at
  BEFORE UPDATE ON client_lab_exports
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- Migration: add archived_lab status
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients
  ADD CONSTRAINT clients_status_check
  CHECK (status IN ('active', 'trial', 'suspended', 'archived', 'archived_lab'));
```

### Dependencies

- **Dépend de** :
  - Story 9.5c (page `/archived` existe déjà)
  - Table `documents` (Epic 4)
  - Chats Élio Lab (Epic 8)
  - Briefs (Epic 6)
  - Infra email templates (Story 12.3)
- **Bloque** : arrêts Lab sans graduation (permet de récupérer les livrables proprement)

### Risks

- **Volume documents important** → potentiel timeout Server Action (prévoir bascule Edge Function si dépassement)
- **URL signée 14 jours expirée avant téléchargement** → email de relance à J+7 obligatoire
- **Perte de données** → conserver le ZIP pendant 30 jours minimum même après expiration du lien signé, permettre régénération du lien sur demande MiKL

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

- Story 13.2 créée — kit de sortie Lab export documents client arrêt (2026-04-14)
