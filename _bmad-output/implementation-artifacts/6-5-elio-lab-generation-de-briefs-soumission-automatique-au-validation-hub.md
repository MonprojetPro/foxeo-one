# Story 6.5: Élio Lab — Génération de briefs & soumission automatique au validation Hub

Status: done

## Story

As a **client Lab**,
I want **qu'Élio génère automatiquement mes briefs d'étape à partir de nos conversations et les soumette pour validation**,
So that **je gagne du temps et je suis guidé efficacement sans effort de rédaction manuel**.

## Acceptance Criteria

1. **AC1 — Pas de migration DB** : Réutilise les tables existantes : `parcours_steps`, `step_submissions`, `elio_conversations` (Epic 8.2, à créer si pas encore fait).

2. **AC2 — Commande génération** : Dans le chat Élio, bouton "Générer mon brief" visible uniquement si étape `current` et `validation_required = TRUE`. Clic → Élio analyse les derniers messages de la conversation + brief_template de l'étape + profil communication → génère brief complet.

3. **AC3 — Génération brief** : Server Action `generateBrief()` appelle API Claude avec prompt structuré : "Tu es Élio, l'assistant Lab. À partir de cette conversation : [messages], génère un brief professionnel pour l'étape [step.title]. Template : [step.brief_template]. Profil client : [profile]. Format : Markdown structuré." Réponse Claude = brief généré.

4. **AC4 — Aperçu et édition** : Dialog affiche brief généré avec preview markdown. Bouton "Éditer" → textarea éditable. Bouton "Régénérer" (redemande à Claude avec feedback "Améliore ceci..."). Bouton "Soumettre" → crée `step_submission` avec `submission_content = brief généré`.

5. **AC5 — Soumission automatique** : Après soumission, flow identique Story 6.3 : notification MiKL, étape passe en `pending_validation`, client notifié. Possibilité de voir le brief soumis dans `/modules/parcours/steps/[stepNumber]/submission`.

