# Story 14.10 : Réouverture d'étape validée par MiKL

Status: done

## Story

As a **opérateur MiKL depuis le Hub**,
I want **rouvrir une étape dont le statut est 'completed' avec un motif optionnel**,
so that **le client peut réviser son travail si nécessaire, sans perdre son historique de soumissions ni affecter les étapes suivantes**.

## Acceptance Criteria

**Given** MiKL est sur la vue détaillée d'une soumission approuvée dans le Validation Hub
**When** il voit le bouton "Rouvrir cette étape"
**Then** le bouton est visible avec un textarea optionnel "Raison de la réouverture"

**Given** MiKL clique "Rouvrir cette étape" (avec ou sans raison)
**When** l'action est exécutée
**Then** :
1. UPDATE `parcours_steps` SET status = 'current', completed_at = NULL, validation_id = NULL WHERE id = step_id
2. UPDATE `step_submissions` SET status = 'revision_requested' WHERE parcours_step_id = step_id AND status = 'approved' (la dernière soumission approuvée passe en révision)
3. INSERT notification client : type = 'step_reopened', body = "MiKL a rouvert l'étape N — {reason si fourni}"
4. Toast succès côté Hub : "Étape rouverte avec succès"

**Given** MiKL tente de rouvrir une étape qui n'est PAS 'completed'
**When** l'action est exécutée
**Then** erreur : "Seule une étape complétée peut être rouverte" (guard côté serveur)

**Given** un utilisateur non-opérateur tente d'appeler reopenStep
**When** l'action est exécutée
**Then** erreur : "Accès refusé" (guard is_operator())

**Given** une étape est rouverte
**When** le client consulte son parcours
**Then** l'étape apparaît comme 'current' (chat actif, bouton générer disponible) et la notification de réouverture est visible

**Given** une étape est rouverte
**When** on vérifie les étapes suivantes
**Then** elles ne sont PAS affectées (restent dans leur état actuel — current, completed, locked, etc.)

## Tasks / Subtasks

- [x] Task 1 — Server Action reopenStep (AC: #2, #3, #4, #6)
  - [x] 1.1 Créer `packages/modules/parcours/actions/reopen-step.ts`
  - [x] 1.2 Guard is_operator() — retourner `{ data: null, error: { message: 'Accès refusé', code: 'FORBIDDEN' } }` si KO
  - [x] 1.3 Guard status === 'completed' — erreur si pas 'completed'
  - [x] 1.4 Transaction : UPDATE parcours_steps + UPDATE dernière step_submissions approved → revision_requested
  - [x] 1.5 INSERT notification client (type = 'info', body avec raison optionnelle)
  - [x] 1.6 Input Zod : `ReopenStepInput { stepId: uuid, reason?: string }`
  - [x] 1.7 Test co-localisé (guards, succès, notification, pas d'effet sur autres étapes)

- [x] Task 2 — Composant ReopenStepButton (AC: #1)
  - [x] 2.1 Créer `packages/modules/parcours/components/reopen-step-button.tsx`
  - [x] 2.2 Bouton orange "Rouvrir cette étape" avec icône warning
  - [x] 2.3 Au clic : expand textarea "Raison (optionnel)" + bouton confirmer
  - [x] 2.4 Loading state pendant l'action
  - [x] 2.5 Toast succès / erreur
  - [x] 2.6 Test du composant

- [x] Task 3 — Intégration Hub (AC: #1)
  - [x] 3.1 Intégrer ReopenStepButton dans la vue détaillée d'une soumission approuvée (Validation Hub)
  - [x] 3.2 Visible uniquement si submission.status === 'approved' et showValidationForm

- [x] Task 4 — Types (AC: #2)
  - [x] 4.1 Ajouter `ReopenStepInput` Zod schema + `ReopenStepResult` dans types
  - [x] 4.2 Notification type 'info' (compatible schéma existant)

## Dev Notes

### Architecture — Règles critiques

- Pattern `{ data, error }` — JAMAIS throw
- La réouverture ne doit PAS cascader : les étapes suivantes restent dans leur état
- La soumission approuvée la plus récente (ORDER BY submitted_at DESC LIMIT 1 WHERE status = 'approved') passe à 'revision_requested'
- Le client retrouve exactement le même état qu'avant validation : chat actif, possibilité de regénérer, etc.
- Notification : `recipient_type: 'client', recipient_id: client_id, type: 'step_reopened'`
- L'action doit être idempotente : si l'étape est déjà 'current', ne pas re-traiter

### Fichiers à créer / modifier

```
packages/modules/parcours/types/parcours.types.ts                     # MODIFIER — ajouter ReopenStepInput Zod
packages/modules/parcours/actions/reopen-step.ts                      # CRÉER
packages/modules/parcours/actions/reopen-step.test.ts                 # CRÉER
packages/modules/parcours/components/reopen-step-button.tsx           # CRÉER
packages/modules/parcours/components/reopen-step-button.test.tsx      # CRÉER
```

## File List (auto-generated at completion)

- `packages/modules/parcours/types/parcours.types.ts` — modifié (ReopenStepInput, ReopenStepResult)
- `packages/modules/parcours/actions/reopen-step.ts` — créé
- `packages/modules/parcours/actions/reopen-step.test.ts` — créé (14 tests)
- `packages/modules/parcours/components/reopen-step-button.tsx` — créé
- `packages/modules/parcours/components/reopen-step-button.test.tsx` — créé (13 tests)
- `packages/modules/parcours/components/submission-detail-view.tsx` — modifié (intégration ReopenStepButton)
- `packages/modules/parcours/index.ts` — modifié (exports)

## Completion Notes

- 27 tests passent (14 action + 13 composant)
- Guard is_operator() via query operators table (RLS operators_select_self compatible)
- Notification type 'info' (schéma notifications existant)
- Visible dans SubmissionDetailView uniquement si submission.status === 'approved' ET showValidationForm (Hub)
- Pas de migration nécessaire (aucune nouvelle table)
