# Story 14.7: Refonte UX page étape — intégration finale

Status: ready-for-dev

## Story

As a **client Lab sur la page d'une étape**,
I want **une page étape complète et cohérente qui intègre le chat Élio embarqué (14.2), le bouton de génération (14.3), l'historique dans la colonne droite (14.4), et les feedbacks injectés (14.5) avec une UX responsive et des états clairs selon le statut de l'étape**,
so that **j'ai une expérience fluide et unifiée qui couvre tout le cycle de vie d'une étape : consultation, échange avec Élio, génération, soumission, feedback, réouverture**.

## Acceptance Criteria

**Given** un client accède à une étape avec statut 'locked'
**When** la page se charge
**Then** : colonne gauche = breadcrumb + header + "Pourquoi cette étape ?" + StepElioChat désactivé (opacity 50%, message "Étape non accessible") + PAS de bouton générer ; colonne droite = StepHistoryPanel (vide ou avec historique si étape a été rouverte puis re-locked)

**Given** un client accède à une étape avec statut 'current'
**When** la page se charge
**Then** : colonne gauche = breadcrumb + header + "Pourquoi cette étape ?" + StepElioChat actif + bouton "Générer mon document" (actif si conditions remplies) ; colonne droite = StepHistoryPanel

**Given** un client accède à une étape avec statut 'pending_review'
**When** la page se charge
**Then** : colonne gauche = breadcrumb + header + "Pourquoi cette étape ?" + StepElioChat lecture seule (message "Votre soumission est en cours d'examen") + bouton disabled "Soumission en cours..." ; colonne droite = StepHistoryPanel avec la soumission pending visible

**Given** un client accède à une étape avec statut 'completed'
**When** la page se charge
**Then** : colonne gauche = breadcrumb + header + "Pourquoi cette étape ?" + StepElioChat lecture seule + PAS de bouton générer + lien "Voir ma soumission" conservé ; colonne droite = StepHistoryPanel avec soumission approuvée

**Given** la page est sur mobile (breakpoint < lg)
**When** la colonne droite est masquée
**Then** un onglet "Historique" apparaît sous la colonne gauche (tab toggle : "Étape" / "Historique") permettant de voir le StepHistoryPanel

**Given** la page est refactorisée
**When** les tests existants sont lancés (`parcours-step-detail.test.tsx` — 11 tests)
**Then** tous passent (aucune régression)

**Given** le composant OneTeasingCard est actuellement dans ParcoursStepDetail
**When** la refonte est appliquée
**Then** OneTeasingCard est supprimé de la page étape (il était informatif et est remplacé par le chat Élio contextuel qui fournit plus de valeur)

## Tasks / Subtasks

- [ ] Task 1 — Refonte layout ParcoursStepDetail (AC: #1, #2, #3, #4, #7)
  - [ ] 1.1 Modifier `packages/modules/parcours/components/parcours-step-detail.tsx`
  - [ ] 1.2 Colonne gauche : conserver breadcrumb + header + "Pourquoi cette étape ?" + briefContent + briefAssets
  - [ ] 1.3 Colonne gauche : remplacer OneTeasingCard + CTA par StepElioChat (14.2) + GenerateDocumentButton (14.3)
  - [ ] 1.4 Colonne droite : remplacer le faux chat panel (lignes 121-164) par StepHistoryPanel (14.4)
  - [ ] 1.5 Supprimer l'import OneTeasingCard de ce fichier

- [ ] Task 2 — Logique d'état par statut (AC: #1, #2, #3, #4)
  - [ ] 2.1 Créer un mapping `stepStatusConfig` : pour chaque statut, définir { chatEnabled, chatMessage, showGenerateButton, generateButtonDisabled, generateButtonLabel, showSubmissionLink }
  - [ ] 2.2 Appliquer le mapping dans le rendu

- [ ] Task 3 — Responsive mobile onglet (AC: #5)
  - [ ] 3.1 Créer `packages/modules/parcours/components/step-mobile-tabs.tsx`
  - [ ] 3.2 Onglets "Étape" / "Historique" visibles uniquement en < lg
  - [ ] 3.3 Sur mobile : colonne droite masquée (hidden lg:flex), contenu historique accessible via tab
  - [ ] 3.4 Test du composant tabs

- [ ] Task 4 — Non-régression tests existants (AC: #6)
  - [ ] 4.1 Mettre à jour les mocks dans `parcours-step-detail.test.tsx` pour les nouveaux composants (StepElioChat, GenerateDocumentButton, StepHistoryPanel)
  - [ ] 4.2 S'assurer que les 11 tests existants passent toujours
  - [ ] 4.3 Ajouter tests pour les nouveaux états (pending_review, responsive tabs)

- [ ] Task 5 — Navigation ajustée (AC: #4)
  - [ ] 5.1 Conserver StepNavigationButtons (prev/next) en bas de la colonne gauche
  - [ ] 5.2 Conserver le lien "Voir ma soumission" pour status 'completed' / 'skipped'
  - [ ] 5.3 Ajouter un lien "Retour au parcours" plus visible (breadcrumb déjà présent mais ajouter un bouton mobile)

## Dev Notes

### Architecture — Règles critiques

- Cette story est principalement de l'assemblage — les composants sont déjà créés dans 14.2, 14.3, 14.4, 14.5
- NE PAS recréer de composants — importer depuis le même module parcours
- Le faux chat panel actuel (lignes 121-164 de parcours-step-detail.tsx) est ENTIÈREMENT remplacé par StepHistoryPanel
- OneTeasingCard est supprimée de cette page (le composant reste dans le module pour d'autres usages éventuels, mais n'est plus importé ici)
- Les tests existants utilisent un mock de `@monprojetpro/ui` et de `react-markdown` — les nouveaux composants doivent être mockés de la même manière pour ne pas casser les tests
- Pattern responsive : `hidden lg:flex` pour la colonne droite, tabs visibles en `lg:hidden`

### Layout final attendu

```
┌─────────────────────────────────────────────────────────────────────┐
│ Desktop (≥ lg)                                                       │
├────────────────────────────┬────────────────────────────────────────┤
│ Colonne gauche (flex-1)    │ Colonne droite (w-[420px])             │
│                            │                                        │
│ [Breadcrumb]               │ [StepHistoryPanel]                     │
│ [Header étape + badge]     │   ├─ Soumissions (badges, dates)      │
│ [Pourquoi cette étape ?]   │   ├─ Documents générés                │
│ [Brief content si présent] │   └─ Feedback MiKL                    │
│ [Brief assets si présent]  │                                        │
│ [StepElioChat ~420px]      │                                        │
│ [GenerateDocumentButton]   │                                        │
│ [StepNavigationButtons]    │                                        │
└────────────────────────────┴────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Mobile (< lg)                                                        │
├─────────────────────────────────────────────────────────────────────┤
│ [Onglets: "Étape" | "Historique"]                                    │
│                                                                      │
│ Tab "Étape":                                                         │
│   [Breadcrumb] [Header] [Description] [Chat] [Bouton] [Nav]        │
│                                                                      │
│ Tab "Historique":                                                     │
│   [StepHistoryPanel pleine largeur]                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Fichiers à créer / modifier

```
packages/modules/parcours/components/parcours-step-detail.tsx          # MODIFIER — refonte complète du layout
packages/modules/parcours/components/parcours-step-detail.test.tsx     # MODIFIER — mocks + nouveaux tests
packages/modules/parcours/components/step-mobile-tabs.tsx              # CRÉER
packages/modules/parcours/components/step-mobile-tabs.test.tsx         # CRÉER
```

## File List (auto-generated at completion)

## Completion Notes
