# Story 6.2: Consultation des briefs par étape — Teasing MonprojetPro One

Status: done

## Story

As a **client Lab**,
I want **consulter le brief détaillé de chaque étape de mon parcours avec un teasing de MonprojetPro One**,
So that **je comprends ce qui est attendu à chaque étape et je suis motivé par la perspective d'accéder à One**.

## Acceptance Criteria

1. **AC1 — Migration DB** : Ajouter colonne `brief_content` (TEXT) et `brief_assets` (JSONB nullable — array URLs images/vidéos) à table `parcours_steps`. Ajouter colonne `one_teasing_message` (TEXT nullable) pour message personnalisé teasing One.

2. **AC2 — Vue détaillée étape** : Page `/modules/parcours/steps/[stepNumber]` affiche : titre étape, numéro, statut, brief complet (markdown), assets (images/vidéos embarquées), section "Pourquoi cette étape ?", CTA selon statut (locked: disabled, current: "Commencer", completed: "Voir ma soumission").

3. **AC3 — Brief markdown** : Le brief est rendu en markdown (lib `react-markdown` ou `marked`). Support : headings, listes, bold, italic, liens, images. Code syntax highlighting si nécessaire (optionnel).

4. **AC4 — Teasing MonprojetPro One** : En bas de chaque étape, section "🚀 Aperçu MonprojetPro One" affichant `one_teasing_message` personnalisé. Exemples : "Une fois dans MonprojetPro One, cette fonctionnalité sera automatisée par Élio+", "Dans One, vous aurez accès à un CRM complet pour gérer vos clients". Design : card accent violet/vert avec picto fusée.

5. **AC5 — Navigation** : Boutons "Étape précédente" / "Étape suivante" (disabled si locked). Breadcrumb : "Mon Parcours > Étape X : [Titre]".

