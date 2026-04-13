# MonprojetPro One - Architecture Technique

> Documentation générée le 2026-01-20 par BMM Document Project Workflow

## Vue d'ensemble architecturale

MonprojetPro One utilise une **architecture monorepo modulaire** basée sur Turborepo, permettant :

- **Isolation des modules** : Chaque app est indépendante
- **Partage de code** : Packages communs (ui, utils, tsconfig)
- **Build optimisé** : Caching intelligent et parallélisation
- **Scalabilité** : Ajout facile de nouveaux modules

```
┌─────────────────────────────────────────────────────────────┐
│                      FOXEO ONE                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│   │  apps/brief │   │  apps/???   │   │  apps/???   │       │
│   │  (Next.js)  │   │  (future)   │   │  (future)   │       │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘       │
│          │                 │                 │               │
│          └─────────────────┴─────────────────┘               │
│                            │                                 │
│   ┌────────────────────────┴────────────────────────┐       │
│   │                 PACKAGES PARTAGÉS                │       │
│   ├─────────────┬─────────────┬─────────────────────┤       │
│   │  @monprojetpro/ui  │@monprojetpro/utils │ @monprojetpro/tsconfig     │       │
│   │ (Radix UI)  │ (helpers)   │ (TypeScript)        │       │
│   └─────────────┴─────────────┴─────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Architecture du Module Brief

### Pattern architectural : Layered + Component-Based

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  app/                 components/                        ││
│  │  ├── page.tsx         ├── brief/                        ││
│  │  ├── nouveau/         │   ├── BriefPanel.tsx            ││
│  │  │   ├── page.tsx     │   ├── BriefElementCard.tsx      ││
│  │  │   ├── guide/       │   └── ...                       ││
│  │  │   └── analyse/     ├── dashboard/                    ││
│  │  ├── historique/      ├── layout/                       ││
│  │  └── settings/        └── settings/                     ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                     STATE LAYER                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  contexts/BriefContext.tsx                               ││
│  │  - currentBrief, briefs[], settings                      ││
│  │  - CRUD operations, AI interactions                      ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                    SERVICE LAYER                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │  lib/api/    │ │ lib/scoring/ │ │ lib/export/  │         │
│  │  - client.ts │ │ - calculate  │ │ - formatBrief│         │
│  │  - helpers   │ │   Score.ts   │ │   .ts        │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                    PROVIDER LAYER (Server)                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  lib/providers/                                          ││
│  │  ├── index.ts      # Factory + Registry                  ││
│  │  ├── claude.ts     # Anthropic SDK                       ││
│  │  ├── openai.ts     # OpenAI SDK                          ││
│  │  ├── gemini.ts     # Google AI SDK                       ││
│  │  └── types.ts      # Interfaces communes                 ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                   PERSISTENCE LAYER                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  lib/storage/                                            ││
│  │  ├── briefs.ts     # CRUD briefs (localStorage)          ││
│  │  └── settings.ts   # User settings (localStorage)        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Gestion d'état

### React Context Pattern

```typescript
// contexts/BriefContext.tsx
BriefProvider
├── State
│   ├── currentBrief: Brief | null
│   ├── briefs: Brief[]
│   └── isLoading: boolean
│
├── Actions
│   ├── createBrief(input)
│   ├── updateBrief(id, updates)
│   ├── deleteBrief(id)
│   ├── selectBrief(id)
│   └── analyzeBrief(content)
│
└── Effects
    └── Sync with localStorage on changes
```

### Hooks personnalisés

| Hook | Fichier | Usage |
|------|---------|-------|
| `useBriefContext` | contexts/ | Accès au contexte Brief |
| `useBriefs` | hooks/ | Opérations CRUD briefs |
| `useAIApi` | hooks/ | Appels API IA |
| `useAIAvailability` | hooks/ | État des providers |
| `useAutoSave` | hooks/ | Sauvegarde automatique |
| `useSettings` | hooks/ | Paramètres utilisateur |
| `useDebouncedValue` | hooks/ | Debounce de valeurs |
| `useMobile` | @monprojetpro/ui | Détection mobile |

## Architecture AI Providers

### Factory Pattern

```typescript
// lib/providers/index.ts

interface AIProviderService {
  analyze(content: string): Promise<AnalysisResult>;
  evaluate(brief: Brief): Promise<EvaluationResult>;
  generateQuestions(context: string): Promise<string[]>;
}

