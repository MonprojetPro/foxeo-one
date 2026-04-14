# Story 10.2: Documents hérités du Lab, livrables & teasing Lab

Status: done

## Story

As a **client One (établi)**,
I want **consulter mes documents hérités du Lab et mes livrables, et voir un teasing Lab si un nouveau projet est possible**,
so that **je retrouve tout mon travail précédent et je sais que je peux relancer un parcours si besoin**.

## Acceptance Criteria

**Given** un client One a été gradué du Lab (FR40)
**When** il accède au module Documents dans son dashboard One
**Then** il peut voir :
- **Section "Briefs Lab"** : tous les briefs générés et validés pendant le parcours Lab (type='brief', filtrés par `source='lab'`)
- **Section "Livrables"** : documents livrés par MiKL après déploiement (type='livrable')
- **Section "Autres documents"** : documents partagés par MiKL (type='shared')
**And** chaque document affiche : titre, date, badge de type, aperçu (rendu HTML pour markdown, thumbnail pour images/PDF)
**And** le module Documents (Epic 4) est réutilisé — les documents Lab sont liés au même `client_id` et donc automatiquement visibles
**And** un filtre "Origine" permet de distinguer : Lab / One / Tous

**Given** un client Direct One (sans parcours Lab)
**When** il accède aux documents
**Then** la section "Briefs Lab" n'est pas affichée (pas de parcours Lab)
**And** seuls les livrables et documents partagés sont visibles

**Given** un client One pourrait bénéficier d'un nouveau parcours Lab (FR41)
**When** il accède à la page d'accueil ou au module Documents
**Then** un encart teasing est affiché :
- Titre : "Un nouveau projet en tête ?"
- Description : "Relancez un parcours Lab pour structurer votre prochain projet avec Elio et MiKL."
- Bouton CTA : "En savoir plus" → ouvre le chat avec MiKL pré-rempli avec "Je souhaite lancer un nouveau parcours Lab"
**And** le teasing est visible uniquement si :
- Le client a un parcours Lab terminé (`parcours.status='completed'`) OU n'a jamais eu de parcours Lab (Direct One)
- Le client n'a PAS de parcours Lab en cours
**And** MiKL peut désactiver le teasing par client via `client_configs.show_lab_teasing: boolean` (défaut: true)

**Given** un onglet "Mon parcours Lab" est accessible (historique Lab)
**When** le client clique dessus
**Then** il voit son parcours Lab terminé en lecture seule :
- Étapes complétées avec dates
- Briefs validés avec liens
- Durée totale du parcours
**And** cette vue est en lecture seule — aucune action possible

## Tasks / Subtasks

