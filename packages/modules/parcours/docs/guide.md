# Module Parcours Lab — Guide

## Vue d'ensemble

Le module Parcours Lab permet aux clients Lab de visualiser et progresser dans leur parcours de création entrepreneuriale, étape par étape.

## Fonctionnalités

- **Vue d'ensemble** : timeline verticale des étapes avec statuts visuels
- **Progression linéaire** : chaque étape se débloque après completion de la précédente
- **Navigation** : clic sur étape `current` → vue détaillée, clic sur `locked` → tooltip informatif
- **Complétion automatique** : notification MiKL + client à la fin du parcours
- **Brief détaillé** : contenu markdown par étape (`brief_content`) avec rendu riche (headings, listes, liens, images)
- **Galerie assets** : images et vidéos YouTube/Vimeo embarquées via `brief_assets` (JSONB array d'URLs)
- **Teasing MonprojetPro One** : message personnalisé par étape dans une card accent violet/vert (`one_teasing_message`)

## Statuts des étapes

| Statut | Description | Visuel |
|--------|-------------|--------|
| `locked` | Non accessible | Grisé + cadenas |
| `current` | En cours | Accent Lab (violet) |
| `completed` | Terminée | Check vert |
| `skipped` | Passée | Orange |

## Usage

```tsx
import { ParcoursOverview } from '@monprojetpro/module-parcours'

// Page parcours
<ParcoursOverview clientId={clientId} />
```

## Usage

```tsx
import { ParcoursOverview, ParcoursStepDetail } from '@monprojetpro/module-parcours'

// Page parcours (liste)
<ParcoursOverview clientId={clientId} />

// Page détail étape (Server Component)
<ParcoursStepDetail step={step} totalSteps={parcours.totalSteps} />
```

## Soumission & Validation (Story 6.3)

Les étapes avec `validation_required = TRUE` nécessitent une soumission client + validation MiKL.

### Workflow
1. Client soumet via `/modules/parcours/steps/[N]/submit` — `SubmitStepForm`
2. Étape passe en `pending_validation`, soumission créée avec `status=pending`
3. MiKL reçoit une notification et accède via Hub `/modules/crm/clients/[id]/submissions/[subId]`
4. MiKL approuve / demande révision / refuse via `ValidateSubmissionForm`
5. Si approuvé : étape `completed`, étape suivante `current`, notification client
6. Si révision/refus : étape repasse `current`, feedback envoyé au client

### Composants de soumission

```tsx
// Client — soumettre son travail
import { SubmitStepForm } from '@monprojetpro/module-parcours'
<SubmitStepForm stepId={step.id} />

// Client — voir sa soumission
import { SubmissionDetailView } from '@monprojetpro/module-parcours'
<SubmissionDetailView submissionId={id} clientId={clientId} showValidationForm={false} />

// MiKL — valider une soumission (Hub CRM)
import { SubmissionDetailView } from '@monprojetpro/module-parcours'
<SubmissionDetailView submissionId={id} clientId={clientId} showValidationForm={true} />

// MiKL — liste des soumissions (onglet CRM)
import { SubmissionsList } from '@monprojetpro/module-parcours'
<SubmissionsList clientId={clientId} />
```

## Architecture

- **Server Actions** : `getParcours`, `completeStep`, `updateStepStatus`, `skipStep`, `submitStep`, `validateSubmission`, `getSubmissions`, `getSubmissionById`
- **Hooks** : `useParcours`, `useParcoursSteps`, `useStepSubmissions` (TanStack Query)
- **Composants** : `ParcoursOverview`, `ParcoursTimeline`, `ParcoursStepCard`, `ParcoursProgressBar`, `ParcoursStepStatusBadge`, `ParcoursStepDetail`, `BriefMarkdownRenderer`, `BriefAssetsGallery`, `OneTeasingCard`, `StepNavigationButtons`, `SubmitStepForm`, `SubmissionFileUpload`, `SubmissionStatusBadge`, `SubmissionsList`, `SubmissionDetailView`, `ValidateSubmissionForm`

## DB Schema (parcours_steps)

| Colonne | Type | Description |
|---------|------|-------------|
| `brief_template` | TEXT | Template ancien (migré vers brief_content) |
| `brief_content` | TEXT | Brief markdown complet (Story 6.2) |
| `brief_assets` | JSONB | Array URLs images/vidéos (Story 6.2) |
| `one_teasing_message` | TEXT | Message personnalisé teasing One (Story 6.2) |

## DB Schema (step_submissions — Story 6.3)

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID PK | Identifiant unique |
| `parcours_step_id` | UUID FK | Étape concernée |
| `client_id` | UUID FK | Client propriétaire |
| `submission_content` | TEXT | Travail soumis (min 50 chars) |
| `submission_files` | JSONB | Array de chemins Storage |
| `status` | TEXT | `pending` / `approved` / `rejected` / `revision_requested` |
| `feedback` | TEXT | Commentaire MiKL (obligatoire sauf approved) |
| `feedback_at` | TIMESTAMPTZ | Date du feedback |
