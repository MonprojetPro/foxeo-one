# Story 10.3: Configuration modules actifs par MiKL & injection documentation Elio One

Status: done

## Story

As a **MiKL (opérateur)**,
I want **configurer les modules actifs pour chaque client One et injecter la documentation dans Elio One après un déploiement**,
so that **chaque client a un dashboard adapté à ses besoins et Elio One connaît les outils déployés**.

## Acceptance Criteria

**Given** MiKL consulte la fiche d'un client One dans le Hub (FR42)
**When** il accède à la section "Modules actifs"
**Then** il voit la liste de tous les modules disponibles avec pour chacun :
- Nom et description du module
- Icône du module
- Toggle actif/inactif
- Statut actuel (activé/désactivé)
- Date d'activation (si activé)
**And** les modules de base (core-dashboard, chat, documents, elio) sont toujours actives et non désactivables (grisés)
**And** les modules commerciaux configurables : Signature, Calendrier, Branding, Site Web, SEO, Social, Maintenance

**Given** MiKL active ou désactive un module
**When** il clique sur le toggle
**Then** la Server Action `updateActiveModules(clientId, moduleId, enabled)` s'exécute :
1. Met à jour `client_configs.active_modules` (ajout ou retrait du moduleId)
2. Logge l'événement dans `activity_logs`
3. L'effet est immédiat : au prochain chargement, le client voit/ne voit plus le module
**And** un toast confirme "Module {nom} activé/désactivé pour {client}"
**And** le cache TanStack Query est invalidé (`['client-config', clientId]`)

**Given** MiKL déploie une nouvelle fonctionnalité pour un client et veut mettre à jour la documentation Elio (FR43)
**When** il accède à la section "Documentation Elio" de la fiche client
**Then** il voit un formulaire pour injecter la documentation par module :
- Sélection du module concerné (dropdown des modules actifs)
- Champ "Description" : ce que le module fait (textarea)
- Champ "Questions fréquentes" : paires question/réponse (ajout dynamique)
- Champ "Problèmes courants" : paires problème/solution (ajout dynamique)
- Bouton "Sauvegarder"

**Given** MiKL sauvegarde la documentation Elio
**When** la Server Action `injectElioDocumentation(clientId, moduleId, documentation)` s'exécute
**Then** la documentation est stockée dans `client_configs.elio_module_docs` :
```typescript
type ElioModuleDoc = {
  moduleId: string
  description: string
  faq: Array<{ question: string; answer: string }>
  commonIssues: Array<{ problem: string; diagnostic: string; escalation: string }>
  updatedAt: string
}
```
**And** Elio One intègre cette documentation dans son system prompt dès la prochaine conversation
**And** un toast confirme "Documentation Elio mise à jour pour le module {nom}"
**And** MiKL peut aussi coller un JSON de documentation (généré par Orpheus) pour les cas complexes

## Tasks / Subtasks

