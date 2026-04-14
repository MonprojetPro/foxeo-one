# Story 5.4: Flux post-visio — Onboarding prospect

Status: done

## Story

As a **MiKL (opérateur)**,
I want **un flux guidé après une visio prospect pour décider rapidement si je lance un parcours Lab ou envoie des ressources complémentaires**,
So that **je peux onboarder efficacement les nouveaux prospects sans friction**.

## Acceptance Criteria

1. **AC1 — Dialog post-visio** : À la fin d'une visio (quand `endMeeting()` est appelé), si le meeting a un tag `type='prospect'`, afficher automatiquement un dialog "Suite à donner" côté MiKL. Options : (1) Créer parcours Lab, (2) Envoyer ressources, (3) Programmer rappel, (4) Marquer comme "Pas intéressé".

2. **AC2 — Créer parcours Lab** : Option 1 → Formulaire rapide : nom du client, email, parcours template (sélection dropdown depuis `parcours_templates`). Validation → crée `client` (avec `status='prospect'`), crée `parcours` assigné, envoie email de bienvenue (via Edge Function email). Notification client : "Bienvenue dans MonprojetPro Lab". Redirection MiKL vers fiche client CRM.

3. **AC3 — Envoyer ressources** : Option 2 → Formulaire : sélection documents depuis la bibliothèque (`documents` avec `visibility='shared'` et `folder_id` = dossier "Ressources Prospect"). Génère lien de partage temporaire (7 jours). Envoie email au prospect avec liens. Crée tâche rappel MiKL dans 3 jours.

4. **AC4 — Programmer rappel** : Option 3 → Formulaire : date + message. Crée `reminder` pour MiKL. Notification à la date choisie.

5. **AC5 — Pas intéressé** : Option 4 → Met à jour `meeting.status='completed'`. Optionnel : raison (dropdown). Enregistre dans `meeting.metadata` JSONB. Pas de suite.

