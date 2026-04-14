# Project Context — MonprojetPro Dash

> **Ce fichier est la source de vérité pour tout agent IA qui implémente du code.**
> Charger ce fichier AVANT chaque story. En cas de conflit avec un autre document, ce fichier prévaut.

## Stack & Versions

| Package | Version | Usage |
|---------|---------|-------|
| Next.js | ^16.1.x | Framework (App Router) |
| React | ^19.x | UI |
| TypeScript | strict mode, pas de `any` | Typage |
| Tailwind CSS | ^4.x | Styling (OKLCH variables) |
| Turborepo | ^2.8.x | Monorepo build |
| @supabase/supabase-js | ^2.95.x | Client DB/Auth/Storage/Realtime |
| @supabase/ssr | latest | Auth SSR cookies/sessions |
| @tanstack/react-query | ^5.90.x | Cache & data fetching |
| zustand | ^5.0.x | État UI uniquement |
| react-hook-form | ^7.71.x | Formulaires |
| @hookform/resolvers | latest | Intégration Zod |
| zod | existant | Validation client + serveur |

## Architecture — Règles absolues

### Monorepo Structure

```
monprojetpro-dash/
├── apps/hub/          # MonprojetPro-Hub (opérateur MiKL)
├── apps/client/       # MonprojetPro-Client (dashboard unifié Lab+One)
├── packages/ui/       # @monprojetpro/ui — Design system (shadcn/Radix)
├── packages/supabase/ # @monprojetpro/supabase — Client + providers partagés
├── packages/utils/    # @monprojetpro/utils — Utilitaires + module-registry
├── packages/types/    # @monprojetpro/types — Types partagés + database.types.ts
├── packages/tsconfig/ # @monprojetpro/tsconfig — Configs TypeScript
├── packages/modules/  # CATALOGUE DE MODULES (plug & play)
├── supabase/          # Migrations + seed + config
├── docker/            # Services self-hosted (OpenVidu, Cal.com)
└── tests/             # Tests cross-app (RLS, contracts, e2e)
```

### 3 Piliers — Non négociables

1. **Multi-tenancy natif** — Une seule instance de code pour tous les clients. Isolation par RLS (client_id + operator_id). Table `operators` pour future commercialisation du Hub.
2. **Catalogue modules plug & play** — Chaque module dans `packages/modules/[nom]/` avec un `manifest.ts` qui respecte le contrat `ModuleManifest`.
3. **Configuration-driven** — La table `client_config` détermine ce que chaque client voit. Pas de code conditionnel par client.

### Routes Apps = Coquilles vides

Les routes dans `apps/hub/` et `apps/client/` ne contiennent AUCUNE logique métier. Elles :
1. Vérifient l'auth (middleware)
2. Chargent la config client
3. Appellent le module registry pour charger le bon module
4. Fournissent le layout (dashboard shell)

**Toute la logique métier vit dans les modules** (`packages/modules/`).

## Data Fetching — 3 patterns, pas plus

| Pattern | Usage | Exemple |
|---------|-------|---------|
| **Server Component** | Lecture initiale | Page qui affiche la liste des clients |
| **Server Action** | Mutation utilisateur | Créer un client, envoyer un message |
| **API Route** | Callback externe uniquement | `/api/webhooks/cal-com`, `/api/webhooks/stripe` |

Aucun cas gris autorisé. Pas de `fetch()` côté client. Pas d'API Route pour des mutations internes.

## State Management — Séparation stricte

| Donnée | Outil | Jamais dans |
|--------|-------|-------------|
| Données serveur (clients, messages, config) | TanStack Query | Zustand |
| Données temps réel (nouveaux messages) | Realtime → `queryClient.invalidateQueries()` | State local |
| État UI (sidebar, préférences, onglets) | Zustand (persist si nécessaire) | TanStack Query |
| État formulaire | React Hook Form | Zustand ou TanStack Query |

**Règle Realtime :** Supabase Realtime invalide le cache TanStack Query. Pas de sync manuelle. `Realtime → invalidateQueries()`, point final.

## Naming Conventions

### Database (PostgreSQL / Supabase)
- Tables : **snake_case, pluriel** → `clients`, `client_configs`
- Colonnes : **snake_case** → `client_id`, `created_at`
- Foreign keys : **{table_singulier}_id** → `client_id`, `operator_id`
- Index : **idx_{table}_{colonnes}** → `idx_clients_operator_id`
- Policies RLS : **{table}_{action}_{role}** → `clients_select_owner`
- Fonctions SQL : **snake_case** → `is_admin()`, `is_owner()`, `is_operator()`

### API / JSON
- URLs : **kebab-case, pluriel** → `/api/webhooks/cal-com`
- JSON fields : **camelCase** → `{ clientId, activeModules, dashboardType }`
- Headers custom : **X-MonprojetPro-*** → `X-MonprojetPro-Client-Id`

### Code TypeScript / React
- Composants : **PascalCase** → `ClientDashboard`
- Fichiers : **kebab-case** → `client-dashboard.tsx`
- Fonctions/variables : **camelCase** → `getActiveModules()`
- Constantes : **UPPER_SNAKE_CASE** → `MAX_FILE_SIZE`
- Types/Interfaces : **PascalCase, pas de préfixe I** → `ClientConfig`
- Hooks : **use + PascalCase** → `useClientConfig()`
- Stores Zustand : **use + PascalCase + Store** → `useSidebarStore`
- Server Actions : **camelCase, verbe d'action** → `createClient()`

