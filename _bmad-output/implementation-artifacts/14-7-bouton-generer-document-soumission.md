# Story 14.7 : Bouton "Générer mon document" + soumission

Status: done

## Story

As a **client Lab sur une étape en cours**,
I want **cliquer sur "Générer mon document" pour produire un livrable à partir de ma conversation Élio, le consulter si je le souhaite, puis le soumettre à MiKL pour validation**,
so that **je transforme mes échanges Élio en un livrable concret et je progresse dans mon parcours grâce à la validation MiKL**.

## Acceptance Criteria

**Given** un client est sur une étape avec statut 'current' ET a >= 3 échanges dans la conversation de l'étape ET aucune soumission 'pending' n'existe pour cette étape
**When** le bouton "Générer mon document" est visible
**Then** il est activé et cliquable

**Given** un client clique sur "Générer mon document"
**When** le dialogue de confirmation s'affiche
**Then** Élio demande : "Es-tu sûr d'avoir bien cerné le sujet ? Tu penses être prêt à soumettre ton document à MiKL ?" avec 2 boutons : [Oui, je suis prêt] [Non, continuer]

**Given** le client clique [Non, continuer]
**When** le dialogue se ferme
**Then** il revient au chat (aucune action)

**Given** le client clique [Oui, je suis prêt]
**When** la génération se lance
**Then** un état loading s'affiche ("Élio rédige votre document...") puis au succès 2 boutons : [Consulter avant d'envoyer] [Envoyer directement]

