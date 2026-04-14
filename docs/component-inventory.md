# MonprojetPro One - Inventaire des composants

> Documentation générée le 2026-01-20 par BMM Document Project Workflow

## Packages partagés (@monprojetpro/ui)

### Composants de base

| Composant | Source | Description | Props principales |
|-----------|--------|-------------|-------------------|
| `Alert` | alert.tsx | Messages d'alerte | variant, children |
| `AlertDialog` | alert-dialog.tsx | Dialog de confirmation | open, onOpenChange |
| `Badge` | badge.tsx | Badges/labels | variant, children |
| `Button` | button.tsx | Boutons interactifs | variant, size, asChild |
| `Card` | card.tsx | Conteneur carte | children |
| `Dialog` | dialog.tsx | Modal dialog | open, onOpenChange |
| `Input` | input.tsx | Champ de saisie | type, placeholder |
| `Select` | select.tsx | Liste déroulante | value, onValueChange |
| `Separator` | separator.tsx | Ligne de séparation | orientation |
| `Sheet` | sheet.tsx | Panel latéral | side, open |
| `Sidebar` | sidebar.tsx | Navigation latérale | - |
| `Skeleton` | skeleton.tsx | Placeholder loading | className |
| `Tabs` | tabs.tsx | Onglets | value, onValueChange |
| `Textarea` | textarea.tsx | Zone de texte | rows, placeholder |
| `Tooltip` | tooltip.tsx | Info-bulle | content |

### Hooks partagés

| Hook | Fichier | Usage |
|------|---------|-------|
| `useMobile` | use-mobile.ts | Détection viewport mobile |

### Import

```tsx
import {
  Button,
  Card,
  Dialog,
  Input,
  // ... autres composants
} from '@monprojetpro/ui'

import { useMobile } from '@monprojetpro/ui'
```

---

## Composants du module Brief

### Catégorie : Brief

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `BriefActions` | BriefActions.tsx | Actions sur un brief (export, delete) |
| `BriefElementCard` | BriefElementCard.tsx | Carte d'un élément BMAD |
| `BriefList` | BriefList.tsx | Liste des briefs |
| `BriefPanel` | BriefPanel.tsx | Panel principal d'édition |
| `ClientInfoFields` | ClientInfoFields.tsx | Champs client/entreprise |
| `ClientResponseInput` | ClientResponseInput.tsx | Saisie réponse client |
| `FollowUpQuestions` | FollowUpQuestions.tsx | Questions de suivi IA |
| `StatusBadge` | StatusBadge.tsx | Badge de status BMAD |

### Catégorie : Dashboard

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `StatsRow` | StatsRow.tsx | Ligne de statistiques |

### Catégorie : Layout

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `OfflineAlert` | OfflineAlert.tsx | Alerte mode hors ligne |

### Catégorie : Settings

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `ProviderHealthCheck` | ProviderHealthCheck.tsx | Status des providers IA |
| `ProviderSelector` | ProviderSelector.tsx | Sélection du provider |

---

## Composants par page (Brief)

### Dashboard (`/`)

```
page.tsx
├── StatsRow          # Statistiques globales
├── BriefList         # Liste des briefs récents
└── Button            # Actions (nouveau brief)
```

### Création (`/nouveau`)

```
page.tsx
└── Card              # Choix du mode (guidé/analyse)
    ├── Button        # Mode Guidé
    └── Button        # Mode Analyse
```

### Mode Guidé (`/nouveau/guide`)

```
page.tsx
├── BriefPanel        # Panel d'édition
│   ├── ClientInfoFields
│   ├── BriefElementCard (x4)
│   │   └── Textarea
│   ├── StatusBadge
│   └── BriefActions
└── FollowUpQuestions # Questions de suivi
```

### Mode Analyse (`/nouveau/analyse`)

```
page.tsx
├── Textarea          # Saisie contenu brut
├── Button            # Lancer analyse
├── BriefPanel        # Résultats
│   └── BriefElementCard (x4)
└── FollowUpQuestions
```

### Historique (`/historique`)

```
page.tsx
├── BriefList         # Liste complète
│   └── Card (x n)
│       ├── StatusBadge
│       └── BriefActions
└── Button            # Nouveau brief
```

### Settings (`/settings`)

```
page.tsx
├── ProviderSelector  # Choix provider IA
├── ProviderHealthCheck # Status des APIs
└── Card              # Autres paramètres
```

---

## Design System

### Variants Button

```tsx
<Button variant="default" />   // Primaire
<Button variant="secondary" /> // Secondaire
<Button variant="outline" />   // Bordure
<Button variant="ghost" />     // Transparent
<Button variant="link" />      // Lien
<Button variant="destructive" /> // Danger
```

### Variants Badge

```tsx
<Badge variant="default" />    // Neutre
<Badge variant="secondary" />  // Secondaire
<Badge variant="destructive" /> // Erreur
<Badge variant="outline" />    // Bordure
```

### Status BMAD (couleurs)

| Status | Couleur | Classe |
|--------|---------|--------|
| incomplete | Rouge | `scoring-incomplete` |
| needs-work | Orange | `scoring-needs-work` |
| ready | Vert | `scoring-ready` |
| optimal | Or | `scoring-optimal` |

---

## Dépendances UI

### Radix UI (via @monprojetpro/ui)

- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-dialog`
- `@radix-ui/react-select`
- `@radix-ui/react-separator`
- `@radix-ui/react-slot`
- `@radix-ui/react-tabs`
- `@radix-ui/react-tooltip`

### Utilitaires UI

- `class-variance-authority` : Gestion des variants
- `lucide-react` : Icônes
- `tailwind-merge` : Merge classes Tailwind
- `clsx` : Conditional classes

---

## Patterns de composants

### Barrel exports

Chaque dossier de composants a un `index.ts` :

```tsx
// components/brief/index.ts
export { BriefActions } from './BriefActions'
export { BriefElementCard } from './BriefElementCard'
// ...
```

### Props typées avec interfaces

```tsx
interface BriefElementCardProps {
  element: BriefElement;
  elementKey: ElementKey;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function BriefElementCard({
  element,
  elementKey,
  onChange,
  disabled = false
}: BriefElementCardProps) {
  // ...
}
```

### Composition avec Radix

```tsx
// Composé à partir des primitives Radix
<Dialog>
  <DialogTrigger>...</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
    </DialogHeader>
    ...
  </DialogContent>
</Dialog>
```