### Transformation DB ↔ API
Les données DB (snake_case) sont transformées en camelCase à la frontière via `toCamelCase()` / `toSnakeCase()` de `@monprojetpro/utils`.

## Module Structure — Contrat obligatoire

Chaque module dans `packages/modules/[nom]/` :

```
packages/modules/[nom]/
├── index.ts          # Barrel export (manifest + composants publics)
├── manifest.ts       # ModuleManifest — PREMIER fichier à créer
├── components/       # Composants React
│   └── *.test.ts     # Tests CO-LOCALISÉS (à côté du fichier source)
├── hooks/            # Hooks spécifiques
├── actions/          # Server Actions (mutations)
├── types/            # Types spécifiques
└── utils/            # Utilitaires internes
```

**Règles modules :**
- `manifest.ts` est le PREMIER fichier à créer
- Tests co-localisés `*.test.ts` à côté du source — jamais de dossier `__tests__/`
- Un module ne peut PAS importer un autre module directement
- Communication inter-modules via Supabase (données) ou Realtime (événements)

## API Response Format — Unique

```typescript
type ActionResponse<T> = {
  data: T | null
  error: ActionError | null
}

type ActionError = {
  message: string    // Message user-facing
  code: string       // 'VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED', etc.
  details?: unknown  // Dev only, jamais exposé en prod
}
```

**Jamais de `throw` dans les Server Actions.** Toujours retourner `{ data, error }`.

## Auth — Triple couche

1. **RLS Supabase** (données) — même si le front bug, la DB protège
2. **Middleware Next.js** (routes) — `hub/middleware.ts` vérifie admin+2FA, `client/middleware.ts` vérifie client_id+config
3. **UI** (composants) — masquer les éléments non autorisés

Fonctions SQL réutilisables : `is_admin()`, `is_owner()`, `is_operator()`.

## Error Handling — 3 niveaux

1. **Error boundary par module** (`error.tsx`) — si un module crash, les autres restent
2. **Pattern `{ data, error }`** dans toutes les Server Actions
3. **Toast notifications** pour les erreurs user-facing via `@monprojetpro/ui`

Logging : `[MODULE:ACTION] message` (ex: `[CHAT:SEND] Failed to send message`)

## Loading States — Skeleton loaders partout

- Chaque route module a un `loading.tsx` avec skeleton
- `(dashboard)/loading.tsx` pour le shell complet
- TanStack Query gère `isPending` / `isFetching` — pas de state booléen custom
- Jamais de spinner, toujours un skeleton qui reflète la structure du module
- Prefetch intelligent des modules adjacents dans la nav

## Tests — Obligatoires

| Type | Outil | Localisation | CI |
|------|-------|-------------|-----|
| Unitaires | Vitest | Co-localisés `*.test.ts` | Bloquant |
| RLS isolation | Vitest + Supabase | `tests/rls/` | Bloquant |
| Contract modules | Vitest | `tests/contracts/` | Bloquant |
| E2E | Playwright | `tests/e2e/` | Bloquant |

**Test RLS obligatoire** pour chaque nouvelle table : un test qui tente d'accéder aux données client B en étant authentifié client A. Si ça passe → build cassé.

**Contract test** : chaque module a un manifest valide, les `requiredTables` existent dans les migrations.

## Anti-Patterns — Interdit

- Stocker des données serveur dans Zustand
- Utiliser `fetch()` côté client pour des données Supabase
- Créer des API Routes pour des mutations internes (utiliser Server Actions)
- Mettre de la logique métier dans les routes apps (ça va dans les modules)
- Importer un module directement depuis un autre module
- Utiliser `any` ou `as` sans justification documentée
- Créer un module sans `manifest.ts`
- Mettre les tests dans un dossier `__tests__/` séparé
- Sync manuelle entre Realtime et le state (toujours invalidateQueries)
- `throw` dans les Server Actions (toujours retourner `{ data, error }`)
- Hardcoder des modules dans le registry (auto-découverte)
- `console.log` pour les erreurs (utiliser le format `[MODULE:ACTION]`)

## Themes & Palettes

3 palettes CSS OKLCH dans `@monprojetpro/ui/src/themes/` :
- **Hub** : Bordeaux `#6B1B1B` (density: compact)
- **Lab** : Vert émeraude `#2E8B57` (density: spacious)
- **One** : Orange `#F7931E` (density: comfortable)

Pas de code conditionnel pour les couleurs — override CSS variables uniquement.

## Services Externes

| Service | Usage | Intégration |
|---------|-------|-------------|
| Supabase | DB, Auth, Storage, Realtime | Direct via @monprojetpro/supabase |
| OpenVidu | Visio | Server Actions + webhooks |
| Pennylane | Facturation, devis, abonnements, comptabilité | Server Actions proxy API v2 + Edge Function polling (cron 5min) |
| Cal.com | Prise de RDV | Webhook entrant |
| OpenAI Whisper | Transcription | Edge Function post-recording |
| Stripe | Paiements CB | Connecté à Pennylane (réconciliation gérée par Pennylane) |

Services self-hosted (VPS Docker Compose) : OpenVidu, Cal.com.
Service SaaS : Pennylane (facturation/compta — conformité facturation électronique sept. 2026).
Pennylane n'a pas de webhooks publics → synchronisation par polling intelligent (Edge Function cron 5min → table miroir `billing_sync` → Supabase Realtime → invalidation TanStack Query).

---

*Généré le 06/02/2026 depuis architecture.md (Steps 1-8)*
*Mettre à jour ce fichier lors de tout changement de règle architecturale.*
