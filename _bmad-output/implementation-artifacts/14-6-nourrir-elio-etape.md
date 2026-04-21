# Story 14.6 : Nourrir l'Élio d'une Étape (Contexte Client)

Status: ready-for-dev

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

- [ ] Task 1 — Migration SQL `client_step_contexts` (AC: #2, #3, #5)
  - [ ] 1.1 Créer migration `00099_create_client_step_contexts.sql`
  - [ ] 1.2 Table : `id` (UUID PK), `client_parcours_agent_id` (UUID FK client_parcours_agents), `content_type` (TEXT CHECK IN ('text','file')), `content_text` (TEXT), `file_path` (TEXT), `file_name` (TEXT), `injected_by_operator_id` (UUID FK operators), `consumed_at` (TIMESTAMPTZ), `created_at`, `updated_at`
  - [ ] 1.3 RLS : SELECT/INSERT/UPDATE pour `is_operator()` — SELECT aussi pour `is_owner()` (le client peut voir qu'un contexte existe, mais pas le contenu brut)
  - [ ] 1.4 Trigger `trg_client_step_contexts_updated_at`

- [ ] Task 2 — Extraction texte fichiers (AC: #3)
  - [ ] 2.1 Server Action `packages/modules/elio/actions/extract-file-text.ts` — supporte PDF (pdf-parse) et TXT. Pour Word (.docx) : extraction basique du XML zip
  - [ ] 2.2 Upload vers Supabase Storage bucket `step-contexts` (privé, accès operator uniquement)
  - [ ] 2.3 Tests d'extraction

- [ ] Task 3 — Server Actions contexte (AC: #2, #3, #5, #7)
  - [ ] 3.1 `packages/modules/elio/actions/inject-step-context.ts` — crée l'entrée `client_step_contexts` (texte ou fichier)
  - [ ] 3.2 `packages/modules/elio/actions/get-step-contexts.ts` — liste les contextes d'une étape
  - [ ] 3.3 `packages/modules/elio/actions/delete-step-context.ts` — supprime une entrée
  - [ ] 3.4 `packages/modules/elio/actions/consume-step-context.ts` — marque `consumed_at = now()`
  - [ ] 3.5 Tests co-localisés

- [ ] Task 4 — Panneau Hub "Nourrir Élio" (AC: #1, #2, #3, #7)
  - [ ] 4.1 `packages/modules/elio/components/inject-step-context-panel.tsx` — textarea prompt + upload fichier + historique injections
  - [ ] 4.2 Badge "N contexte(s) injecté(s)" sur la carte d'étape dans `ClientParcoursAgentsList`
  - [ ] 4.3 Test du composant

- [ ] Task 5 — Message Élio transparent (AC: #4)
  - [ ] 5.1 `packages/modules/elio/utils/compose-step-context-message.ts` — génère le message d'annonce MiKL selon le type de contexte
  - [ ] 5.2 Format text : *"MiKL a ajouté des précisions pour cette étape. Il te demande : [content_text]"*
  - [ ] 5.3 Format file : *"MiKL a consulté le document '[file_name]' et il te demande : [content_text extrait]"*
  - [ ] 5.4 Tests unitaires du composeur de message

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

*(auto-généré à la complétion)*