// Usage
const provider = getProvider('claude'); // ou 'openai', 'gemini'
const result = await provider.analyze(content);
```

### Flux de données AI

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────┐
│ Client  │───▶│ API Route   │───▶│ Provider    │───▶│ AI API  │
│ (React) │    │ (Next.js)   │    │ (Factory)   │    │ (Cloud) │
└─────────┘    └─────────────┘    └─────────────┘    └─────────┘
                     │
                     ▼
              ┌─────────────┐
              │ Validation  │
              │ (Zod)       │
              └─────────────┘
```

## Modèle de données

### Brief (entité principale)

```typescript
interface Brief {
  id: string;                    // UUID
  title: string;
  createdAt: string;             // ISO 8601
  updatedAt: string;
  status: BriefStatus;           // 'incomplete' | 'needs-work' | 'ready' | 'optimal'
  mode: BriefMode;               // 'guided' | 'analysis'
  elements: BriefElements;
  rawContent?: string;           // Mode analyse uniquement
  followUpQuestions?: string[];
  clientName?: string;
  companyName?: string;
}

interface BriefElements {
  problem: BriefElement;         // Requis
  target: BriefElement;          // Requis
  solution: BriefElement;        // Requis
  differentiator: BriefElement;  // Optionnel
}

interface BriefElement {
  content: string;
  status: ElementStatus;         // 'missing' | 'vague' | 'clear'
  suggestion?: string;           // Suggestion IA si vague
}
```

### Scoring BMAD

```
Status        Condition                              Icône
─────────────────────────────────────────────────────────────
incomplete    Problème, Cible OU Solution manquant   🔴
needs-work    Les 3 présents mais au moins 1 vague   🟠
ready         Problème, Cible, Solution tous clairs  🟢
optimal       + Différenciant clair                  ⭐
```

## Architecture des packages partagés

### @monprojetpro/ui

```typescript
// Composants exportés (14)
export {
  Alert,
  AlertDialog,
  Badge,
  Button,
  Card,
  Dialog,
  Input,
  Select,
  Separator,
  Sheet,
  Sidebar,
  Skeleton,
  Tabs,
  Textarea,
  Tooltip,
  useMobile,  // Hook
}
```

### @monprojetpro/utils

```typescript
// Utilitaires exportés
export {
  cn,                 // Merge classnames (clsx + tailwind-merge)
  formatDate,         // Format date complet
  formatShortDate,    // Format date court
  formatRelativeDate, // Format relatif (il y a 2h)
}
```

## Configuration et environnement

### Variables d'environnement (Brief)

```env
# AI Providers (au moins 1 requis)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
```

### Scripts disponibles

```bash
# Racine
npm run dev           # Tous les modules
npm run brief         # Module Brief uniquement
npm run build         # Build production
npm run lint          # Lint tous les modules
npm run clean         # Nettoyer les builds

# Dans apps/brief
npm run dev           # Dev sur port 3001
npm run build         # Build Next.js
npm run lint          # ESLint
```

## Conventions de code

### Structure des fichiers

```
composants/
├── ComponentName.tsx        # Composant principal
├── ComponentName.test.tsx   # Tests (optionnel)
└── index.ts                 # Barrel export
```

### Patterns utilisés

1. **Barrel exports** : Chaque dossier a un `index.ts`
2. **Colocation** : Tests à côté des fichiers source
3. **Types séparés** : Dossier `types/` avec schemas Zod
4. **Server/Client split** : Providers côté serveur uniquement

## Sécurité

### Points d'attention

- **API Keys** : Stockées en variables d'environnement côté serveur
- **Validation** : Tous les inputs validés avec Zod
- **CORS** : Géré par Next.js (API Routes)
- **localStorage** : Données briefs non sensibles uniquement

## Performance