**Given** le client clique [Consulter avant d'envoyer]
**When** le document s'affiche
**Then** le contenu markdown généré est rendu dans un panneau (BriefMarkdownRenderer) avec un bouton [Confirmer l'envoi] en bas

**Given** le client clique [Envoyer directement] ou [Confirmer l'envoi]
**When** la soumission est traitée
**Then** :
1. INSERT dans `step_submissions` (submission_content = document généré, status = 'pending')
2. INSERT dans `validation_requests` (type = 'step_submission', step_id, client_id, content = aperçu)
3. UPDATE `parcours_steps` SET status = 'pending_review'
4. INSERT notification opérateur (type = 'step_submission', title = "Nouvelle soumission — Étape N")
5. Toast succès : "Votre document a été soumis à MiKL !"
6. Le bouton disparaît, remplacé par "Soumission en cours..."

**Given** le bouton est désactivé
**When** les conditions ne sont pas remplies
**Then** tooltip explicatif : "Minimum 3 échanges avec Élio" OU "Soumission en attente de validation" OU "Étape non accessible"

**Given** le statut 'pending_review' est ajouté
**When** parcours_steps CHECK constraint est mis à jour
**Then** la colonne status accepte : 'locked', 'current', 'completed', 'skipped', 'pending_review'

## Tasks / Subtasks

- [x] Task 1 — Migration : ajout statut 'pending_review' (AC: #8)
  - [x] 1.1 Créer migration `00102_add_pending_review_status.sql` (00098 déjà pris)
  - [x] 1.2 ALTER TABLE parcours_steps DROP CONSTRAINT + ADD CONSTRAINT avec 'pending_review' ajouté
  - [x] 1.3 Mettre à jour `ParcoursStepStatusValues` dans types

- [x] Task 2 — Server Action generateAndSubmitStep (AC: #6)
  - [x] 2.1 Créer `packages/modules/parcours/actions/generate-and-submit-step.ts`
  - [x] 2.2 Logique : getEffectiveElioConfig → appeler Claude avec system prompt + historique conversation → retourner document markdown
  - [x] 2.3 Créer `packages/modules/parcours/actions/submit-generated-document.ts` — INSERT step_submissions + validation_requests + UPDATE step status + notification
  - [x] 2.4 Tests pour les 2 actions (8 + 9 tests)

- [x] Task 3 — Composant GenerateDocumentButton (AC: #1, #2, #3, #4, #5, #7)
  - [x] 3.1 Créer `packages/modules/parcours/components/generate-document-button.tsx`
  - [x] 3.2 États : idle, confirmation, loading, preview, submitting, submitted
  - [x] 3.3 Vérification conditions (>= 3 messages, pas de pending, status = 'current')
  - [x] 3.4 Dialog de confirmation avec les 2 boutons
  - [x] 3.5 État loading avec animation
  - [x] 3.6 Aperçu avec BriefMarkdownRenderer + bouton confirmer
  - [x] 3.7 Tooltip quand disabled
  - [x] 3.8 Test du composant (11 tests, tous les états)

- [x] Task 4 — Intégration dans ParcoursStepDetail (AC: #1)
  - [x] 4.1 Placer le bouton après StepElioChat dans la colonne gauche
  - [x] 4.2 Bouton visible pour 'current' ET 'pending_review' (SCAN fix : feedback nécessaire post-soumission)

- [x] Task 5 — Hook useStepSubmissionStatus (AC: #1, #7)
  - [x] 5.1 Créer `packages/modules/parcours/hooks/use-step-submission-status.ts` — TanStack Query, vérifie si soumission pending existe pour le step_id
  - [x] 5.2 Test du hook (4 tests)

## Dev Notes

### Architecture — Règles critiques

- La génération du document se fait côté serveur via l'action `generateAndSubmitStep` qui appelle Claude (même pattern que `generate-brief.ts` dans le module elio)
- La soumission est une action séparée `submitGeneratedDocument` pour permettre la consultation intermédiaire
- `validation_requests.type` : utiliser 'step_submission' (vérifier que le CHECK constraint l'accepte — sinon ajouter dans la migration)
- Notification : utiliser le pattern existant dans `packages/modules/validation-hub/`
- L'action de génération a besoin de l'historique des messages (SELECT elio_messages WHERE conversation_id ORDER BY created_at)
- Pattern `{ data, error }` — JAMAIS throw

### Base de données

```sql
-- Migration 00098_add_pending_review_status.sql

-- Ajouter 'pending_review' au CHECK constraint de parcours_steps.status
ALTER TABLE parcours_steps DROP CONSTRAINT IF EXISTS parcours_steps_status_check;
ALTER TABLE parcours_steps ADD CONSTRAINT parcours_steps_status_check
  CHECK (status IN ('locked', 'current', 'completed', 'skipped', 'pending_review'));
```

### Fichiers à créer / modifier

```
supabase/migrations/00098_add_pending_review_status.sql                    # CRÉER

packages/modules/parcours/types/parcours.types.ts                          # MODIFIER — ajouter 'pending_review' à ParcoursStepStatusValues
packages/modules/parcours/actions/generate-and-submit-step.ts              # CRÉER
packages/modules/parcours/actions/generate-and-submit-step.test.ts         # CRÉER
packages/modules/parcours/actions/submit-generated-document.ts             # CRÉER
packages/modules/parcours/actions/submit-generated-document.test.ts        # CRÉER
packages/modules/parcours/hooks/use-step-submission-status.ts              # CRÉER
packages/modules/parcours/hooks/use-step-submission-status.test.ts         # CRÉER
packages/modules/parcours/components/generate-document-button.tsx          # CRÉER
packages/modules/parcours/components/generate-document-button.test.tsx     # CRÉER
packages/modules/parcours/components/parcours-step-detail.tsx              # MODIFIER — ajout bouton
```

## File List (auto-generated at completion)

```
supabase/migrations/00102_add_pending_review_status.sql                        # CRÉÉ (00098 déjà pris)
packages/modules/parcours/types/parcours.types.ts                              # MODIFIÉ — 'pending_review' ajouté
packages/modules/parcours/actions/generate-and-submit-step.ts                  # CRÉÉ
packages/modules/parcours/actions/generate-and-submit-step.test.ts             # CRÉÉ — 8 tests
packages/modules/parcours/actions/submit-generated-document.ts                 # CRÉÉ
packages/modules/parcours/actions/submit-generated-document.test.ts            # CRÉÉ — 9 tests
packages/modules/parcours/hooks/use-step-submission-status.ts                  # CRÉÉ
packages/modules/parcours/hooks/use-step-submission-status.test.ts             # CRÉÉ — 4 tests
packages/modules/parcours/components/generate-document-button.tsx              # CRÉÉ
packages/modules/parcours/components/generate-document-button.test.tsx         # CRÉÉ — 11 tests
packages/modules/parcours/components/step-elio-chat.tsx                        # MODIFIÉ — onMessagesLoaded useEffect
packages/modules/parcours/components/parcours-step-detail.tsx                  # MODIFIÉ — messageCount state + GenerateDocumentButton
packages/modules/parcours/components/parcours-step-status-badge.tsx            # MODIFIÉ — badge 'pending_review'
packages/modules/parcours/index.ts                                              # MODIFIÉ — exports ajoutés
```

Total : 14 fichiers, +1,145 insertions, -2 suppressions, +1,143 net. 32 tests ✅.
Commit : `9ab46d3` — `feat: Story 14.7 — Bouton "Générer mon document" + soumission (32 tests)`
Migration appliquée : `npx supabase db push --linked` ✅

## Completion Notes

- Migration 00098 était déjà utilisée → utilisé 00102 (prochaine disponible après 00101)
- SCAN a trouvé 2 BLOQUANTs fixés : (1) bouton non affiché en pending_review → condition élargie, (2) messageCount non mis à jour après envois → useEffect sur messages
- SCAN 2 IMPORTANTs fixés : handlers après return (réorganisés en useCallback), parcours_id manquant dans validation_requests insert
- État 'submitting' ajouté (non dans l'AC mais nécessaire pour UX cohérente entre preview et submitted)