6. **AC6 — Tests** : Tests unitaires co-localisés. Tests génération brief (mock API Claude). Tests workflow complet. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Server Action génération (AC: #3)
  - [x] 1.1 `actions/generate-brief.ts` — Récupère conversation + étape + profil → appelle API Claude
  - [x] 1.2 Prompt structuré pour génération brief
  - [x] 1.3 Parsing réponse Claude (markdown)

- [x] Task 2 — Composants UI (AC: #2, #4)
  - [x] 2.1 Bouton "Générer mon brief" dans composant chat Élio (`ElioGenerateBriefSection` intégré page submit)
  - [x] 2.2 `components/generated-brief-dialog.tsx` — Dialog aperçu + édition + soumission
  - [x] 2.3 Preview markdown du brief généré (`BriefMarkdownRenderer`)
  - [x] 2.4 Textarea édition brief

- [x] Task 3 — Intégration soumission (AC: #5)
  - [x] 3.1 `actions/submit-elio-brief.ts` — Action soumission architecturalement isolée (pas d'import inter-module)
  - [x] 3.2 Passer `content = brief généré` au submit
  - [x] 3.3 Redirection après soumission vers `/modules/parcours`

- [x] Task 4 — Tests (AC: #6)
  - [x] 4.1 Tests Server Action : generateBrief (mock API Claude) — 8 tests
  - [x] 4.2 Tests composants : GeneratedBriefDialog — 14 tests
  - [x] 4.3 Tests intégration : submitElioBrief — 8 tests

- [x] Task 5 — Documentation (AC: #6)
  - [x] 5.1 Mise à jour `docs/guide.md` module Élio

## Dev Notes

### Architecture — Règles critiques

- **Extension module Élio** : Pas de nouveau module, extend `packages/modules/elio/`.
- **API Claude** : Appel via Edge Function ou Server Action sécurisée. Ne jamais exposer la clé API côté client.
- **Conversation context** : Récupérer les N derniers messages (ex: 20) pour contexte suffisant sans exploser le token limit.
- **Édition** : Le client peut éditer le brief avant soumission. Important pour ownership.
- **Response format** : `{ data, error }` — JAMAIS throw.
- **Logging** : `[ELIO:GENERATE_BRIEF]`, `[ELIO:REGENERATE_BRIEF]`

### Server Action — Génération brief

```typescript
// actions/generate-brief.ts
'use server'
import { createServerSupabaseClient } from '@monprojetpro/supabase/server'
import type { ActionResponse } from '@monprojetpro/types'
import { successResponse, errorResponse } from '@monprojetpro/types'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function generateBrief(stepId: string): Promise<ActionResponse<{ brief: string }>> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

  // Récupérer étape + client + profil
  const { data: step } = await supabase
    .from('parcours_steps')
    .select('*, parcours(client_id)')
    .eq('id', stepId)
    .single()

  if (!step) return errorResponse('Étape non trouvée', 'NOT_FOUND')

  const { data: profile } = await supabase
    .from('communication_profiles')
    .select('*')
    .eq('client_id', step.parcours.client_id)
    .single()

  // Récupérer derniers messages conversation (TODO: Story 8.2 créera table elio_conversations)
  // Pour l'instant, simuler ou récupérer depuis autre source
  const conversationContext = "Simulation conversation client..." // À remplacer par vraie récupération

  // Construire prompt
  const prompt = `Tu es Élio, l'assistant IA personnel du client dans son parcours MonprojetPro Lab.

Le client est à l'étape ${step.step_number} : "${step.title}".
Description de l'étape : ${step.description}

**Template du brief attendu :**
${step.brief_template || 'Brief libre'}

**Extrait de la conversation avec le client :**
${conversationContext}

**Profil de communication du client :**
- Ton : ${profile?.preferred_tone || 'friendly'}
- Longueur : ${profile?.preferred_length || 'balanced'}

**Tâche :**
À partir de cette conversation, génère un brief professionnel et structuré en markdown pour cette étape.
Le brief doit :
- Refléter les échanges et les décisions prises
- Être clair et actionnable pour MiKL qui va le valider
- Respecter le template si fourni
- Utiliser un format markdown (headings, listes, etc.)

Génère uniquement le brief, sans introduction ni commentaire additionnel.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const brief = message.content[0].type === 'text' ? message.content[0].text : ''

    console.log('[ELIO:GENERATE_BRIEF] Brief généré:', brief.substring(0, 100) + '...')

    return successResponse({ brief })
  } catch (error) {
    console.error('[ELIO:GENERATE_BRIEF] Error:', error)
    return errorResponse('Échec génération brief', 'API_ERROR', error)
  }
}
```

### Dialog aperçu brief

```typescript
// components/generated-brief-dialog.tsx
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@monprojetpro/ui/components/dialog'
import { Button } from '@monprojetpro/ui/components/button'
import { Textarea } from '@monprojetpro/ui/components/textarea'
import { BriefMarkdownRenderer } from './brief-markdown-renderer'
import { submitStep } from '../actions/submit-step'
import { generateBrief } from '../actions/generate-brief'
import { toast } from '@monprojetpro/ui/components/use-toast'
import { useRouter } from 'next/navigation'

export function GeneratedBriefDialog({
  isOpen,
  onClose,
  stepId,
}: {
  isOpen: boolean
  onClose: () => void
  stepId: string
}) {
  const router = useRouter()
  const [brief, setBrief] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Génération initiale au montage
  useState(() => {
    if (isOpen && !brief) {
      handleGenerate()
    }
  }, [isOpen])

  const handleGenerate = async () => {
    setIsGenerating(true)
    const response = await generateBrief(stepId)

    if (response.error) {
      toast({ title: 'Erreur', description: response.error.message, variant: 'destructive' })
      setIsGenerating(false)
      return
    }

    setBrief(response.data.brief)
    setIsGenerating(false)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const response = await submitStep({ stepId, content: brief })

    if (response.error) {
      toast({ title: 'Erreur', description: response.error.message, variant: 'destructive' })
      setIsSubmitting(false)
      return
    }

    toast({ title: 'Brief soumis', description: 'MiKL va valider votre travail.' })
    onClose()
    router.push('/modules/parcours')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Votre brief généré par Élio</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isGenerating ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
              <p className="mt-4 text-muted-foreground">Élio génère votre brief...</p>
            </div>
          ) : isEditing ? (
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
          ) : (
            <div className="prose prose-invert max-w-none">
              <BriefMarkdownRenderer content={brief} />
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'Aperçu' : 'Éditer'}
            </Button>
            <Button variant="ghost" onClick={handleGenerate} disabled={isGenerating}>
              Régénérer
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !brief}>
              {isSubmitting ? 'Soumission...' : 'Soumettre pour validation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Bouton dans chat Élio

```typescript
// Intégration dans le composant chat Élio
export function ElioChatInput({ currentStep }: { currentStep?: ParcoursStep }) {
  const [showBriefDialog, setShowBriefDialog] = useState(false)

  const canGenerateBrief = currentStep?.status === 'current' && currentStep?.validation_required

  return (
    <div className="space-y-2">
      {canGenerateBrief && (
        <Button
          onClick={() => setShowBriefDialog(true)}
          variant="outline"
          className="w-full"
          size="sm"
        >
          ✨ Générer mon brief avec Élio
        </Button>
      )}

      <textarea placeholder="Message à Élio..." />

      <GeneratedBriefDialog
        isOpen={showBriefDialog}
        onClose={() => setShowBriefDialog(false)}
        stepId={currentStep?.id || ''}
      />
    </div>
  )
}
```

### Fichiers à créer

**Module Élio (extension) :**
```
packages/modules/elio/
├── actions/generate-brief.ts
└── components/generated-brief-dialog.tsx
```

### Fichiers à modifier

- Composant chat Élio : Ajouter bouton "Générer mon brief"
- `actions/submit-step.ts` (Story 6.3) : Déjà compatible, aucune modification

### Dépendances

- **Story 6.3** : `submitStep()`, table `step_submissions`
- **Story 6.4** : Table `communication_profiles`, helper `buildElioSystemPrompt()`
- **Story 6.1** : Table `parcours_steps`
- **Epic 8.2** : Table `elio_conversations` (à créer dans Epic 8 pour historique complet)
- API Claude (Anthropic)
- Package `@anthropic-ai/sdk`

### Anti-patterns — Interdit

- NE PAS générer le brief sans contexte conversation (sinon générique et inutile)
- NE PAS empêcher l'édition du brief (client doit pouvoir ajuster)
- NE PAS exposer la clé API Anthropic côté client (Server Action obligatoire)
- NE PAS soumettre automatiquement sans validation du client (ownership)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-6-*.md#Story 6.5]
- [Source: docs/project-context.md]
- [Anthropic API: https://docs.anthropic.com/]

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6 (claude-sonnet-4-6)

### Debug Log References
- `@anthropic-ai/sdk` absent → installé à la racine du monorepo + ajouté dans `package.json` elio
- Architecture: modules ne peuvent pas s'importer directement → `submit-elio-brief.ts` créé pour éviter import de `@monprojetpro/module-parcours` dans elio
- `elio_conversations` table pas encore créée (Story 8.2) → fallback gracieux avec try/catch

### Completion Notes List
- AC1 ✅ : Aucune migration DB — réutilise `parcours_steps`, `step_submissions`, `communication_profiles`
- AC2 ✅ : `ElioGenerateBriefSection` intégré dans `/modules/parcours/steps/[stepNumber]/submit/page.tsx` si `validationRequired = true`
- AC3 ✅ : `generateBrief()` Server Action — prompt structuré, max 20 messages conversation, fallback si `elio_conversations` absent
- AC4 ✅ : `GeneratedBriefDialog` — preview markdown, édition textarea, régénération, soumission
- AC5 ✅ : `submitElioBrief()` — notifications MiKL + client, étape → `pending_validation`
- AC6 ✅ : 30 tests unitaires (8 generate-brief + 14 GeneratedBriefDialog + 8 submitElioBrief), coverage >80%

### Code Review Fixes (Phase 2)
- HIGH: Added `skipHtml={true}` on ReactMarkdown (XSS protection)
- HIGH: Added ownership check in generateBrief (FORBIDDEN if step doesn't belong to client)
- HIGH: Added ANTHROPIC_API_KEY validation upfront (CONFIG_ERROR)
- HIGH: Added `react-markdown` + `remark-gfm` to elio package.json
- MEDIUM: Removed unsafe `as` casts → `String()`/`Number()` conversions
- MEDIUM: Improved elio_conversations error handling (check error vs catch-all)
- MEDIUM: Added `stepId` to useEffect dependency array
- MEDIUM: Replaced CSS spinner with `<Skeleton />` loaders (design system compliance)
- MEDIUM: Added MAX_BRIEF_LENGTH validation (50,000 chars) in submit-elio-brief
- MEDIUM: Added empty brief response check in generateBrief
- MEDIUM: Added API timeout config (30s)
- MEDIUM: Added configurable model via ANTHROPIC_MODEL env var

### File List
- `packages/modules/elio/actions/generate-brief.ts` (NEW)
- `packages/modules/elio/actions/generate-brief.test.ts` (NEW)
- `packages/modules/elio/actions/submit-elio-brief.ts` (NEW)
- `packages/modules/elio/actions/submit-elio-brief.test.ts` (NEW)
- `packages/modules/elio/components/generated-brief-dialog.tsx` (NEW)
- `packages/modules/elio/components/generated-brief-dialog.test.tsx` (NEW)
- `packages/modules/elio/components/brief-markdown-renderer.tsx` (NEW)
- `packages/modules/elio/components/elio-generate-brief-section.tsx` (NEW)
- `packages/modules/elio/docs/guide.md` (MODIFIED)
- `packages/modules/elio/index.ts` (MODIFIED)
- `packages/modules/elio/package.json` (MODIFIED — @anthropic-ai/sdk added)
- `apps/client/app/(dashboard)/modules/parcours/steps/[stepNumber]/submit/page.tsx` (MODIFIED)

## Change Log
- 2026-02-26: Story 6.5 implémentée — génération briefs via API Claude, dialog aperçu/édition/soumission, 30 nouveaux tests (2392 total)
- 2026-02-26: Code review adversarial — 17 issues trouvées (4 HIGH, 8 MEDIUM, 5 LOW), all HIGH+MEDIUM fixées, 2395 tests passing