### Optimisations Turborepo

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],    // Build packages d'abord
      "outputs": [".next/**"]     // Cache intelligent
    }
  }
}
```

### Stratégies Next.js

- **App Router** : Streaming et Server Components
- **Font optimization** : Google Fonts optimisées (Geist)
- **Code splitting** : Automatique par route

## Modèle de déploiement (Mise à jour 13/04/2026 — ADR-01 Révision 2)

> **Clarification majeure** : Il n'y a que **deux déploiements en fonctionnement normal** — le Hub pour MiKL, et une **app client multi-tenant unique** pour TOUS les clients. Les instances dédiées par client **n'existent pas** pendant l'abonnement ; elles ne sont créées qu'à la sortie via le kit de sortie (Story 13.1, Epic 13).

- **Hub MiKL** (`apps/hub`) : déploiement unique standalone sur `hub.monprojet-pro.com` (Vercel + Supabase dédiés côté opérateur)
- **App Client** (`apps/client`) : **un seul déploiement multi-tenant** sur `app.monprojet-pro.com` (un seul Vercel, un seul Supabase) qui sert TOUS les clients, qu'ils soient en Mode Lab ou en Mode One. L'isolation entre clients est assurée par **RLS sur `client_id`** — pas de sous-domaine par client, pas de base dédiée, pas de build dédié
- **Graduation Lab → One** : un simple `UPDATE` sur `client_configs` (`dashboard_type: 'lab' → 'one'`, `lab_mode_available = true`, `elio_lab_enabled = false`). **Aucun provisioning, aucune migration cross-DB, aucun redéploiement.** Le shell détecte le flag et expose le toggle Lab/One
- **Toggle Mode Lab / Mode One** : bascule côté UI dans le même déploiement (routing client, pas de rechargement de page)
- **Pas d'instance per-client en production** : tant que le client est abonné, il partage l'infrastructure mutualisée avec tous les autres clients

Références :
- `_bmad-output/planning-artifacts/architecture/adr-01-lab-one-coexistence-same-instance.md` (Révision 2)
- Story 13.1 (kit de sortie, Epic 13 à créer) — seul scénario où une instance dédiée est produite

## Module Lab — Tree-shakable uniquement pour le kit de sortie (ADR-02 Révision 2)

> **Important** : le tree-shaking Lab + agents n'est **pas** un build parallèle qui tourne en production. Il n'est déclenché **qu'une seule fois**, à la sortie d'un client, par le **kit de sortie** (Story 13.1, Epic 13 à créer). En fonctionnement normal, l'app client multi-tenant `app.monprojet-pro.com` est compilée **une seule fois** avec Lab + agents actifs.

- **Guards de build-time** : les imports du module Lab, d'Élio Lab, d'Élio One et du SDK Claude sont conditionnés par les flags `NEXT_PUBLIC_ENABLE_LAB_MODULE` et `NEXT_PUBLIC_ENABLE_AGENTS`. Ces flags restent à `true` pour le build de production `app.monprojet-pro.com`
- **Cible de build unique en production** : `app.monprojet-pro.com` utilise la cible complète (Lab + agents actifs, toggle Lab/One visible pour les clients gradués). Il n'existe **pas** de variante `standalone` servie aux clients actifs
- **Cible `standalone` — uniquement via le kit de sortie** : lorsqu'un client résilie son abonnement, MiKL lance le **kit de sortie** (Story 13.1) qui :
  1. Provisionne un nouveau projet Vercel, un repo GitHub et un projet Supabase **dédiés au client sortant** (via les API respectives)
  2. Exporte les données du client (RLS-filtered) vers la nouvelle Supabase
  3. Compile un build `standalone` avec `NEXT_PUBLIC_ENABLE_LAB_MODULE=false` + `NEXT_PUBLIC_ENABLE_AGENTS=false` (dead code elimination de Lab + agents + SDK Claude)
  4. Push le build sur le repo GitHub dédié et connecte Vercel au repo
  5. Livre au client un bundle credentials (Vercel, GitHub, Supabase) + email draft, avec transfert de propriété en 1 clic
- **Effet** : le client sortant récupère un outil métier One pur, self-hostable, sans dépendance aux services IA de MonprojetPro ni à l'agent Élio. Cette opération est **ponctuelle et one-shot** — elle ne concerne que les clients qui quittent la plateforme
- **Données** : l'export DB inclut l'intégralité des données (y compris historique Lab) ; la version standalone n'expose aucune UI pour les consulter, elles restent pour audit et continuité

Références :
- `_bmad-output/planning-artifacts/architecture/adr-02-lab-module-tree-shakable-export.md` (Révision 2)
- Story 13.1 (kit de sortie, Epic 13 à créer) — unique déclencheur du tree-shaking
