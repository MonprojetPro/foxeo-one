# Story 14.8 : Panneau droit historique de l'étape

Status: done

## Story

As a **client Lab sur la page d'une étape**,
I want **voir dans la colonne droite l'historique complet de l'étape : soumissions avec leur statut, documents générés, et feedback de MiKL**,
so that **j'ai une vision globale de mes échanges et progressions sur cette étape sans quitter la page**.

## Acceptance Criteria

**Given** un client accède à la page d'une étape
**When** la colonne droite se charge
**Then** elle affiche 3 sections dans l'ordre : "Soumissions", "Documents générés", "Feedback MiKL" — le panneau remplace le faux chat Élio statique actuel

**Given** la section "Soumissions" contient des entrées
**When** la liste s'affiche
**Then** chaque soumission montre : badge statut coloré (en attente = jaune, approuvé = vert, refusé = rouge, révision = orange), date relative ("il y a 2 jours"), aperçu tronqué du contenu (50 premiers caractères) — cliquable pour ouvrir une modal avec le contenu complet

**Given** la section "Soumissions" est vide
**When** la page se charge
**Then** message : "Aucune soumission pour cette étape"

**Given** la section "Documents générés" contient des entrées
**When** la liste s'affiche
**Then** chaque document montre : titre auto ("Document — {date}"), aperçu 2 lignes, icône téléchargement (copie le markdown dans le clipboard — pas de vrai fichier pour l'instant)

**Given** la section "Feedback MiKL" contient des injections (Story 14.5)
**When** la liste s'affiche
**Then** chaque feedback est stylé distinctement : fond orange léger (#fb923c/10), label "MiKL", date, contenu texte — les non-lus ont un point bleu

**Given** une soumission change de statut (MiKL valide/refuse depuis le Hub)
**When** le client est sur la page
**Then** le badge statut se met à jour en temps réel (Supabase Realtime subscription sur step_submissions WHERE step_id = X)

**Given** la page est affichée sur mobile (< lg breakpoint)
**When** le panneau droit est masqué
**Then** il est accessible via un onglet "Historique" sous le contenu principal (préparé pour Story 14.7)

## Tasks / Subtasks

- [x] Task 1 — Hook useStepHistory (AC: #1, #2, #3, #4, #5, #6)
  - [x] 1.1 Créer `packages/modules/parcours/hooks/use-step-history.ts`
  - [x] 1.2 TanStack Query : fetch step_submissions WHERE parcours_step_id = stepId
  - [x] 1.3 TanStack Query : fetch step_feedback_injections WHERE step_id = stepId (prépare 14.5 — retourne [] si table n'existe pas encore)
  - [x] 1.4 Realtime subscription sur step_submissions filtré par step_id → invalidateQueries
  - [x] 1.5 Test du hook

- [x] Task 2 — Composant StepHistoryPanel (AC: #1, #7)
  - [x] 2.1 Créer `packages/modules/parcours/components/step-history-panel.tsx`
  - [x] 2.2 Layout : 3 sections collapsibles avec header + nombre d'items
  - [x] 2.3 Scroll vertical si contenu dépasse la hauteur disponible

- [x] Task 3 — Sous-composant SubmissionsList (AC: #2, #3)
  - [x] 3.1 Créer `packages/modules/parcours/components/step-submissions-list.tsx`
  - [x] 3.2 Badge statut coloré (mapping couleurs)
  - [x] 3.3 Date relative (intl RelativeTimeFormat ou helper existant)
  - [x] 3.4 Aperçu tronqué + onClick ouvre modal contenu complet
  - [x] 3.5 État vide

- [x] Task 4 — Sous-composant DocumentsList (AC: #4)
  - [x] 4.1 Créer `packages/modules/parcours/components/step-documents-list.tsx`
  - [x] 4.2 Liste des documents (extraits de step_submissions.submission_content pour les soumissions)
  - [x] 4.3 Bouton copier markdown dans clipboard

- [x] Task 5 — Sous-composant FeedbackList (AC: #5)
  - [x] 5.1 Créer `packages/modules/parcours/components/step-feedback-list.tsx`
  - [x] 5.2 Style orange MiKL
  - [x] 5.3 Point bleu non-lu (basé sur read_at NULL — prépare 14.5)
  - [x] 5.4 État vide ("Aucun feedback pour le moment")

- [x] Task 6 — Modal soumission détaillée (AC: #2)
  - [x] 6.1 Créer `packages/modules/parcours/components/submission-detail-modal.tsx`
  - [x] 6.2 Affiche le contenu complet markdown + feedback si présent

- [x] Task 7 — Tests (AC: tous)
  - [x] 7.1 Test StepHistoryPanel (rendu des 3 sections)
  - [x] 7.2 Test SubmissionsList (badges, états vides, click)
  - [x] 7.3 Test StepDocumentsList (copie clipboard)
  - [x] 7.4 Test FeedbackList (style orange, non-lu)

## Dev Notes

### Architecture — Règles critiques

- Le panneau remplace la colonne droite "faux chat Élio" existante dans `parcours-step-detail.tsx` (lignes 121-164)
- Realtime : pattern identique à Story 7.6 (useEffect subscription → queryClient.invalidateQueries)
- Date relative : utiliser `Intl.RelativeTimeFormat('fr')` ou un helper utilitaire existant dans `@monprojetpro/utils`
- Modal : pattern dialog existant (pas de librairie externe)
- Les "Documents générés" sont simplement les `submission_content` des step_submissions (pas de table séparée pour l'instant)
- La section Feedback s'appuie sur la table `step_feedback_injections` créée en Story 14.5 — si la table n'existe pas encore lors du dev, le hook retourne un tableau vide (graceful fallback)

### Fichiers à créer / modifier

```
packages/modules/parcours/hooks/use-step-history.ts                     # CRÉER
packages/modules/parcours/hooks/use-step-history.test.ts                # CRÉER
packages/modules/parcours/components/step-history-panel.tsx              # CRÉER
packages/modules/parcours/components/step-history-panel.test.tsx         # CRÉER
packages/modules/parcours/components/step-submissions-list.tsx           # CRÉER
packages/modules/parcours/components/step-submissions-list.test.tsx      # CRÉER
packages/modules/parcours/components/step-documents-list.tsx             # CRÉER
packages/modules/parcours/components/step-documents-list.test.tsx        # CRÉER
packages/modules/parcours/components/step-feedback-list.tsx              # CRÉER
packages/modules/parcours/components/step-feedback-list.test.tsx         # CRÉER
packages/modules/parcours/components/submission-detail-modal.tsx         # CRÉER
packages/modules/parcours/components/parcours-step-detail.tsx            # MODIFIER — remplacer colonne droite
```

## File List (auto-generated at completion)

```
packages/modules/parcours/hooks/use-step-history.ts                     CRÉÉ
packages/modules/parcours/hooks/use-step-history.test.ts                CRÉÉ
packages/modules/parcours/components/step-history-panel.tsx              CRÉÉ
packages/modules/parcours/components/step-history-panel.test.tsx         CRÉÉ
packages/modules/parcours/components/step-submissions-list.tsx           CRÉÉ
packages/modules/parcours/components/step-submissions-list.test.tsx      CRÉÉ
packages/modules/parcours/components/step-documents-list.tsx             CRÉÉ
packages/modules/parcours/components/step-documents-list.test.tsx        CRÉÉ
packages/modules/parcours/components/step-feedback-list.tsx              CRÉÉ
packages/modules/parcours/components/step-feedback-list.test.tsx         CRÉÉ
packages/modules/parcours/components/submission-detail-modal.tsx         CRÉÉ
packages/modules/parcours/components/parcours-step-detail.tsx            MODIFIÉ — faux chat remplacé par StepHistoryPanel
docs/client-release-notes.md                                             MODIFIÉ — release note Story 14.8
```

## Completion Notes

Story implémentée le 2026-04-22. Commit : 0bb831c.
28 tests passants. Score SCAN : 41/50 — A.
Pas de migration nécessaire (utilise les tables existantes step_submissions + graceful fallback step_feedback_injections).
Pas de leçon enregistrée — story sans embûche.
