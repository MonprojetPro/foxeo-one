# Implementation Patterns & Consistency Rules

[< Retour à l'index](./index.md) | [< Section précédente](./03-core-decisions.md) | [Section suivante >](./05-project-structure.md)

---

_Patterns définis pour garantir la cohérence entre agents IA travaillant sur le projet. Chaque agent DOIT respecter ces conventions sans exception._

### Points de conflit identifiés

**32 points de conflit potentiel** répartis en 5 catégories : Nommage (12), Structure (6), Format (5), Communication (5), Processus (4). Chaque point est résolu ci-dessous avec une convention unique et des exemples concrets.

### Naming Patterns

#### Database Naming (PostgreSQL / Supabase)

| Élément | Convention | Exemple |
|---------|-----------|---------|
| **Tables** | snake_case, pluriel | `clients`, `client_configs`, `module_manifests` |
| **Colonnes** | snake_case | `client_id`, `created_at`, `operator_id`, `dashboard_type` |
| **Foreign keys** | `{table_singulier}_id` | `client_id`, `operator_id`, `module_id` |
| **Index** | `idx_{table}_{colonnes}` | `idx_clients_operator_id`, `idx_messages_client_id_created_at` |
| **Policies RLS** | `{table}_{action}_{role}` | `clients_select_owner`, `messages_insert_authenticated` |
| **Fonctions SQL** | snake_case, préfixe `fn_` pour utilitaires | `is_admin()`, `is_owner()`, `is_operator()`, `fn_get_active_modules()` |
| **Enums** | snake_case | `dashboard_type`, `elio_tier`, `notification_type` |
| **Triggers** | `trg_{table}_{event}` | `trg_clients_updated_at`, `trg_messages_notify` |

```sql
-- ✅ BON
CREATE TABLE client_configs (
  client_id UUID PRIMARY KEY REFERENCES clients(id),
  operator_id UUID REFERENCES operators(id),
  active_modules TEXT[] DEFAULT ARRAY['core-dashboard'],
  dashboard_type TEXT DEFAULT 'one',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ❌ MAUVAIS
CREATE TABLE ClientConfig (
  clientId UUID,
  ActiveModules TEXT[],
  DashboardType TEXT
);
```

#### API Naming (Next.js Routes)

| Élément | Convention | Exemple |
|---------|-----------|---------|
| **URL paths** | kebab-case, pluriel | `/api/webhooks/cal-com`, `/api/modules/chat` |
| **Route params** | camelCase dans le code, kebab-case dans l'URL | `[clientId]` → `/clients/abc-123` |
| **Query params** | camelCase | `?pageSize=20&sortBy=createdAt` |
| **JSON request/response** | camelCase | `{ clientId, activeModules, dashboardType }` |
| **Headers custom** | `X-MonprojetPro-*` | `X-MonprojetPro-Client-Id`, `X-MonprojetPro-Operator-Id` |

**Transformation DB ↔ API :** Les données DB (snake_case) sont transformées en camelCase au niveau du service/query. Un helper `toCamelCase` / `toSnakeCase` dans `@monprojetpro/utils` gère cette conversion.

```typescript
// ✅ BON — Server Action
export async function updateClientModules(clientId: string, modules: string[]) {
  const { data, error } = await supabase
    .from('client_configs')
    .update({ active_modules: modules })  // snake_case vers DB
    .eq('client_id', clientId)
    .select()
    .single()

  return { data: toCamelCase(data), error }  // camelCase vers client
}

// ❌ MAUVAIS
export async function update_client_modules(client_id: string) { ... }
```

#### Code Naming (TypeScript / React)

| Élément | Convention | Exemple |
|---------|-----------|---------|
| **Composants React** | PascalCase | `ClientDashboard`, `ModuleLoader`, `ElioChat` |
| **Fichiers composants** | kebab-case `.tsx` | `client-dashboard.tsx`, `module-loader.tsx` |
| **Fichiers utilitaires** | kebab-case `.ts` | `format-date.ts`, `module-registry.ts` |
| **Fonctions** | camelCase | `getActiveModules()`, `formatRelativeDate()` |
| **Variables** | camelCase | `clientConfig`, `activeModules`, `isLoading` |
| **Constantes** | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_MODULES`, `ELIO_RATE_LIMIT` |
| **Types/Interfaces** | PascalCase, pas de préfixe `I` | `ClientConfig`, `ModuleManifest`, `ElioMessage` |
| **Enums TS** | PascalCase + PascalCase members | `DashboardType.Lab`, `ElioTier.OnePlus` |
| **Hooks custom** | `use` + PascalCase | `useClientConfig()`, `useModuleRegistry()`, `useElioChat()` |
| **Server Actions** | camelCase, verbe d'action | `createClient()`, `updateModules()`, `sendMessage()` |
| **Stores Zustand** | `use` + PascalCase + `Store` | `useSidebarStore`, `usePreferencesStore` |

```typescript
// ✅ BON
interface ModuleManifest {
  id: string
  name: string
  version: string
  navigation: ModuleNavigation
  targets: DashboardTarget[]
}

function useModuleRegistry() {
  const activeModules = useClientConfig().activeModules
  // ...
}

// ❌ MAUVAIS
interface IModuleManifest { ... }  // pas de préfixe I
function UseModuleRegistry() { ... }  // hooks en camelCase
const module_registry = ...  // pas de snake_case en TS
```

#### File & Directory Naming

| Élément | Convention | Exemple |
|---------|-----------|---------|
| **Dossiers** | kebab-case | `core-dashboard/`, `parcours-lab/`, `validation-hub/` |
| **Pages Next.js** | `page.tsx` (convention App Router) | `app/(dashboard)/modules/chat/page.tsx` |
| **Layouts** | `layout.tsx` | `app/(dashboard)/layout.tsx` |
| **Loading** | `loading.tsx` | `app/(dashboard)/modules/[moduleId]/loading.tsx` |
| **Error** | `error.tsx` | `app/(dashboard)/modules/[moduleId]/error.tsx` |
| **Server Actions** | `actions.ts` dans le dossier route | `app/(dashboard)/clients/actions.ts` |
| **Barrel exports** | `index.ts` | `packages/modules/chat/index.ts` |

### Structure Patterns

#### Organisation des modules (packages/modules/[nom]/)

Chaque module respecte la même structure interne :

```
packages/modules/chat/
├── index.ts                  # Barrel export : manifest + composants publics
├── manifest.ts               # ModuleManifest du module
├── docs/                     # Documentation livrable (OBLIGATOIRE — vérifié en CI)
│   ├── guide.md              # Guide utilisateur pas-à-pas
│   ├── faq.md                # Questions fréquentes
│   └── flows.md              # Diagrammes de flux / parcours utilisateur
├── components/               # Composants React du module
│   ├── chat-window.tsx
│   ├── chat-message.tsx
│   ├── chat-input.tsx
│   └── chat-window.test.ts   # ← Co-localisé
├── hooks/                    # Hooks spécifiques au module
│   ├── use-chat-messages.ts
│   └── use-chat-messages.test.ts
├── actions/                  # Server Actions du module
│   ├── send-message.ts
│   └── send-message.test.ts
├── types/                    # Types spécifiques au module
│   └── chat.types.ts
└── utils/                    # Utilitaires internes au module
    └── format-message.ts
```

**Règles structurelles :**

- **Tests co-localisés** : `*.test.ts` à côté du fichier source, jamais dans un dossier `__tests__/` séparé
- **Organisation par feature** au sein du module, pas par type technique
- **Un barrel export** (`index.ts`) par module qui expose uniquement l'API publique
- **Pas de dépendances circulaires** entre modules — un module peut dépendre de `@monprojetpro/ui` et `@monprojetpro/utils`, jamais d'un autre module directement (passer par events)

#### Organisation des apps (apps/hub/ et apps/client/)

```
apps/client/
├── app/
│   ├── (auth)/               # Routes non-authentifiées
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/          # Routes authentifiées (shell dashboard)
│   │   ├── layout.tsx        # Dashboard shell avec sidebar dynamique
│   │   ├── page.tsx          # Page d'accueil dashboard
│   │   └── modules/
│   │       └── [moduleId]/   # Route dynamique — charge le module via registry
│   │           ├── page.tsx
│   │           ├── loading.tsx  # Skeleton loader du module
│   │           └── error.tsx    # Error boundary du module
│   ├── api/
│   │   └── webhooks/         # Uniquement callbacks externes
│   │       ├── cal-com/route.ts
│   │       └── stripe/route.ts
│   ├── layout.tsx            # Root layout (providers)
│   └── globals.css
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Client Supabase browser
│   │   ├── server.ts         # Client Supabase server
│   │   └── middleware.ts     # Helper auth middleware
│   ├── providers/
│   │   ├── query-provider.tsx    # TanStack Query provider
│   │   ├── realtime-provider.tsx # Supabase Realtime provider
│   │   └── theme-provider.tsx    # Thème OKLCH
│   └── module-registry.ts   # Registry auto-découvert des modules
├── middleware.ts             # Auth middleware Next.js
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Format Patterns

#### API Response Format

**Convention unique** : Style Supabase `{ data, error }` partout.

```typescript
// Type de retour standard pour TOUTES les actions/API
type ActionResponse<T> = {
  data: T | null
  error: ActionError | null
}

type ActionError = {
  message: string        // Message user-facing (traduit)
  code: string           // Code machine : 'VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED', etc.
  details?: unknown      // Détails techniques (dev only, jamais exposé en prod)
}
```

```typescript
// ✅ BON — Server Action
export async function createClient(formData: CreateClientInput): Promise<ActionResponse<Client>> {
  const validation = createClientSchema.safeParse(formData)
  if (!validation.success) {
    return { data: null, error: { message: 'Données invalides', code: 'VALIDATION_ERROR', details: validation.error } }
  }

  const { data, error } = await supabase.from('clients').insert(validation.data).select().single()
  if (error) {
    return { data: null, error: { message: 'Erreur lors de la création du client', code: 'DB_ERROR' } }
  }

  return { data: toCamelCase(data), error: null }
}

// ❌ MAUVAIS — throw Error
export async function createClient(formData: any) {
  throw new Error('Something went wrong')  // Jamais de throw dans les Server Actions
}
```

#### Data Formats

| Format | Convention | Exemple |
|--------|-----------|---------|
| **Dates JSON** | ISO 8601 string | `"2026-02-06T14:30:00.000Z"` |
| **Dates affichage** | `formatRelativeDate()` de `@monprojetpro/utils` | `"il y a 2 heures"`, `"hier"` |
| **Dates DB** | `TIMESTAMP WITH TIME ZONE` | PostgreSQL gère le timezone |
| **Booleans** | `true` / `false` natifs | Jamais `1` / `0`, jamais `"true"` |
| **Null** | `null` explicite, jamais `undefined` en JSON | `{ data: null, error: null }` |
| **IDs** | UUID v4 (généré par Supabase) | `"550e8400-e29b-41d4-a716-446655440000"` |
| **Montants** | Centimes (integer) côté DB, formaté côté UI | DB: `2500` → UI: `"25,00 €"` |
| **JSON camelCase** | camelCase dans les réponses API/JSON | `{ clientId, activeModules, dashboardType }` |

### Communication Patterns

#### Event System (Supabase Realtime)

**Convention de nommage des channels :**

```typescript
// Format : {scope}:{entity}:{id?}
const CHANNEL_PATTERNS = {
  // Notifications client
  clientNotifications: (clientId: string) => `client:notifications:${clientId}`,
  // Chat entre MiKL et client
  chatRoom: (clientId: string) => `chat:room:${clientId}`,
  // Présence (qui est en ligne)
  presence: (operatorId: string) => `presence:operator:${operatorId}`,
  // Mises à jour config client
  clientConfig: (clientId: string) => `client:config:${clientId}`,
} as const
```

**Convention d'événements DB (Realtime Postgres Changes) :**

```typescript
// Écouter les changements sur une table pour un client
supabase
  .channel(CHANNEL_PATTERNS.clientNotifications(clientId))
  .on('postgres_changes', {
    event: 'INSERT',           // 'INSERT' | 'UPDATE' | 'DELETE' | '*'
    schema: 'public',
    table: 'notifications',
    filter: `client_id=eq.${clientId}`,
  }, (payload) => {
    // RÈGLE : Invalider le cache TanStack Query, pas de state local
    queryClient.invalidateQueries({ queryKey: ['notifications', clientId] })
  })
  .subscribe()
```

**Règle absolue :** Realtime → `queryClient.invalidateQueries()`. Pas de store Zustand pour les données serveur. Pas de sync manuelle. TanStack Query est la single source of truth pour les données serveur.

#### State Management (Zustand)

**Zustand = état UI uniquement.** Jamais de données serveur dans Zustand.

```typescript
// ✅ BON — État UI dans Zustand
// stores/use-sidebar-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  isCollapsed: boolean
  activeSection: string | null
  toggleCollapse: () => void
  setActiveSection: (section: string | null) => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      activeSection: null,
      toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setActiveSection: (section) => set({ activeSection: section }),
    }),
    { name: 'sidebar-preferences' }
  )
)

// ❌ MAUVAIS — Données serveur dans Zustand
export const useClientStore = create((set) => ({
  clients: [],  // NON — utiliser TanStack Query
  fetchClients: async () => { ... }  // NON — utiliser Server Component ou Query
}))
```

**Séparation des responsabilités :**

| Donnée | Source | Outil |
|--------|--------|-------|
| Données serveur (clients, messages, config) | Supabase | TanStack Query (cache + revalidation) |
| Données temps réel (nouveaux messages) | Supabase Realtime | Invalidation TanStack Query |
| État UI (sidebar, préférences, onglets) | Local | Zustand (avec persist si nécessaire) |
| État formulaire | Local au composant | React Hook Form |

### Process Patterns

#### Error Handling

**3 niveaux de gestion d'erreur :**

1. **Error Boundary par module** (`error.tsx` dans chaque route module) — si un module crash, les autres restent fonctionnels
2. **Pattern `{ data, error }`** dans toutes les Server Actions — jamais de `throw`, toujours un retour typé
3. **Toast notifications** pour les erreurs user-facing — via `@monprojetpro/ui` toast component

```typescript
// Pattern d'utilisation dans un composant
'use client'
import { toast } from '@monprojetpro/ui'

function ClientForm() {
  async function handleSubmit(data: FormData) {
    const result = await createClient(data)
    if (result.error) {
      toast.error(result.error.message)  // Message user-facing
      return
    }
    toast.success('Client créé avec succès')
    router.push(`/clients/${result.data.id}`)
  }
}
```

**Logging** : `console.error()` en dev, Sentry en production. Jamais de `console.log` pour les erreurs. Les logs suivent le format : `[MODULE:ACTION] message` (ex: `[CHAT:SEND] Failed to send message`).

#### Loading States

**Convention : Skeleton loaders partout, spinners nulle part.**

```typescript
// loading.tsx dans chaque route module — OBLIGATOIRE
// app/(dashboard)/modules/[moduleId]/loading.tsx
import { ModuleSkeleton } from '@monprojetpro/ui'

export default function ModuleLoading() {
  return <ModuleSkeleton />
}
```

**Règles loading :**

- Chaque module a un `loading.tsx` avec un skeleton qui reflète la structure du module
- TanStack Query gère les états `isLoading` / `isPending` / `isFetching` — pas de state booléen custom
- Prefetch intelligent : quand un module est visible dans la sidebar, ses données sont prefetchées en arrière-plan
- Les Server Actions utilisent `useTransition` pour l'état pending des mutations
- Skeleton loaders dans `@monprojetpro/ui` avec variantes par densité (compact/comfortable/spacious)

```typescript
// ✅ BON — TanStack Query gère le loading
function ClientList() {
  const { data, isPending, error } = useQuery({
    queryKey: ['clients', operatorId],
    queryFn: () => getClients(operatorId),
  })

  if (isPending) return <ClientListSkeleton />
  if (error) return <ErrorDisplay error={error} />
  return <ClientTable clients={data} />
}

// ❌ MAUVAIS — State loading manuel
function ClientList() {
  const [isLoading, setIsLoading] = useState(true)
  const [clients, setClients] = useState([])
  // NON — TanStack Query fait tout ça
}
```

### Enforcement Guidelines

**Tous les agents IA DOIVENT :**

1. **Vérifier le manifest** avant de créer un nouveau module — `manifest.ts` est le premier fichier à écrire
2. **Utiliser `{ data, error }`** comme type de retour pour TOUTE Server Action ou fonction asynchrone
3. **Ne jamais stocker de données serveur dans Zustand** — TanStack Query est la seule source de vérité pour les données serveur
4. **Co-localiser les tests** — `*.test.ts` à côté du fichier source, pas dans un dossier séparé
5. **Respecter les 3 patterns de data fetching** — Server Component (lecture), Server Action (mutation), API Route (externe uniquement)
6. **Ajouter un `loading.tsx`** pour chaque nouvelle route — skeleton loader, jamais de spinner
7. **Transformer snake_case ↔ camelCase** à la frontière DB/API — snake_case dans Supabase, camelCase dans TypeScript
8. **Créer un test RLS** pour chaque nouvelle table — test d'isolation inter-client Lab + test isolation instance One
9. **Rédiger la documentation** (`docs/guide.md`, `docs/faq.md`, `docs/flows.md`) pour chaque module — livrable client obligatoire
9. **Invalider le cache TanStack Query** via Realtime — pas de sync manuelle entre Realtime et le state
10. **Suivre les conventions de nommage** exactement comme documenté — pas de variantes, pas d'exceptions

**Vérification automatisée :**

- **ESLint rules** : Nommage fichiers (kebab-case), imports interdits (pas de `fetch` client direct)
- **TypeScript strict** : `strict: true`, pas de `any`, pas de `as` sauf cas documenté
- **CI check** : Contract test pour chaque module (manifest valide, exports corrects, types alignés)
- **PR review** : Vérifier la conformité aux patterns avant merge