- [x] Ajouter colonne `elio_module_docs` dans `client_configs` (AC: #4)
  - [x] Créer migration `supabase/migrations/00060_add_elio_module_docs.sql`
  - [x] `ALTER TABLE client_configs ADD COLUMN elio_module_docs JSONB NOT NULL DEFAULT '[]'::jsonb`
  - [x] Ajouter type `ElioModuleDoc` dans `packages/types/src/client-config.types.ts`
  - [x] Ajouter `elioModuleDocs?: ElioModuleDoc[]` dans type `ClientConfig`

- [x] Créer Server Action `updateActiveModules` (AC: #2)
  - [x] Créer `packages/modules/crm/actions/update-active-modules.ts`
  - [x] Signature: `updateActiveModules(clientId: string, moduleId: string, enabled: boolean): Promise<ActionResponse<void>>`
  - [x] Validation Zod : clientId UUID, moduleId string non vide, enabled boolean
  - [x] Guard : modules de base (`['core-dashboard', 'chat', 'documents', 'elio']`) → retourner error 'MODULE_LOCKED' si tentative de désactivation
  - [x] Si `enabled=true` → dédupliquer puis append moduleId
  - [x] Si `enabled=false` → array.filter pour retirer moduleId
  - [x] INSERT `activity_logs` : type 'module_toggled', metadata `{ moduleId, enabled, clientName }`
  - [x] Format `{ data: null, error }` standard, jamais de throw

- [x] Créer composant ModuleToggleList pour Hub (AC: #1, #2)
  - [x] Créer `packages/modules/crm/components/module-toggle-list.tsx`
  - [x] Props : `{ clientId: string, activeModules: string[], allModules: ModuleManifest[] }`
  - [x] Afficher liste de modules avec : icône, nom, description, toggle switch
  - [x] Modules de base → toggle disabled + badge "Inclus"
  - [x] Modules commerciaux → toggle cliquable
  - [x] Au toggle → appeler `updateActiveModules` + `showSuccess/showError` toast
  - [x] Invalider query `['client-config', clientId]` après succès

- [x] Intégrer ModuleToggleList dans la fiche client Hub (AC: #1)
  - [x] Identifier où est la fiche client dans `packages/modules/crm/` (Story 2.3)
  - [x] Ajouter un onglet "Modules" dans la vue détaillée client (`client-tabs.tsx`)
  - [x] Props `activeModules` et `allModules` ajoutées à `ClientTabs`
  - [x] `ModuleToggleList` + `ElioDocForm` dans le TabsContent "modules"

- [x] Créer Server Action `injectElioDocumentation` (AC: #3, #4)
  - [x] Créer `packages/modules/crm/actions/inject-elio-documentation.ts`
  - [x] Signature: `injectElioDocumentation(clientId: string, doc: ElioModuleDoc): Promise<ActionResponse<void>>`
  - [x] Validation Zod : clientId UUID, doc.moduleId string, doc.description string min 10 chars
  - [x] Fetch `client_configs.elio_module_docs` (array JSONB)
  - [x] Si moduleId existe déjà → remplacer ; sinon → append
  - [x] UPDATE `client_configs SET elio_module_docs = ...` avec nouveau array
  - [x] INSERT `activity_logs` : type 'elio_doc_injected', metadata `{ moduleId }`
  - [x] Format `{ data: null, error }` standard

- [x] Créer formulaire injection documentation Elio dans Hub (AC: #3, #4)
  - [x] Créer `packages/modules/crm/components/elio-doc-form.tsx`
  - [x] Composant 'use client' avec React Hook Form + Zod
  - [x] Dropdown `<select>` HTML natif : sélection module (parmi `activeModules`)
  - [x] Textarea "Description" du module
  - [x] Section FAQ : array de paires {question, answer} avec bouton "Ajouter une FAQ" (useFieldArray)
  - [x] Section "Problèmes courants" : array {problem, diagnostic, escalation} avec bouton "Ajouter"
  - [x] Zone "Import JSON" : textarea pour coller un JSON complet (parse + validation Zod)
  - [x] Bouton "Sauvegarder" → `injectElioDocumentation`
  - [x] Toast succès/erreur

- [x] Intégrer documentation Elio dans le system prompt Elio One (AC: #4)
  - [x] Modifier `packages/modules/elio/actions/send-to-elio.ts`
  - [x] Lors du fetch `client_configs`, récupérer `elio_module_docs` (remplace `modules_documentation`)
  - [x] Fonction `buildElioModuleDocsPrompt()` — format compact : `## moduleId\ndesc\n### FAQ\n- Q: ...\n  R: ...`
  - [x] Injecté via `activeModulesDocs` dans `buildSystemPrompt`

- [x] Créer tests unitaires (TDD)
  - [x] Test `updateActiveModules` : activation, désactivation, guard modules de base, activity_log (13 tests)
  - [x] Test `injectElioDocumentation` : création, mise à jour, validation Zod, JSON import (10 tests)
  - [x] Test `module-toggle-list.tsx` : rendu modules de base disabled, toggle commercial, toast (8 tests)
  - [x] Test `elio-doc-form.tsx` : ajout FAQ, import JSON, validation, submit (12 tests)

## Dev Notes

### Architecture Patterns
- **Pattern Server Action mutation** : `updateActiveModules` + `injectElioDocumentation` — pattern `{ data, error }` strict
- **Pattern array Supabase** : `array_append` / `array_remove` pour `active_modules TEXT[]` — éviter de re-fetcher l'array complet avant update
- **Pattern JSONB update** : `elio_module_docs` est un array JSONB → fetch, modifier en TS, re-sauvegarder
- **Pattern system prompt injection** : Elio lit `elio_module_docs` à chaque conversation pour construire son contexte

### Source Tree Components
```
supabase/migrations/
└── 00060_add_elio_module_docs.sql                  # CRÉER: colonne elio_module_docs

packages/types/src/
└── client-config.types.ts                          # MODIFIER: ElioModuleDoc type + ClientConfig

packages/modules/crm/
├── actions/
│   ├── update-active-modules.ts                    # CRÉER: toggle module
│   ├── update-active-modules.test.ts              # CRÉER: tests
│   ├── inject-elio-documentation.ts               # CRÉER: injecter doc
│   └── inject-elio-documentation.test.ts          # CRÉER: tests
└── components/
    ├── module-toggle-list.tsx                      # CRÉER: liste modules Hub
    ├── module-toggle-list.test.ts                 # CRÉER: tests
    ├── elio-doc-form.tsx                           # CRÉER: formulaire doc Elio
    ├── elio-doc-form.test.ts                      # CRÉER: tests
    └── client-detail-tabs.tsx (ou équivalent)     # MODIFIER: ajouter onglet "Modules"

packages/modules/elio/actions/
└── (action system prompt)                          # MODIFIER: injecter elio_module_docs
```

### Existing Code Findings
- `packages/modules/crm/` : module CRM — contient les Server Actions mutations client (Stories 2.x)
- `activity_logs` table : pattern `INSERT activity_logs` établi dans chaque action (cf. 9.5a, 9.5c)
- `client_configs.active_modules TEXT[]` : array PostgreSQL — utiliser `array_append`/`array_remove` ou SQL set notation
- `client_configs.elio_config JSONB` : pattern JSONB existant — même pattern pour `elio_module_docs`
- Migration numéro suivant : `00059` déjà pris par Story 10.2 (`show_lab_teasing`) → utiliser `00060`
- `packages/modules/elio/` : module Elio unifié (Story 8.1) — contient le system prompt builder

### Technical Constraints
- `array_append(active_modules, moduleId::text)` — PostgreSQL : si moduleId déjà présent, il sera dupliqué → utiliser `array_remove(active_modules, moduleId) || ARRAY[moduleId]` pour dédupliquer
- Modules de base verrouillés : `['core-dashboard', 'chat', 'documents', 'elio']` — guard côté Server Action ET côté UI (toggle disabled)
- `elio_module_docs` JSONB : ne pas utiliser `jsonb_set` (complexe) → fetch array, modifier en TypeScript, UPDATE complet
- La section "Modules" dans la fiche client Hub → identifier le composant tabs dans `packages/modules/crm/` (Story 2.3 l'a créé)
- Import JSON : valider avec Zod le JSON collé → `ElioModuleDoc` schema

### UI Patterns
- Toggle switch : pas de `Switch` dans `@foxeo/ui` → utiliser `<input type="checkbox" role="switch">` ou vérifier si Radix Switch est disponible
- Formulaire React Hook Form : `useFieldArray` pour les arrays FAQ et problèmes courants
- Dropdown module : pas de `Select` natif dans `@foxeo/ui` → utiliser `<select>` HTML natif ou custom dropdown `useState`
- Import JSON : `textarea` + `JSON.parse` + validation Zod avec try/catch

### Previous Story Learnings
- Pattern activity_logs INSERT : `supabase.from('activity_logs').insert({ client_id, operator_id, type, metadata })`
- Pattern invalidation TanStack Query : depuis Server Action impossible directement → retourner succès, côté client appeler `queryClient.invalidateQueries({ queryKey: ['client-config', clientId] })`
- `useFieldArray` de react-hook-form fonctionne pour sections dynamiques (FAQ, problèmes)
- Toast: `showSuccess()` et `showError()` depuis `@foxeo/ui`

### References
- [Source: _bmad-output/planning-artifacts/epics/epic-10-dashboard-one-modules-commerciaux-stories-detaillees.md#Story 10.3]
- [Source: supabase/migrations/00003_create_client_configs.sql] — schema client_configs
- [Source: packages/types/src/client-config.types.ts] — types existants
- [Source: docs/project-context.md#API Response Format] — ActionResponse
- [Source: docs/project-context.md#Anti-Patterns] — jamais throw dans Server Actions
- [Source: _bmad-output/planning-artifacts/foxeo-modules-commerciaux.md] — liste modules commerciaux

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Migration `00060_add_elio_module_docs.sql` : colonne JSONB `elio_module_docs NOT NULL DEFAULT '[]'`
- Type `ElioModuleDoc` ajouté dans `@foxeo/types` + `ClientConfig.elioModuleDocs?`
- `updateActiveModules` : guard `MODULE_LOCKED` pour les 4 modules de base, déduplique l'array lors de l'activation, logge `module_toggled` dans `activity_logs`
- `injectElioDocumentation` : remplace le doc existant pour le même moduleId (upsert TS), logge `elio_doc_injected`
- `ModuleToggleList` : toggle `<input type="checkbox" role="switch">` (pas de Switch dans @foxeo/ui), badge "Inclus" pour modules de base, invalidation TanStack Query après succès
- `ElioDocForm` : `useFieldArray` pour FAQ + problèmes courants, import JSON avec validation Zod, `<select>` HTML natif
- `client-tabs.tsx` : onglet "Modules" ajouté avec props `activeModules` et `allModules`
- `send-to-elio.ts` : colonne `modules_documentation` → `elio_module_docs`, ajout `buildElioModuleDocsPrompt()` format compact
- **43 tests** créés et passants (13 + 10 + 8 + 12)

#### Code Review Fixes (Opus)
- **HIGH** : `ElioModuleDoc` ajouté au barrel export `@foxeo/types/index.ts` (manquant → build cassé)
- **MEDIUM** : `successResponse(null)` au lieu de `successResponse(undefined)` dans les 2 server actions (cohérence pattern projet)
- **MEDIUM** : Utilisation de `parsed.data.doc` (données validées) au lieu du paramètre brut `doc` dans `inject-elio-documentation.ts`
- **MEDIUM (documenté)** : "Date d'activation" (AC #1) nécessiterait une extension du schéma `active_modules` (TEXT[] → JSONB) — gap documenté, non bloquant
- 62 tests passants après fixes (43 story + 19 send-to-elio existants)

### File List

- `supabase/migrations/00060_add_elio_module_docs.sql` (nouveau)
- `packages/types/src/client-config.types.ts` (modifié)
- `packages/types/src/index.ts` (modifié — CR fix barrel export)
- `packages/modules/crm/actions/update-active-modules.ts` (nouveau)
- `packages/modules/crm/actions/update-active-modules.test.ts` (nouveau)
- `packages/modules/crm/actions/inject-elio-documentation.ts` (nouveau)
- `packages/modules/crm/actions/inject-elio-documentation.test.ts` (nouveau)
- `packages/modules/crm/components/module-toggle-list.tsx` (nouveau)
- `packages/modules/crm/components/module-toggle-list.test.tsx` (nouveau)
- `packages/modules/crm/components/elio-doc-form.tsx` (nouveau)
- `packages/modules/crm/components/elio-doc-form.test.tsx` (nouveau)
- `packages/modules/crm/components/client-tabs.tsx` (modifié)
- `packages/modules/elio/actions/send-to-elio.ts` (modifié)