- [x] Ajouter colonne `show_lab_teasing` dans `client_configs` (AC: #3)
  - [x] Créer migration `supabase/migrations/00059_add_show_lab_teasing.sql`
  - [x] `ALTER TABLE client_configs ADD COLUMN show_lab_teasing BOOLEAN NOT NULL DEFAULT true`
  - [x] Mettre à jour `ClientConfig` type dans `packages/types/src/client-config.types.ts` : `showLabTeasing?: boolean`

- [x] Créer filtre "Origine" dans le module Documents pour client One (AC: #1)
  - [x] Modifier `packages/modules/documents/components/documents-page-client.tsx`
  - [x] Ajouter un filtre "Origine" : "Tous" | "Lab" | "One"
  - [x] Filtre "Lab" : documents avec `uploadedBy='client'` (source/type absents en DB, proxy via uploadedBy)
  - [x] Filtre "One" : documents créés après graduation (post `graduation_at`) ou uploadedBy='operator'
  - [x] Grouper par sections : "Briefs Lab" / "Livrables" / "Autres documents"
  - [x] N'afficher "Briefs Lab" que si le client a un parcours Lab (`hasLabBackground=true`)

- [x] Créer composant teasing Lab (AC: #3)
  - [x] Créer `packages/modules/core-dashboard/components/lab-teasing-card.tsx`
  - [x] Props : `{ show: boolean, onCTAClick: () => void }`
  - [x] Rendu conditionnel : si `show === false` → null
  - [x] UI : Card avec titre "Un nouveau projet en tête ?", description, bouton CTA
  - [x] `onCTAClick` → ouvre le chat MiKL avec message pré-rempli (router.push vers `/modules/chat?message=Je+souhaite+lancer+un+nouveau+parcours+Lab`)

- [x] Créer Server Action pour vérifier eligibilité teasing (AC: #3)
  - [x] Créer `packages/modules/core-dashboard/actions/get-teasing-eligibility.ts`
  - [x] Signature: `getTeasingEligibility(clientId: string): Promise<ActionResponse<{ showTeasing: boolean }>>`
  - [x] Logique:
    1. Fetch `client_configs.show_lab_teasing` — si false → return `{ showTeasing: false }`
    2. Fetch `parcours` WHERE `client_id=X AND status='en_cours'` — si trouvé → `{ showTeasing: false }`
    3. Sinon → `{ showTeasing: true }`
  - [x] Format `{ data, error }` standard, jamais de throw

- [x] Intégrer teasing sur page d'accueil One (AC: #3)
  - [x] Modifier `apps/client/app/(dashboard)/page.tsx`
  - [x] Appeler `getTeasingEligibility(clientId)` côté serveur
  - [x] Passer `showTeasing` en prop à `CoreDashboard`
  - [x] Afficher `<LabTeasingCard show={showTeasing} />` dans la section accueil

- [x] Créer vue historique Lab en lecture seule (AC: #4)
  - [x] Créer `packages/modules/core-dashboard/components/lab-history-view.tsx`
  - [x] Props : `{ parcours: ParcoursData | null }`
  - [x] Si pas de parcours → message "Vous n'avez pas de parcours Lab"
  - [x] Si parcours : liste des étapes avec dates, briefs validés avec liens vers documents, durée totale
  - [x] Aucun bouton d'action — lecture seule uniquement
  - [x] Exportée via index.ts, intégrable dans module Documents ou accueil

- [x] Créer tests unitaires (TDD)
  - [x] Test `lab-teasing-card.tsx` : affichage conditionnel, click CTA
  - [x] Test `get-teasing-eligibility.ts` : parcours en cours → false, show_lab_teasing false → false, sinon → true
  - [x] Test `lab-history-view.tsx` : sans parcours, avec parcours (étapes, durée)
  - [x] Test filtre "Origine" dans documents page : sections briefs lab, livrables, autres

## Dev Notes

### Architecture Patterns
- **Pattern filtre documents** : les documents Lab existent déjà avec le même `client_id` — pas de migration data, juste un filtre UI sur `source` ou `type`
- **Pattern teasing conditionnel** : logique côté serveur (RSC/Server Action) pour éviter flash UI côté client
- **Pattern lecture seule** : composant historique Lab → aucun Server Action, pas de mutations
- **Pattern configuration par client** : `show_lab_teasing` dans `client_configs` permet à MiKL de désactiver par client

### Source Tree Components
```
supabase/migrations/
└── 00059_add_show_lab_teasing.sql                  # CRÉER: colonne show_lab_teasing

packages/types/src/
└── client-config.types.ts                          # MODIFIER: showLabTeasing?: boolean

packages/modules/core-dashboard/
├── components/
│   ├── lab-teasing-card.tsx                        # CRÉER: encart teasing
│   ├── lab-teasing-card.test.ts                   # CRÉER: tests
│   ├── lab-history-view.tsx                        # CRÉER: historique Lab lecture seule
│   └── lab-history-view.test.ts                   # CRÉER: tests
└── actions/
    ├── get-teasing-eligibility.ts                  # CRÉER: Server Action éligibilité
    └── get-teasing-eligibility.test.ts             # CRÉER: tests

packages/modules/documents/
└── components/                                     # MODIFIER: filtre Origine + sections

apps/client/app/(dashboard)/
└── page.tsx                                        # MODIFIER: intégration teasing
```

### Existing Code Findings
- `supabase/migrations/00003_create_client_configs.sql` : `client_configs` a `parcours_config JSONB` — contient potentiellement l'état du parcours
- `packages/modules/parcours/` : module parcours — contient la logique Lab ; NE PAS importer directement (inter-module interdit) → passer par Supabase
- `packages/modules/documents/` : module documents existant (Epic 4) — réutiliser, ajouter filtre Origine
- `documents` table : colonnes probables `type TEXT`, vérifier si colonne `source` existe ou si type 'brief' suffit pour identifier les briefs Lab
- `client_configs.parcours_config` : JSONB — vérifier structure pour déterminer statut parcours en cours vs terminé

### Technical Constraints
- Inter-module : `core-dashboard` NE PEUT PAS importer `parcours` directement → query directe Supabase pour `parcours_config`
- `show_lab_teasing` migration : numéro disponible = `00059` (dernière: `00058_add_archiving_fields.sql`)
- Filtre Origine : côté client avec `useState` ou côté serveur avec query params — préférer URL params (`?origine=lab`) pour partageabilité
- Historique Lab en lecture seule : pas de mutation possible — ne pas créer de Server Actions pour cette vue
- Le chat MiKL avec message pré-rempli : vérifier si le module `chat` supporte `?message=xxx` comme query param

### UI Patterns
- Sections documents : `<Tabs>` de `@monprojetpro/ui` pour "Briefs Lab" / "Livrables" / "Tous"
- Badge type document : `<Badge variant="outline">Brief Lab</Badge>` etc.
- Teasing card : `Card` avec `CardHeader`, `CardContent` + `Button` CTA
- Historique : liste avec `<ul>` + icônes checklist (modules épiques terminés)

### Previous Story Learnings
- Colonne `show_lab_teasing` : pattern établi pour toggles MiKL-configurables (cf. `9.5c` : `archived_at`, `retention_until`)
- Trigger `updated_at` : si nouvelle colonne dans `client_configs`, le trigger `trg_client_configs_updated_at` se déclenche automatiquement
- Migration numéro : toujours vérifier la dernière migration avant d'attribuer un numéro (`00058` est la dernière)

### References
- [Source: _bmad-output/planning-artifacts/epics/epic-10-dashboard-one-modules-commerciaux-stories-detaillees.md#Story 10.2]
- [Source: supabase/migrations/00003_create_client_configs.sql] — schema client_configs
- [Source: packages/types/src/client-config.types.ts] — ClientConfig type
- [Source: docs/project-context.md#Anti-Patterns] — pas d'import inter-module
- [Source: docs/project-context.md#API Response Format] — ActionResponse pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_Aucun blocage majeur._

### Completion Notes List

- Migration `00059_add_show_lab_teasing.sql` : colonne `show_lab_teasing BOOLEAN DEFAULT true` ajoutée à `client_configs`
- `ClientConfig` type mis à jour avec `showLabTeasing?: boolean`
- `DocumentsPageClient` : filtre "Origine" (Tous/Lab/One) ajouté — proxy `uploadedBy` car `source`/`type` absents de la table `documents`
- `LabTeasingCard` : composant conditionnel (show/hide), CTA → chat avec message pré-rempli
- `getTeasingEligibility` : Server Action qui vérifie `show_lab_teasing` + parcours `en_cours` avant d'afficher le teasing
- `LabHistoryView` : vue lecture seule du parcours Lab avec étapes, dates, durée totale, liens vers documents
- `CoreDashboard` : prop `showTeasing` ajoutée, `LabTeasingCard` intégré, `useRouter` pour navigation
- Page d'accueil One (`app/(dashboard)/page.tsx`) : appel `getTeasingEligibility` côté serveur
- Tests : 44 tests passing (30 nouveaux + 14 existants core-dashboard)
- **Code Review fixes (Opus) :**
  - H1: Ajout `show_lab_teasing` au `.select()` Supabase dans `page.tsx` (valeur était toujours undefined → default true)
  - H2: Restructuration sections documents — `autresDocuments` capture `operator+private` (avant: section jamais visible)
  - H3: Extraction `filterByOrigin`/`groupDocuments` vers `utils/origin-filter.ts` — tests importent le vrai code
  - M2: Ajout directive `'use client'` sur `lab-history-view.tsx`
  - M3: Test ajouté pour erreur DB parcours dans `get-teasing-eligibility.test.ts`
  - M1 (useRouter unconditional): non applicable — hook DOIT être appelé inconditionnellement (Rules of Hooks)
  - L1/L2: documentés, non critiques

### File List

- `supabase/migrations/00059_add_show_lab_teasing.sql` (créé)
- `packages/types/src/client-config.types.ts` (modifié — `showLabTeasing?`)
- `packages/modules/documents/components/documents-page-client.tsx` (modifié — filtre Origine, sections)
- `packages/modules/documents/components/documents-origin-filter.test.tsx` (créé)
- `packages/modules/documents/utils/origin-filter.ts` (créé — CR fix H3)
- `packages/modules/core-dashboard/components/lab-teasing-card.tsx` (créé)
- `packages/modules/core-dashboard/components/lab-teasing-card.test.ts` (créé)
- `packages/modules/core-dashboard/components/lab-history-view.tsx` (créé — CR fix M2: 'use client')
- `packages/modules/core-dashboard/components/lab-history-view.test.ts` (créé)
- `packages/modules/core-dashboard/components/core-dashboard.tsx` (modifié — showTeasing, LabTeasingCard, useRouter)
- `packages/modules/core-dashboard/components/core-dashboard.test.ts` (modifié — mocks next/navigation, lab-teasing-card)
- `packages/modules/core-dashboard/actions/get-teasing-eligibility.ts` (créé)
- `packages/modules/core-dashboard/actions/get-teasing-eligibility.test.ts` (créé — CR fix M3: parcours DB error test)
- `packages/modules/core-dashboard/index.ts` (modifié — exports LabTeasingCard, LabHistoryView, getTeasingEligibility)
- `apps/client/app/(dashboard)/page.tsx` (modifié — CR fix H1: show_lab_teasing dans select)
