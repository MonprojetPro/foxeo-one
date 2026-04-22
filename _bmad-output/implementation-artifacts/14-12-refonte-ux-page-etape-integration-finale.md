# Story 14.12 : Refonte UX page étape — intégration finale

Status: done

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

- [x] Task 1 — Refonte layout ParcoursStepDetail (AC: #1, #2, #3, #4, #7)
  - [x] 1.1 Modifier `packages/modules/parcours/components/parcours-step-detail.tsx`
  - [x] 1.2 Colonne gauche : conserver breadcrumb + header + "Pourquoi cette étape ?" + briefContent + briefAssets
  - [x] 1.3 Colonne gauche : remplacer OneTeasingCard + CTA par StepElioChat (14.2) + GenerateDocumentButton (14.3)
  - [x] 1.4 Colonne droite : remplacer le faux chat panel par StepHistoryPanel (14.4)
  - [x] 1.5 Supprimer l'import OneTeasingCard de ce fichier

- [x] Task 2 — Logique d'état par statut (AC: #1, #2, #3, #4)
  - [x] 2.1 Créer un mapping `stepStatusConfig` : { showGenerateButton, showSubmissionLink }
  - [x] 2.2 Appliquer le mapping dans le rendu

- [x] Task 3 — Responsive mobile onglet (AC: #5)
  - [x] 3.1 Créer `packages/modules/parcours/components/step-mobile-tabs.tsx`
  - [x] 3.2 Onglets "Étape" / "Historique" visibles uniquement en < lg
  - [x] 3.3 Sur mobile : colonne droite masquée (hidden lg:flex), contenu historique accessible via tab
  - [x] 3.4 Test du composant tabs (7 tests)

- [x] Task 4 — Non-régression tests existants (AC: #6)
  - [x] 4.1 Mettre à jour les mocks dans `parcours-step-detail.test.tsx`
  - [x] 4.2 19 tests passent (refonte + nouveaux états)
  - [x] 4.3 Tests ajoutés : pending_review, tab switching, config par statut

- [x] Task 5 — Navigation ajustée (AC: #4)
  - [x] 5.1 StepNavigationButtons conservé en bas de la colonne gauche
  - [x] 5.2 Lien "Voir ma soumission" pour status 'completed' / 'skipped' via stepStatusConfig

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

- `packages/modules/parcours/components/parcours-step-detail.tsx` — MODIFIÉ
- `packages/modules/parcours/components/parcours-step-detail.test.tsx` — MODIFIÉ (19 tests)
- `packages/modules/parcours/components/step-mobile-tabs.tsx` — CRÉÉ
- `packages/modules/parcours/components/step-mobile-tabs.test.tsx` — CRÉÉ (7 tests)
- `packages/modules/parcours/components/step-history-panel.tsx` — MODIFIÉ (prop className)
- `packages/modules/parcours/components/step-history-panel.test.tsx` — MODIFIÉ (fix mock utils)

## Completion Notes

- Commit : `42bef4e` — 30 tests, 6 fichiers, +317/-129 lignes
- `stepStatusConfig` : mapping locked/current/pending_review/completed/skipped
- `StepHistoryPanel` reçoit `className` pour override visibility mobile
- ARIA complet sur `StepMobileTabs` : role tablist, tab, aria-selected
- `MobileTab` type exporté depuis `step-mobile-tabs.tsx`