6. **AC6 — Tests** : Tests unitaires co-localisés. Tests rendering markdown. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Migration Supabase (AC: #1)
  - [x] 1.1 Créer migration `00038_add_brief_content_parcours_steps.sql` (00035 déjà prise)
  - [x] 1.2 Ajouter colonnes `brief_content`, `brief_assets`, `one_teasing_message` à `parcours_steps`
  - [x] 1.3 Migration données : copier `brief_template` vers `brief_content` si existant

- [x] Task 2 — Composants UI (AC: #2, #3, #4, #5)
  - [x] 2.1 `components/parcours-step-detail.tsx` — Vue détaillée étape
  - [x] 2.2 `components/brief-markdown-renderer.tsx` — Rendu markdown avec styles
  - [x] 2.3 `components/brief-assets-gallery.tsx` — Gallery images/vidéos
  - [x] 2.4 `components/one-teasing-card.tsx` — Card teasing MonprojetPro One
  - [x] 2.5 `components/step-navigation-buttons.tsx` — Boutons prev/next

- [x] Task 3 — Page détaillée étape (AC: #2, #5)
  - [x] 3.1 `apps/client/app/(dashboard)/modules/parcours/steps/[stepNumber]/page.tsx` (refactored)
  - [x] 3.2 Récupérer étape depuis DB avec brief complet
  - [x] 3.3 Breadcrumb integration (dans ParcoursStepDetail)

- [x] Task 4 — Markdown renderer (AC: #3)
  - [x] 4.1 Installer lib `react-markdown` + `remark-gfm` (GitHub Flavored Markdown)
  - [x] 4.2 Styling markdown : prose classes Tailwind ou custom CSS
  - [x] 4.3 Support images, vidéos (iframe YouTube/Vimeo)

- [x] Task 5 — Tests (AC: #6)
  - [x] 5.1 Tests composants : BriefMarkdownRenderer, OneTeasingCard, BriefAssetsGallery, StepNavigationButtons
  - [x] 5.2 Tests rendering : markdown → HTML correct (via mock)
  - [x] 5.3 Tests navigation : prev/next disabled selon statut

- [x] Task 6 — Documentation (AC: #6)
  - [x] 6.1 Mise à jour `docs/guide.md` module parcours

## Dev Notes

### Architecture — Règles critiques

- **Extension module parcours** : Pas de nouveau module, extend `packages/modules/parcours/`.
- **Markdown** : Lib `react-markdown` recommandée (React 19 compatible, performante).
- **Assets** : Stockés en JSONB (array d'URLs). Images depuis Supabase Storage ou URLs externes.
- **Teasing One** : Message personnalisé par étape pour motiver le client.
- **Response format** : `{ data, error }` — JAMAIS throw.
- **Logging** : `[PARCOURS:VIEW_STEP]`

### Base de données

**Migration `00035`** :
```sql
-- Ajouter colonnes brief détaillé à parcours_steps
ALTER TABLE parcours_steps
  ADD COLUMN brief_content TEXT,
  ADD COLUMN brief_assets JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN one_teasing_message TEXT;

-- Migration données existantes : copier brief_template vers brief_content
UPDATE parcours_steps SET brief_content = brief_template WHERE brief_template IS NOT NULL;
```

### Composant Markdown Renderer

```typescript
// components/brief-markdown-renderer.tsx
'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@monprojetpro/utils'

export function BriefMarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mb-3 mt-6" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mb-2 mt-4" {...props} />,
          p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
          a: ({ node, ...props }) => <a className="text-purple-400 hover:text-purple-300 underline" {...props} />,
          img: ({ node, ...props }) => (
            <img className="rounded-lg my-6 max-w-full h-auto" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-purple-600 pl-4 italic my-4 text-muted-foreground" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

### Composant Teasing One

```typescript
// components/one-teasing-card.tsx
'use client'
import { Rocket } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@monprojetpro/ui/components/card'

export function OneTeasingCard({ message }: { message?: string }) {
  if (!message) return null

  return (
    <Card className="bg-gradient-to-r from-purple-900/50 to-green-900/50 border-purple-600/50 mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="w-5 h-5 text-purple-400" />
          Aperçu MonprojetPro One
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-purple-200">{message}</p>
      </CardContent>
    </Card>
  )
}
```

### Page détaillée étape

```typescript
// apps/client/app/(dashboard)/modules/parcours/steps/[stepNumber]/page.tsx
import { createServerSupabaseClient } from '@monprojetpro/supabase/server'
import { notFound } from 'next/navigation'
import { BriefMarkdownRenderer } from '@/components/brief-markdown-renderer'
import { BriefAssetsGallery } from '@/components/brief-assets-gallery'
import { OneTeasingCard } from '@/components/one-teasing-card'
import { StepNavigationButtons } from '@/components/step-navigation-buttons'
import { ParcoursStepStatusBadge } from '@/components/parcours-step-status-badge'
import { Button } from '@monprojetpro/ui/components/button'
import Link from 'next/link'

export default async function ParcoursStepDetailPage({
  params,
}: {
  params: { stepNumber: string }
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Récupérer parcours du client
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user?.id)
    .single()

  const { data: parcours } = await supabase
    .from('parcours')
    .select('id')
    .eq('client_id', client?.id)
    .single()

  // Récupérer étape
  const { data: step } = await supabase
    .from('parcours_steps')
    .select('*')
    .eq('parcours_id', parcours?.id)
    .eq('step_number', parseInt(params.stepNumber))
    .single()

  if (!step) return notFound()

  // Récupérer étapes adjacentes pour navigation
  const { data: prevStep } = await supabase
    .from('parcours_steps')
    .select('step_number, status')
    .eq('parcours_id', parcours.id)
    .eq('step_number', step.step_number - 1)
    .single()

  const { data: nextStep } = await supabase
    .from('parcours_steps')
    .select('step_number, status')
    .eq('parcours_id', parcours.id)
    .eq('step_number', step.step_number + 1)
    .single()

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-muted-foreground">Étape {step.step_number}</span>
            <ParcoursStepStatusBadge status={step.status} />
          </div>
          <h1 className="text-4xl font-bold">{step.title}</h1>
          <p className="text-lg text-muted-foreground mt-2">{step.description}</p>
        </div>
      </div>

      {/* Brief content */}
      {step.brief_content && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Votre brief</h2>
          <BriefMarkdownRenderer content={step.brief_content} />
        </section>
      )}

      {/* Assets gallery */}
      {step.brief_assets && step.brief_assets.length > 0 && (
        <BriefAssetsGallery assets={step.brief_assets} />
      )}

      {/* Teasing MonprojetPro One */}
      <OneTeasingCard message={step.one_teasing_message} />

      {/* CTA */}
      <div className="flex justify-center">
        {step.status === 'locked' && (
          <Button disabled>Étape verrouillée</Button>
        )}
        {step.status === 'current' && (
          <Link href={`/modules/parcours/steps/${step.step_number}/submit`}>
            <Button size="lg" className="bg-purple-600 hover:bg-purple-500">
              Commencer cette étape
            </Button>
          </Link>
        )}
        {step.status === 'completed' && (
          <Link href={`/modules/parcours/steps/${step.step_number}/submission`}>
            <Button variant="outline">Voir ma soumission</Button>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <StepNavigationButtons
        prevStep={prevStep}
        nextStep={nextStep}
        currentStepNumber={step.step_number}
      />
    </div>
  )
}
```

### Fichiers à créer

**Module parcours (extension) :**
```
packages/modules/parcours/
├── components/parcours-step-detail.tsx, brief-markdown-renderer.tsx, brief-assets-gallery.tsx, one-teasing-card.tsx, step-navigation-buttons.tsx
```

**Routes :**
- `apps/client/app/(dashboard)/modules/parcours/steps/[stepNumber]/page.tsx`

**Migration :**
- `supabase/migrations/00035_add_brief_content_parcours_steps.sql`

### Fichiers à modifier

- `packages/modules/parcours/package.json` — Ajouter dépendances `react-markdown`, `remark-gfm`

### Dépendances

- **Story 6.1** : Table `parcours_steps`, module parcours
- Package `react-markdown`, `remark-gfm`

### Anti-patterns — Interdit

- NE PAS rendre du HTML brut depuis le brief (XSS risk, markdown only)
- NE PAS permettre au client de modifier le brief (read-only)
- NE PAS afficher le teasing One de façon intrusive (card discrète en bas)
- NE PAS oublier de sanitizer le markdown si éditable par MiKL (v2)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-6-*.md#Story 6.2]
- [Source: docs/project-context.md]
- [react-markdown: https://github.com/remarkjs/react-markdown]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6)

### Debug Log References

- Migration numérotée 00038 (00035 déjà prise par `add_onboarding_fields_clients`)
- `react-markdown` et `remark-gfm` installés via npm workspace
- `ParcoursStepDB` et `ParcoursStep` étendus avec 3 nouveaux champs (breaking: tous les mocks de tests mis à jour)
- Page existante `steps/[stepNumber]/page.tsx` refactorisée pour déléguer au composant `ParcoursStepDetail`

### Completion Notes List

- ✅ Migration `00038_add_brief_content_parcours_steps.sql` : colonnes `brief_content` (TEXT), `brief_assets` (JSONB default []), `one_teasing_message` (TEXT nullable)
- ✅ Données migrées : `brief_template` → `brief_content` pour les lignes existantes
- ✅ Types `ParcoursStepDB` et `ParcoursStep` étendus + mapper `toParcoursStep` mis à jour
- ✅ 5 nouveaux composants créés dans `packages/modules/parcours/components/`
- ✅ `react-markdown` + `remark-gfm` installés, rendu markdown complet avec composants custom
- ✅ `BriefAssetsGallery` : images + iframes YouTube (embed URL) + Vimeo (embed URL)
- ✅ `OneTeasingCard` : card gradient violet/vert, rendu conditionnel (null si pas de message)
- ✅ `StepNavigationButtons` : prev/next avec aria-disabled sur les extrêmes + lock-aware (AC5)
- ✅ Page simplifiée → délègue à `ParcoursStepDetail` (Server Component)
- ✅ 42 nouveaux tests (2271 total, 0 failing)
- ✅ Tous les mocks existants mis à jour avec les nouveaux champs requis

**Code Review Fixes (Sonnet 4.6 adversarial) :**
- ✅ [H1] Ajout section "Pourquoi cette étape ?" manquante (AC2)
- ✅ [H2] Navigation prev/next désormais lock-aware avec props `prevStep`/`nextStep` (AC5)
- ✅ [M1] `package-lock.json` ajouté au File List
- ✅ [M2] Tests ajoutés pour `ParcoursStepDetail` (11 tests)
- ✅ [M3] Tests `BriefMarkdownRenderer` améliorés (vérifient prose classes + component overrides)
- ✅ [M4] Import `vi` ajouté dans `step-navigation-buttons.test.tsx` + tests lock-aware
- ✅ [FIX] Import `Button` corrigé: `@monprojetpro/ui` au lieu de `@monprojetpro/ui/components/button`

### File List

**Créés :**
- `supabase/migrations/00038_add_brief_content_parcours_steps.sql`
- `packages/modules/parcours/components/brief-markdown-renderer.tsx`
- `packages/modules/parcours/components/brief-markdown-renderer.test.tsx`
- `packages/modules/parcours/components/brief-assets-gallery.tsx`
- `packages/modules/parcours/components/brief-assets-gallery.test.tsx`
- `packages/modules/parcours/components/one-teasing-card.tsx`
- `packages/modules/parcours/components/one-teasing-card.test.tsx`
- `packages/modules/parcours/components/step-navigation-buttons.tsx`
- `packages/modules/parcours/components/step-navigation-buttons.test.tsx`
- `packages/modules/parcours/components/parcours-step-detail.tsx`
- `packages/modules/parcours/components/parcours-step-detail.test.tsx`

**Modifiés :**
- `packages/modules/parcours/types/parcours.types.ts`
- `packages/modules/parcours/utils/parcours-mappers.ts`
- `packages/modules/parcours/utils/parcours-mappers.test.ts`
- `packages/modules/parcours/actions/get-parcours.test.ts`
- `packages/modules/parcours/components/parcours-timeline.test.tsx`
- `packages/modules/parcours/components/parcours-overview.test.tsx`
- `packages/modules/parcours/index.ts`
- `packages/modules/parcours/package.json`
- `packages/modules/parcours/docs/guide.md`
- `apps/client/app/(dashboard)/modules/parcours/steps/[stepNumber]/page.tsx`
- `package-lock.json`
