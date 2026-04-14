# MonprojetPro Dash

Plateforme modulaire de dashboards professionnels.

## Structure

```
monprojetpro-dash/
├── apps/                     # Applications (dashboards)
│
├── packages/
│   ├── ui/                 # Composants UI partagés (shadcn/ui)
│   ├── utils/              # Utilitaires partagés
│   └── tsconfig/           # Configurations TypeScript
│
├── turbo.json              # Configuration Turborepo
└── package.json            # Workspace root
```

## Démarrage rapide

```bash
# Installer les dépendances
npm install

# Lancer tous les modules en développement
npm run dev
```

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance tous les modules en mode développement |
| `npm run build` | Build tous les modules |
| `npm run lint` | Lint tous les modules |

## Packages partagés

### @monprojetpro/ui

Composants UI basés sur shadcn/ui et Radix UI.

```tsx
import { Button, Card, Input } from '@monprojetpro/ui'
```

### @monprojetpro/utils

Utilitaires partagés (cn, formatDate, etc.)

```tsx
import { cn, formatRelativeDate } from '@monprojetpro/utils'
```
