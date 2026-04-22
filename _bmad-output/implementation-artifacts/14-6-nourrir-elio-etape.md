# Story 14.6 : Nourrir l'Élio d'une Étape (Contexte Client)

Status: done

## Story

En tant qu'**opérateur MiKL**,
je veux **injecter du contexte spécifique dans l'Élio d'une étape pour un client donné**,
afin de **personnaliser la conversation Élio avec des informations, questions ou documents que j'ai préparés pour ce client précis**.

## Acceptance Criteria

**Given** MiKL est sur la fiche client → onglet Lab → étape en cours
**When** il clique "Nourrir Élio"
**Then** un panneau s'ouvre avec deux options : "Ajouter un prompt" ou "Uploader un fichier"

**Given** MiKL tape un prompt texte et valide
**When** le contexte est sauvegardé
**Then** une entrée est créée dans `client_step_contexts` (type: text) et un badge "1 contexte injecté" s'affiche sur l'étape

**Given** MiKL uploade un fichier (PDF, Word, TXT)
**When** l'upload est complété
**Then** le fichier est stocké dans Supabase Storage, le texte est extrait, une entrée est créée dans `client_step_contexts` (type: file) et le badge se met à jour

**Given** un ou plusieurs contextes existent pour une étape
**When** le client ouvre le chat Élio de cette étape
**Then** Élio ouvre la conversation en annonçant l'intervention de MiKL :
> *"[Nom du client], MiKL a [consulté le document que tu lui as soumis / ajouté des précisions] et il te demande : [contenu du contexte]"*

**Given** le contexte a été présenté au client
**When** la conversation est initiée
**Then** le contexte est marqué `consumed_at = now()` et ne sera plus réinjecté dans les conversations suivantes (sauf si MiKL en ajoute un nouveau)

**Given** MiKL ouvre le panneau "Nourrir Élio" d'une étape
**When** des contextes précédents existent
**Then** l'historique des injections est visible (date, type, extrait) avec possibilité de supprimer

## Tasks / Subtasks

- [x] Task 1 — Migration SQL `client_step_contexts` (AC: #2, #3, #5)
  - [x] 1.1 Migration `00101_alter_client_step_contexts_file_support.sql` (extension de 00100 créé en 14.5)
  - [x] 1.2 Colonnes ajoutées : `client_parcours_agent_id`, `content_type`, `file_path`, `file_name`
  - [x] 1.3 Bucket Storage `step-contexts` créé dans la migration avec policy opérateur
  - [x] 1.4 Index sur `client_parcours_agent_id WHERE consumed_at IS NULL`

- [x] Task 2 — Extraction texte fichiers (AC: #3)
  - [x] 2.1 `extract-file-text.ts` — TXT (TextDecoder), DOCX (mammoth), PDF (placeholder)
  - [x] 2.2 Upload Storage dans `inject-step-context.ts` avec sanitisation nom (leçon DL-002)
  - [x] 2.3 8 tests d'extraction

- [x] Task 3 — Server Actions contexte (AC: #2, #3, #5, #7)
  - [x] 3.1 `inject-step-context.ts` — ownership check + text/file + rollback Storage si DB fail
  - [x] 3.2 `get-step-contexts.ts` — liste contextes par parcoursAgentId
  - [x] 3.3 `delete-step-context.ts` — suppression DB + nettoyage Storage orphelin
  - [x] 3.4 `consume-step-context.ts` — existait déjà depuis Story 14.5
  - [x] 3.5 Tests co-localisés

- [x] Task 4 — Panneau Hub "Nourrir Élio" (AC: #1, #2, #3, #7)
  - [x] 4.1 `inject-step-context-panel.tsx` — Sheet + 2 onglets + historique + badge pending
  - [x] 4.2 Bouton "Nourrir Élio" + badge amber sur `ClientParcoursAgentsList`
  - [x] 4.3 9 tests composant + 12 tests liste (intégration panel)

- [x] Task 5 — Message Élio transparent (AC: #4)
  - [x] 5.1 `compose-step-context-message.ts` — message d'annonce MiKL selon type
  - [x] 5.2 Format text : "MiKL a ajouté des précisions pour cette étape. Il te demande : [...]"
  - [x] 5.3 Format file : "MiKL a consulté le document '[file_name]' et il te demande : [...]"
  - [x] 5.4 4 tests unitaires

## Dev Notes

### Formats fichiers supportés
- **PDF** : `pdf-parse` (npm)
- **TXT** : lecture directe
- **DOCX** : extraction du `word/document.xml` dans le zip (pas besoin de librairie lourde)
- **Autres** : refusés avec message d'erreur clair

### Bucket Supabase Storage
- Bucket : `step-contexts` — privé (pas de public access)
- Path : `{operator_id}/{client_id}/{step_id}/{filename}`
- Taille max : 10 MB par fichier

### Consommation du contexte
Le contexte est injecté UNE SEULE FOIS dans la première réponse Élio après injection. `consumed_at` est mis à jour dès que le chat charge le contexte. Si MiKL injecte à nouveau, un nouveau contexte non-consommé est créé.

### Séparation des responsabilités
Cette story crée l'injection. Story 14.5 branche l'injection dans le chat Élio.

## File List

### Nouveaux fichiers
- `supabase/migrations/00101_alter_client_step_contexts_file_support.sql`
- `packages/modules/elio/actions/extract-file-text.ts`
- `packages/modules/elio/actions/extract-file-text.test.ts`
- `packages/modules/elio/actions/inject-step-context.ts`
- `packages/modules/elio/actions/inject-step-context.test.ts`
- `packages/modules/elio/actions/get-step-contexts.ts`
- `packages/modules/elio/actions/get-step-contexts.test.ts`
- `packages/modules/elio/actions/delete-step-context.ts`
- `packages/modules/elio/actions/delete-step-context.test.ts`
- `packages/modules/elio/utils/compose-step-context-message.ts`
- `packages/modules/elio/utils/compose-step-context-message.test.ts`
- `packages/modules/elio/components/inject-step-context-panel.tsx`
- `packages/modules/elio/components/inject-step-context-panel.test.tsx`
- `packages/modules/parcours/actions/get-step-context-counts.ts`
- `docs/client-release-notes.md`

### Fichiers modifiés
- `packages/modules/elio/actions/get-effective-step-config.ts` (requête contexte par client_parcours_agent_id)
- `packages/modules/elio/actions/get-effective-step-config.test.ts` (+2 tests)
- `packages/modules/elio/index.ts` (exports Story 14.6)
- `packages/modules/parcours/index.ts` (export getStepContextCounts)
- `packages/modules/parcours/components/client-parcours-agents-list.tsx` (bouton Nourrir Élio + panel)
- `packages/modules/parcours/components/client-parcours-agents-list.test.tsx` (+4 tests)
- `packages/modules/elio/package.json` (dépendance mammoth)

## Completion Notes

- Tests : 59 passing (8 fichiers)
- Migration 00101 poussée en production (`npx supabase db push --linked`)
- Bucket Storage `step-contexts` créé via migration
- Ownership check client/agent ajouté (fix SCAN HIGH)
- Rollback Storage si DB insert échoue (fix SCAN MEDIUM)
- Nettoyage Storage à la suppression (fix SCAN HIGH)
- Validation MIME stricte dans extractFileText (fix SCAN HIGH)
