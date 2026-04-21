# Story 14.9 : Feedback MiKL — injection de questions dans l'Élio de l'étape

Status: ready-for-dev

## Story

As a **opérateur MiKL depuis le Hub (Validation Hub)**,
I want **envoyer du feedback texte OU injecter des questions directement dans le chat Élio de l'étape du client**,
so that **je guide le client sans intervention directe, en laissant Élio relayer mes questions dans le contexte de la conversation d'étape**.

## Acceptance Criteria

**Given** MiKL est sur la vue d'une soumission refusée ou en révision dans le Validation Hub
**When** il voit le formulaire de feedback
**Then** il a le choix entre 2 modes radio : "Feedback texte" (visible dans l'historique étape) / "Injecter questions dans Élio" (les questions apparaissent comme messages dans le chat)

**Given** MiKL choisit "Feedback texte" et soumet
**When** le formulaire est envoyé
**Then** INSERT dans `step_feedback_injections` avec type = 'text_feedback', notification client envoyée (type = 'step_feedback')

**Given** MiKL choisit "Injecter questions dans Élio" et soumet
**When** le formulaire est envoyé
**Then** :
1. INSERT dans `step_feedback_injections` avec type = 'elio_questions'
2. INSERT dans `elio_messages` avec role = 'assistant', content = questions, metadata = `{ source: 'operator_injection', injection_id: uuid }`
3. Notification client (type = 'step_feedback', body = "MiKL vous a envoyé des questions sur l'étape N")

**Given** le client ouvre le chat Élio de l'étape après une injection
**When** les messages se chargent
**Then** les messages injectés apparaissent avec un style distinct : fond orange léger (#fb923c/10), bordure orange (#fb923c/30), label "MiKL vous pose des questions" au-dessus du contenu

**Given** le client a des injections non lues
**When** il consulte la page "Mon Parcours" (liste des étapes)
**Then** un badge numérique orange apparaît sur la carte de l'étape concernée (nombre d'injections WHERE read_at IS NULL)

**Given** le client ouvre une étape avec des injections non lues
**When** la page se charge
**Then** les injections sont marquées comme lues (UPDATE step_feedback_injections SET read_at = NOW() WHERE step_id AND client_id AND read_at IS NULL)

**Given** un utilisateur non-opérateur tente d'insérer dans step_feedback_injections
**When** la requête INSERT est effectuée
**Then** RLS bloque (policy : INSERT = is_operator(), SELECT = own data pour client)

## Tasks / Subtasks

- [ ] Task 1 — Migration SQL step_feedback_injections (AC: #6)
  - [ ] 1.1 Créer migration `00099_create_step_feedback_injections.sql`
  - [ ] 1.2 Table : id, step_id (FK), operator_id (UUID NOT NULL), client_id (UUID NOT NULL), content (TEXT NOT NULL), type (CHECK 'text_feedback'/'elio_questions'), injected_at (TIMESTAMPTZ DEFAULT NOW()), read_at (TIMESTAMPTZ nullable), created_at (TIMESTAMPTZ DEFAULT NOW())
  - [ ] 1.3 RLS : INSERT is_operator(), SELECT (is_operator() OR client owns — auth.uid() via clients lookup), UPDATE read_at client-only
  - [ ] 1.4 Index sur step_id + client_id

- [ ] Task 2 — Types TypeScript (AC: tous)
  - [ ] 2.1 Ajouter `StepFeedbackInjectionDB` et `StepFeedbackInjection` dans types
  - [ ] 2.2 Schéma Zod `CreateFeedbackInjectionInput`

- [ ] Task 3 — Server Action Hub : createFeedbackInjection (AC: #1, #2, #3)
  - [ ] 3.1 Créer `packages/modules/parcours/actions/create-feedback-injection.ts`
  - [ ] 3.2 Guard is_operator()
  - [ ] 3.3 Si type = 'elio_questions' : également INSERT dans elio_messages (résoudre conversation_id via step_id)
  - [ ] 3.4 INSERT notification client
  - [ ] 3.5 Test co-localisé

- [ ] Task 4 — Server Action Client : markInjectionsRead (AC: #6)
  - [ ] 4.1 Créer `packages/modules/parcours/actions/mark-injections-read.ts`
  - [ ] 4.2 UPDATE step_feedback_injections SET read_at = NOW() WHERE step_id AND client_id (auth) AND read_at IS NULL
  - [ ] 4.3 Test co-localisé

- [ ] Task 5 — Hook useUnreadInjections (AC: #5)
  - [ ] 5.1 Créer `packages/modules/parcours/hooks/use-unread-injections.ts`
  - [ ] 5.2 TanStack Query : SELECT count WHERE client_id AND read_at IS NULL, groupé par step_id
  - [ ] 5.3 Utilisé par parcours-step-card pour afficher le badge
  - [ ] 5.4 Test du hook

- [ ] Task 6 — UI Hub : formulaire injection (AC: #1)
  - [ ] 6.1 Créer `packages/modules/parcours/components/feedback-injection-form.tsx`
  - [ ] 6.2 Radio "Feedback texte" / "Injecter questions dans Élio"
  - [ ] 6.3 Textarea pour le contenu
  - [ ] 6.4 Bouton soumettre + toast succès
  - [ ] 6.5 Intégrer dans la vue détaillée Validation Hub (soumission refusée/révision)
  - [ ] 6.6 Test du composant

- [ ] Task 7 — Style messages injectés dans StepElioChat (AC: #4)
  - [ ] 7.1 Modifier `step-elio-chat.tsx` (Story 14.2) — détecter metadata.source === 'operator_injection'
  - [ ] 7.2 Appliquer style orange distinct + label "MiKL vous pose des questions"

- [ ] Task 8 — Badge non-lu sur carte étape (AC: #5)
  - [ ] 8.1 Modifier `parcours-step-card.tsx` — afficher badge orange si count > 0

- [ ] Task 9 — Auto-mark read au chargement (AC: #6)
  - [ ] 9.1 Dans StepElioChat ou ParcoursStepDetail : useEffect appelle markInjectionsRead au montage si des non-lus existent

## Dev Notes

### Architecture — Règles critiques

- `operator_id` : extraire depuis le contexte auth Hub (pas client auth)
- L'injection dans `elio_messages` doit respecter le schéma existant : `{ id, conversation_id, role: 'assistant', content, metadata: { source: 'operator_injection', injection_id } }`
- Pour résoudre `conversation_id` depuis `step_id` : SELECT elio_conversations WHERE step_id = X AND client_id = Y — si pas de conversation existante, NE PAS injecter (le client n'a pas encore commencé l'étape)
- Le formulaire d'injection est dans le Hub, donc il doit être dans un composant qui sera intégré dans la page Validation Hub existante
- Pattern notifications : `recipient_type: 'client', recipient_id: client_id, type: 'step_feedback'`

### Base de données

```sql
-- Migration 00099_create_step_feedback_injections.sql

CREATE TABLE step_feedback_injections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES parcours_steps(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL,
  client_id UUID NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text_feedback', 'elio_questions')),
  injected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE step_feedback_injections ENABLE ROW LEVEL SECURITY;

-- Operator peut tout lire et insérer
CREATE POLICY step_feedback_injections_select_operator ON step_feedback_injections
  FOR SELECT USING (is_operator());
CREATE POLICY step_feedback_injections_insert_operator ON step_feedback_injections
  FOR INSERT WITH CHECK (is_operator());

-- Client peut lire ses propres injections
CREATE POLICY step_feedback_injections_select_client ON step_feedback_injections
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

-- Client peut marquer comme lu (UPDATE read_at uniquement)
CREATE POLICY step_feedback_injections_update_client ON step_feedback_injections
  FOR UPDATE USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  );

CREATE INDEX idx_step_feedback_injections_step_client
  ON step_feedback_injections(step_id, client_id);

CREATE INDEX idx_step_feedback_injections_unread
  ON step_feedback_injections(client_id) WHERE read_at IS NULL;
```

### Fichiers à créer / modifier

```
supabase/migrations/00099_create_step_feedback_injections.sql               # CRÉER

packages/modules/parcours/types/parcours.types.ts                           # MODIFIER — ajouter types injection
packages/modules/parcours/actions/create-feedback-injection.ts              # CRÉER
packages/modules/parcours/actions/create-feedback-injection.test.ts         # CRÉER
packages/modules/parcours/actions/mark-injections-read.ts                   # CRÉER
packages/modules/parcours/actions/mark-injections-read.test.ts              # CRÉER
packages/modules/parcours/hooks/use-unread-injections.ts                    # CRÉER
packages/modules/parcours/hooks/use-unread-injections.test.ts               # CRÉER
packages/modules/parcours/components/feedback-injection-form.tsx            # CRÉER
packages/modules/parcours/components/feedback-injection-form.test.tsx       # CRÉER
packages/modules/parcours/components/step-elio-chat.tsx                     # MODIFIER — style injection
packages/modules/parcours/components/parcours-step-card.tsx                 # MODIFIER — badge non-lu
```

## File List (auto-generated at completion)

## Completion Notes