6. **AC6 — Tests** : Tests unitaires co-localisés. Tests intégration Server Actions. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Migration DB (AC: #1, #5)
  - [x] 1.1 Ajouter colonne `type` à table `meetings` (via migration `00031_add_meetings_type.sql`)
  - [x] 1.2 Valeurs possibles : 'standard', 'prospect', 'onboarding', 'support'
  - [x] 1.3 Ajouter colonne `metadata` JSONB à table `meetings` (pour raison "pas intéressé", etc.)

- [x] Task 2 — Server Actions (AC: #2, #3, #4, #5)
  - [x] 2.1 `actions/create-lab-onboarding.ts` — Crée client + parcours + envoie email bienvenue
  - [x] 2.2 `actions/send-prospect-resources.ts` — Génère liens temporaires + envoie email + crée rappel
  - [x] 2.3 `actions/schedule-follow-up.ts` — Crée reminder
  - [x] 2.4 `actions/mark-prospect-not-interested.ts` — Update meeting metadata

- [x] Task 3 — Composants UI (AC: #1, #2, #3, #4, #5)
  - [x] 3.1 `components/post-meeting-dialog.tsx` — Dialog avec 4 options
  - [x] 3.2 `components/create-lab-form.tsx` — Formulaire création parcours Lab
  - [x] 3.3 `components/send-resources-form.tsx` — Sélection documents + email
  - [x] 3.4 `components/schedule-follow-up-form.tsx` — Date + message
  - [x] 3.5 `components/not-interested-form.tsx` — Raison optionnelle

- [x] Task 4 — Intégration module visio (AC: #1)
  - [x] 4.1 Modifier `actions/end-meeting.ts` — Détecte `type='prospect'` et déclenche ouverture dialog
  - [x] 4.2 Hook `use-post-meeting-dialog.ts` — Gère l'état du dialog

- [x] Task 5 — Edge Function email bienvenue (AC: #2)
  - [x] 5.1 Template email "Bienvenue dans MonprojetPro Lab"
  - [x] 5.2 Inclut lien activation compte + premiers pas
  - [x] 5.3 Réutilise Edge Function `send-email` de Story 3.3

- [x] Task 6 — Génération liens temporaires (AC: #3)
  - [x] 6.1 Utilise Supabase Storage signed URLs (expiration 7 jours)
  - [x] 6.2 Fonction helper `generateResourceLinks(documentIds: string[]): Promise<string[]>`

- [x] Task 7 — Tests (AC: #6)
  - [x] 7.1 Tests Server Actions : createLabOnboarding, sendProspectResources, scheduleFollowUp
  - [x] 7.2 Tests composants : PostMeetingDialog, CreateLabForm
  - [x] 7.3 Tests intégration : flux complet post-visio → création client Lab

- [x] Task 8 — Documentation (AC: #6)
  - [x] 8.1 Mise à jour `docs/guide.md` module visio
  - [x] 8.2 Documentation workflow onboarding prospect

## Dev Notes

### Architecture — Règles critiques

- **Extension module visio** : Pas de nouveau module, extend `packages/modules/visio/`.
- **Dépendances multiples** : Crée client (CRM), parcours (Lab), reminder, envoie email. Coordination via Server Actions.
- **Liens temporaires** : Supabase Storage signed URLs avec expiration.
- **Response format** : `{ data, error }` — JAMAIS throw.
- **Logging** : `[VISIO:POST_MEETING]`, `[VISIO:ONBOARD_PROSPECT]`

### Base de données

**Migration `00031`** :
```sql
-- Ajouter colonnes à meetings
ALTER TABLE meetings
  ADD COLUMN type TEXT DEFAULT 'standard' CHECK (type IN ('standard', 'prospect', 'onboarding', 'support')),
  ADD COLUMN metadata JSONB DEFAULT '{}'::JSONB;

-- Index sur type pour filtrage
CREATE INDEX idx_meetings_type ON meetings(type);
```

### Server Action — Créer parcours Lab

```typescript
// actions/create-lab-onboarding.ts
'use server'
import { createServerSupabaseClient } from '@monprojetpro/supabase/server'
import type { ActionResponse } from '@monprojetpro/types'
import { successResponse, errorResponse } from '@monprojetpro/types'

export async function createLabOnboarding(input: {
  meetingId: string
  clientName: string
  clientEmail: string
  parcoursTemplateId: string
}): Promise<ActionResponse<{ clientId: string; parcoursId: string }>> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

  // Récupérer operator_id
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!operator) return errorResponse('Opérateur non trouvé', 'NOT_FOUND')

  // Créer client (prospect)
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      operator_id: operator.id,
      name: input.clientName,
      email: input.clientEmail,
      status: 'prospect',
      auth_user_id: null, // Sera défini après activation compte
    })
    .select()
    .single()

  if (clientError) return errorResponse('Échec création client', 'DATABASE_ERROR', clientError)

  // Récupérer template parcours
  const { data: template } = await supabase
    .from('parcours_templates')
    .select('*')
    .eq('id', input.parcoursTemplateId)
    .single()

  if (!template) return errorResponse('Template non trouvé', 'NOT_FOUND')

  // Créer parcours
  const { data: parcours, error: parcoursError } = await supabase
    .from('parcours')
    .insert({
      client_id: client.id,
      name: template.name,
      steps: template.steps, // JSONB copié depuis template
      current_step: 0,
    })
    .select()
    .single()

  if (parcoursError) return errorResponse('Échec création parcours', 'DATABASE_ERROR', parcoursError)

  // Mettre à jour meeting
  await supabase
    .from('meetings')
    .update({ metadata: { prospect_converted: true, client_id: client.id } })
    .eq('id', input.meetingId)

  // Envoyer email de bienvenue
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: input.clientEmail,
      template: 'welcome-lab',
      data: {
        clientName: input.clientName,
        parcoursName: template.name,
        activationLink: `${process.env.NEXT_PUBLIC_CLIENT_URL}/activate?token=${/* generate token */}`,
      }
    })
  })

  // Notification client (si auth_user_id existe, sinon skip)
  // ...

  console.log('[VISIO:ONBOARD_PROSPECT] Client créé:', client.id)

  return successResponse({ clientId: client.id, parcoursId: parcours.id })
}
```

### Server Action — Envoyer ressources

```typescript
// actions/send-prospect-resources.ts
'use server'
import { createServerSupabaseClient } from '@monprojetpro/supabase/server'
import type { ActionResponse } from '@monprojetpro/types'
import { successResponse, errorResponse } from '@monprojetpro/types'

export async function sendProspectResources(input: {
  meetingId: string
  prospectEmail: string
  documentIds: string[]
}): Promise<ActionResponse<{ linksSent: number }>> {
  const supabase = await createServerSupabaseClient()

  // Générer signed URLs (7 jours)
  const expiresIn = 7 * 24 * 60 * 60 // 7 jours en secondes
  const links: Array<{ name: string; url: string }> = []

  for (const docId of input.documentIds) {
    const { data: doc } = await supabase
      .from('documents')
      .select('name, file_path')
      .eq('id', docId)
      .single()

    if (!doc) continue

    const { data: signedUrl } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, expiresIn)

    if (signedUrl) {
      links.push({ name: doc.name, url: signedUrl.signedUrl })
    }
  }

  // Envoyer email avec liens
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: input.prospectEmail,
      template: 'prospect-resources',
      data: { links }
    })
  })

  // Créer rappel MiKL dans 3 jours
  const { data: { user } } = await supabase.auth.getUser()
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user?.id)
    .single()

  if (operator) {
    await supabase.from('reminders').insert({
      user_id: operator.id,
      title: `Relancer prospect ${input.prospectEmail}`,
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      related_entity_type: 'meeting',
      related_entity_id: input.meetingId,
    })
  }

  console.log('[VISIO:POST_MEETING] Ressources envoyées:', links.length)

  return successResponse({ linksSent: links.length })
}
```

### Dialog post-meeting

```typescript
// components/post-meeting-dialog.tsx
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@monprojetpro/ui/components/dialog'
import { Button } from '@monprojetpro/ui/components/button'
import { CreateLabForm } from './create-lab-form'
import { SendResourcesForm } from './send-resources-form'
import { ScheduleFollowUpForm } from './schedule-follow-up-form'
import { NotInterestedForm } from './not-interested-form'

type Action = 'create-lab' | 'send-resources' | 'schedule-follow-up' | 'not-interested'

export function PostMeetingDialog({ meetingId, isOpen, onClose }: { meetingId: string; isOpen: boolean; onClose: () => void }) {
  const [selectedAction, setSelectedAction] = useState<Action | null>(null)

  if (!isOpen) return null

  if (!selectedAction) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Suite à donner</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Button onClick={() => setSelectedAction('create-lab')} variant="default" className="h-24">
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">🚀</span>
                <span>Créer parcours Lab</span>
              </div>
            </Button>
            <Button onClick={() => setSelectedAction('send-resources')} variant="outline" className="h-24">
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">📄</span>
                <span>Envoyer ressources</span>
              </div>
            </Button>
            <Button onClick={() => setSelectedAction('schedule-follow-up')} variant="outline" className="h-24">
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">📅</span>
                <span>Programmer rappel</span>
              </div>
            </Button>
            <Button onClick={() => setSelectedAction('not-interested')} variant="ghost" className="h-24">
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl">🚫</span>
                <span>Pas intéressé</span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {selectedAction === 'create-lab' && <CreateLabForm meetingId={meetingId} onSuccess={onClose} />}
        {selectedAction === 'send-resources' && <SendResourcesForm meetingId={meetingId} onSuccess={onClose} />}
        {selectedAction === 'schedule-follow-up' && <ScheduleFollowUpForm meetingId={meetingId} onSuccess={onClose} />}
        {selectedAction === 'not-interested' && <NotInterestedForm meetingId={meetingId} onSuccess={onClose} />}
        <Button variant="ghost" onClick={() => setSelectedAction(null)}>Retour</Button>
      </DialogContent>
    </Dialog>
  )
}
```

### Fichiers à créer

**Module visio (extension) :**
```
packages/modules/visio/
├── actions/create-lab-onboarding.ts, send-prospect-resources.ts, schedule-follow-up.ts, mark-prospect-not-interested.ts
├── hooks/use-post-meeting-dialog.ts
└── components/post-meeting-dialog.tsx, create-lab-form.tsx, send-resources-form.tsx, schedule-follow-up-form.tsx, not-interested-form.tsx
```

**Migration :**
- `supabase/migrations/00031_add_meetings_type.sql`

**Email templates :**
- Templates `welcome-lab` et `prospect-resources` dans Edge Function `send-email`

### Fichiers à modifier

- `packages/modules/visio/actions/end-meeting.ts` — Déclencher dialog si `type='prospect'`

### Dépendances

- **Story 2.4** : Table `parcours`, `parcours_templates`
- **Story 2.7** : Table `reminders`
- **Story 3.3** : Edge Function `send-email`
- **Story 4.1** : Table `documents`, Supabase Storage
- **Story 5.1** : Table `meetings`

### Anti-patterns — Interdit

- NE PAS créer le client Lab sans validation MiKL (pas d'auto-onboarding)
- NE PAS envoyer email sans vérification format email
- NE PAS stocker les liens temporaires en DB (régénérer à la demande)
- NE PAS bloquer la fin de meeting si email échoue (async)

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5-*.md#Story 5.4]
- [Source: docs/project-context.md]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- 1 test échec initial (overlay click) → `post-meeting-dialog.test.tsx` ligne 98 : `previousElementSibling` → `firstElementChild`
- Migration `00031` déjà prise → utilisé `00034_add_meetings_type.sql`
- Schema `parcours` : champ `active_stages` (pas `steps`), `template_id`, `operator_id` (corrections vs story Dev Notes)
- Schema `reminders` : pas de `related_entity_type`/`related_entity_id` → adapté actions
- Module visio sans react-hook-form → composants plain HTML+Tailwind+useState (pattern existant)
- Prospect sans compte auth → `handleDirectEmail()` ajouté à Edge Function `send-email`

### Completion Notes List

- Toutes les tasks/subtasks implémentées (Tasks 1–8)
- 2066 tests passing, 0 failure (suite complète)
- 81 tests skipped (RLS — require live Supabase)
- Migration `00034` (type + metadata + clients prospect status)
- 4 Server Actions créées avec `{ data, error }` pattern
- 5 composants UI (plain HTML/Tailwind, pas de shadcn)
- 2 email templates avec XSS protection (escapeHtml)
- `handleDirectEmail()` ajouté à Edge Function send-email pour envoi sans auth
- `generateResourceLinks()` utility (signed URLs 7 jours)
- `usePostMeetingDialog` hook (state management)
- Tous les exports ajoutés dans `visio/index.ts`
- Documentation `docs/guide.md` mise à jour (section 5.4)
- **CR Fixes (Phase 2):**
  - H1: 3 test files manquants créés (send-resources-form, schedule-follow-up-form, not-interested-form)
  - H2: generate-resource-links optimisé — batch `.in()` query au lieu de N+1
  - H3: URL escaping ajouté dans prospect-resources email template (XSS prevention)
  - M1: post-meeting-dialog — reset selectedAction au close (pas de state stale)
  - M3: send-prospect-resources — client_id ajouté au reminder via meeting lookup
  - M4: dead code supprimé dans send-email/index.ts

### File List

- `supabase/migrations/00034_add_meetings_type.sql` (NEW)
- `packages/modules/visio/types/meeting.types.ts` (MODIFIED)
- `packages/modules/visio/types/meeting.types.test.ts` (MODIFIED)
- `packages/modules/visio/utils/to-meeting.ts` (MODIFIED)
- `packages/modules/visio/utils/to-meeting.test.ts` (MODIFIED)
- `packages/modules/visio/utils/generate-resource-links.ts` (NEW)
- `packages/modules/visio/utils/generate-resource-links.test.ts` (NEW)
- `packages/modules/visio/actions/end-meeting.ts` (MODIFIED)
- `packages/modules/visio/actions/end-meeting.test.ts` (MODIFIED)
- `packages/modules/visio/actions/create-lab-onboarding.ts` (NEW)
- `packages/modules/visio/actions/create-lab-onboarding.test.ts` (NEW)
- `packages/modules/visio/actions/send-prospect-resources.ts` (NEW)
- `packages/modules/visio/actions/send-prospect-resources.test.ts` (NEW)
- `packages/modules/visio/actions/schedule-follow-up.ts` (NEW)
- `packages/modules/visio/actions/schedule-follow-up.test.ts` (NEW)
- `packages/modules/visio/actions/mark-prospect-not-interested.ts` (NEW)
- `packages/modules/visio/actions/mark-prospect-not-interested.test.ts` (NEW)
- `packages/modules/visio/hooks/use-post-meeting-dialog.ts` (NEW)
- `packages/modules/visio/hooks/use-post-meeting-dialog.test.ts` (NEW)
- `packages/modules/visio/components/post-meeting-dialog.tsx` (NEW)
- `packages/modules/visio/components/post-meeting-dialog.test.tsx` (NEW)
- `packages/modules/visio/components/create-lab-form.tsx` (NEW)
- `packages/modules/visio/components/create-lab-form.test.tsx` (NEW)
- `packages/modules/visio/components/send-resources-form.tsx` (NEW)
- `packages/modules/visio/components/send-resources-form.test.tsx` (NEW)
- `packages/modules/visio/components/schedule-follow-up-form.tsx` (NEW)
- `packages/modules/visio/components/schedule-follow-up-form.test.tsx` (NEW)
- `packages/modules/visio/components/not-interested-form.tsx` (NEW)
- `packages/modules/visio/components/not-interested-form.test.tsx` (NEW)
- `packages/modules/visio/index.ts` (MODIFIED)
- `packages/modules/visio/docs/guide.md` (MODIFIED)
- `supabase/functions/_shared/email-templates/welcome-lab.ts` (NEW)
- `supabase/functions/_shared/email-templates/welcome-lab.test.ts` (NEW)
- `supabase/functions/_shared/email-templates/prospect-resources.ts` (NEW)
- `supabase/functions/_shared/email-templates/prospect-resources.test.ts` (NEW)
- `supabase/functions/send-email/handler.ts` (MODIFIED)
- `supabase/functions/send-email/handler.test.ts` (MODIFIED)
- `supabase/functions/send-email/index.ts` (MODIFIED)
