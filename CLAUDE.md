# CLAUDE.md — MonprojetPro

> ⚠️ **Rebrand (Avril 2026)** : La plateforme s'appelait autrefois "Foxeo" / "Foxio". Ces noms n'existent plus. Le produit s'appelle désormais **MonprojetPro** avec le domaine **monprojet-pro.com**. Ne jamais utiliser les anciens noms dans les URLs, docs ou commentaires.

## Project Overview

MonprojetPro is a modular SaaS B2B platform for entrepreneurs, using the "Centaure" model (AI + Human). Three dashboards: **Hub** (MiKL operator), **Lab** (client incubation), **One** (client business tool).

- **Monorepo Turborepo** with 2 apps (`hub`, `client`) + shared packages
- **Stack**: Next.js 16.1, React 19, TypeScript strict, Tailwind CSS 4, Vitest
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions)
- **Deployment**: Vercel (Hub unique, Lab multi-tenant, One instance-per-client)

## Architecture Decisions (MUST follow)

### Data Fetching — 3 patterns only, no exceptions

| Pattern | Usage | Example |
|---------|-------|---------|
| **Server Component** | Read data | RSC with `@monprojetpro/supabase` server client |
| **Server Action** | Mutations | `'use server'` functions in `actions/` |
| **API Route** | External webhooks only | `app/api/webhooks/[service]/route.ts` |

### State Management — strict separation

- **Server data** → TanStack Query v5 (`@tanstack/react-query ^5.90.x`). Single source of truth for all server data.
- **UI state only** → Zustand (`^5.0.x`). Sidebar, preferences, tabs. NEVER store server data in Zustand.
- **Forms** → React Hook Form + Zod resolver
- **Realtime** → Supabase Realtime invalidates TanStack Query cache via `queryClient.invalidateQueries()`. No manual sync.

### Auth & Security — triple layer

1. **RLS** (Supabase policies) — data protection at DB level
2. **Middleware** (Next.js) — route protection per app
3. **UI** — conditional rendering

RLS functions: `is_admin()`, `is_owner()`, `is_operator()`. Tests RLS are mandatory in CI.

### API Response Format — always `{ data, error }`

```typescript
type ActionResponse<T> = { data: T | null; error: ActionError | null }
type ActionError = { message: string; code: string; details?: unknown }
```

Never `throw` in Server Actions. Always return typed `{ data, error }`.

### Module System — plug & play

Each module lives in `packages/modules/[name]/` and exports a `ModuleManifest`. The registry auto-discovers modules — no hardcoded lists. Modules are loaded via `next/dynamic`.

A module MUST contain: `manifest.ts`, `docs/guide.md`, `docs/faq.md`, `docs/flows.md`.

Modules CANNOT import other modules directly. Inter-module communication goes through Supabase (data) or Realtime (events).

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| DB tables | snake_case, plural | `client_configs`, `module_manifests` |
| DB columns | snake_case | `client_id`, `created_at` |
| RLS policies | `{table}_{action}_{role}` | `clients_select_owner` |
| API URLs | kebab-case, plural | `/api/webhooks/cal-com` |
| JSON responses | camelCase | `{ clientId, activeModules }` |
| Components | PascalCase | `ClientDashboard` |
| Component files | kebab-case.tsx | `client-dashboard.tsx` |
| Hooks | `use` + PascalCase | `useClientConfig()` |
| Zustand stores | `use` + PascalCase + `Store` | `useSidebarStore` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase, no `I` prefix | `ClientConfig` |

**DB ↔ API boundary**: Transform snake_case to camelCase at the service layer using `toCamelCase()` / `toSnakeCase()` from `@monprojetpro/utils`.

## Project Structure

```
monprojetpro-dash/
├── apps/
│   ├── hub/                    # Hub MonprojetPro (MiKL admin) → hub.monprojet-pro.com
│   └── client/                 # Client MonprojetPro template → lab.monprojet-pro.com / {slug}.monprojet-pro.com
├── packages/
│   ├── ui/                     # @monprojetpro/ui — shadcn/ui + Radix, dashboard shell, themes
│   ├── supabase/               # @monprojetpro/supabase — client, server, middleware, realtime helpers
│   ├── utils/                  # @monprojetpro/utils — cn, dates, case-transform, validation schemas
│   ├── types/                  # @monprojetpro/types — database.types.ts (auto-generated), ModuleManifest, ActionResponse
│   ├── tsconfig/               # @monprojetpro/tsconfig
│   └── modules/                # Catalogue: core-dashboard, chat, elio, documents, visio, crm, etc.
├── supabase/                   # Migrations, seed, config
├── docker/                     # OpenVidu, Cal.com
└── tests/                      # RLS tests, contract tests, e2e (Playwright)
```

### Module internal structure

```
packages/modules/[name]/
├── index.ts              # Barrel export
├── manifest.ts           # ModuleManifest (FIRST file to create)
├── docs/                 # Documentation (mandatory, CI-checked)
│   ├── guide.md
│   ├── faq.md
│   └── flows.md
├── components/           # React components
├── hooks/                # Module-specific hooks
├── actions/              # Server Actions
├── types/                # Module-specific types
└── utils/                # Internal utilities
```

Tests are **co-located**: `*.test.ts` next to source files, never in a separate `__tests__/` folder.

## UX Design & Visual Identity

### Style: "Minimal Futuriste"

- **Dark mode** default for all dashboards (user can toggle to light)
- **Deep black** background (#020402 or similar)
- **Accent colors** differentiate each dashboard on dark base
- Clean typography, generous whitespace, subtle glow effects
- **Skeleton loaders** everywhere, never spinners

### Dashboard Themes (OKLCH + Tailwind v4 `@theme`)

| Dashboard | Accent Color | Density | Usage |
|-----------|-------------|---------|-------|
| **Hub** | Cyan/Turquoise | Compact | MiKL data-dense cockpit |
| **Lab** | Violet/Purple | Spacious | Client creative incubation |
| **One** | Green/Orange | Comfortable | Client daily business tool |

CSS theme files: `packages/ui/src/themes/{hub,lab,one}.css`
Full reference: `_bmad-output/planning-artifacts/design-system-themes.css`

### Component Library

- **Base**: shadcn/ui + Radix UI
- **Premium**: 21st.dev (case-by-case approval)
- **Dashboard blocks**: Tremor (300+ blocks, same React/Tailwind/Radix stack)
- **Typography**: Poppins (headings/UI) + Inter (body)
- **Theme generator**: [tweakcn.com](https://tweakcn.com)

### Visual Assets (`image monprojetpro/`)

| Asset | File | Usage |
|-------|------|-------|
| Logo Hub | `logo monprojetpro hub.png` | Dashboard shell header (Hub) |
| Logo Lab | `logo monprojetpro lab.png` | Dashboard shell header (Lab) |
| Logo One | `logo monprojetpro one.png` | Dashboard shell header (One) |
| Élio Lab | `Image Elio lab.png` | Agent Élio — version Lab |
| Élio One | `Image Elio one.png` | Agent Élio — version One |
| Élio One+ | `Image Elio one +.png` | Agent Élio — variante One |

**Intégration prévue** : déplacer dans `packages/ui/public/logos/` et `packages/ui/public/elio/` lors de l'implémentation du dashboard shell et du chat Élio. Formats PNG transparents. Des variantes supplémentaires (poses, animations) seront générées selon les besoins d'intégration (états idle/thinking/speaking, transitions).

### Key UI Patterns

- **Dashboard shell** shared across apps (`@monprojetpro/ui/dashboard-shell`) with content slot
- **Module loading**: `loading.tsx` (skeleton) + `error.tsx` (error boundary) per module route
- **Élio chat** accessible on every page (floating, non-intrusive)
- **Validation Hub** as primary MiKL ↔ Client workflow (1-click validate/comment/video)
- **Graduation Lab→One**: animated transition, welcome message, smooth theme change

## Deployment Model

`apps/client` est une base de code unique, déployée **une seule fois** en multi-tenant sur `app.monprojet-pro.com`. TOUS les clients (Lab ou One) sont servis depuis ce même déploiement pendant toute la durée de leur abonnement. La graduation Lab → One est un simple changement de flag, pas un provisioning.

| Target | Model | URL | Contenu |
|--------|-------|-----|---------|
| **Hub** | Instance unique | `hub.monprojet-pro.com` | Cockpit MiKL (opérateur) |
| **App Client (Lab + One)** | Multi-tenant (RLS) | `app.monprojet-pro.com` | `apps/client` sert les deux modes pour TOUS les clients pendant l'abonnement (Lab pré-graduation OU One post-graduation, selon `dashboard_type`) |

**Graduation Lab → One** : la graduation ne provisionne rien. C'est une mise à jour du flag `client_configs.dashboard_type` (`'lab'` → `'one'`). Le client reste sur le même déploiement, la même DB Supabase, la même session. Seul le jeu d'onglets et le thème changent.

**Toggle Mode Lab / Mode One** : au sein de ce déploiement multi-tenant unique, un switch persistant dans le shell permet au client gradué de basculer instantanément entre la vue Lab (thème violet, historique parcours en lecture) et la vue One (thème vert/orange, outil quotidien). Pas de reload, pas de provisioning.

**Feature flag Élio Lab** : `client_configs.elio_lab_enabled` contrôle la disponibilité de l'agent Élio Lab pour chaque client. MiKL active/désactive ce flag depuis le Hub admin à tout moment (ex : lancement d'un nouveau projet d'amélioration pour un client gradué).

**Kit de sortie — Export One standalone** : le tree-shaking du module Lab et des agents (flags `NEXT_PUBLIC_ENABLE_LAB_MODULE` et `NEXT_PUBLIC_ENABLE_AGENTS`) n'est **PAS** utilisé en fonctionnement normal. Il n'est déclenché que par le **kit de sortie** (Story 13.1) quand un client quitte MonprojetPro : un script one-off crée un nouveau projet Vercel, un nouveau repo GitHub privé, un nouveau projet Supabase, exporte les données RLS-filtrées du client, pousse un build standalone de `apps/client` (Lab + agents tree-shakés), et transfère Vercel + GitHub au client sortant.

Hub communicates with the multi-tenant client app directly via shared Supabase. The kit de sortie generates a one-off standalone deployment for departing clients (cf. ADR-02 + Story 13.1).

Client **owns** their code + data uniquement à la sortie : le kit de sortie produit un déploiement Vercel + repo GitHub + Supabase dédiés, puis transfère l'ownership au client.

Voir `_bmad-output/planning-artifacts/architecture/adr-01-lab-one-coexistence-same-instance.md` (Révision 2 du 2026-04-13) pour le rationale complet.

## Quality Gates (CI — all blocking)

- RLS isolation tests (Lab inter-client + One instance isolation)
- Contract tests per module (valid manifest, correct exports, type alignment)
- Module documentation present (`docs/guide.md`, `docs/faq.md`, `docs/flows.md`)
- Lint + TypeScript strict (no `any`, no `as` except documented cases)
- Unit tests >80% coverage
- Build successful

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.95.x | DB, Auth, Storage, Realtime |
| `@supabase/ssr` | latest | Auth SSR for Next.js |
| `@tanstack/react-query` | ^5.90.x | Cache & data fetching |
| `zustand` | ^5.0.x | UI state only |
| `react-hook-form` | ^7.71.x | Form management |
| `zod` | existing | Validation (client + server) |

## Commands

```bash
npm run dev           # All modules (turbo dev)
npm run build         # Production build (turbo build)
npm run lint          # Lint all (turbo lint)
npm run clean         # Clean builds (turbo clean)
```

## Story Pipeline — Enchainement automatique (MUST follow)

> 🚫 **REGLE ABSOLUE — NE JAMAIS invoquer le skill `bmad:bmm:workflows:dev-story`** pour développer une story.
> Quand MiKL dit "dev la story X", "SPARK développe la story X", "commence la story X" → exécuter DIRECTEMENT le pipeline MPP ci-dessous, sans passer par aucun skill BMAD ni charger workflow.xml.

Le pipeline s'exécute **entièrement en autonome** jusqu'au HALT final (Gate MiKL).

### Pipeline complet — Story par story

| Étape | Agent | Action | Règles projet |
|-------|-------|--------|---------------|
| **0** | ATLAS | Consulter `docs/08-lessons-learned.md` — leçons pertinentes à la story | Toujours en premier |
| **1** | SPARK | Lire le fichier story `_bmad-output/implementation-artifacts/[story-key].md` — implémenter toutes les tasks/subtasks | Jamais d'extra features |
| **2** | TESS | Lancer `npx vitest run [fichiers story uniquement]` — si KO : auto-fix max 3 tentatives | **JAMAIS** le full suite |
| **3** | SCAN | Code review adversarial (`_bmad/bmm/workflows/4-implementation/code-review/instructions.xml`) — 3-10 issues minimum, fix auto HIGH+MEDIUM | Jamais "looks good" |
| **4** | TESS | Re-test après fixes SCAN — confirmer 0 régression | Mêmes fichiers story |
| **5** | CLEAN | Vérifier code mort / console.log — seulement si SCAN a trouvé du bruit | Optionnel |
| **6** | DOC | Mettre à jour `docs/client-release-notes.md` si feature touche un module client | Skip si infra/migration interne |
| **7** | PIXEL | Vérifier responsive + accessibilité + cohérence design Hub/One | Skip si story 100% backend |
| **8** | Auto | `git add` fichiers modifiés + `git commit` + `git push origin master` | Format : `feat: Story X.Y — Description (N tests)` |
| **9** | ATLAS | Enregistrer leçons dans `docs/08-lessons-learned.md` si problèmes rencontrés | Skip si story sans embûche |
| **⛔ HALT** | MiKL | Afficher résumé → attendre validation sur preview | Gate obligatoire |

**Message HALT :**
> **Pipeline terminé — Story X.Y.** Tests : ✅ N passing. Commit : `[hash]` pushé.
> **MiKL** : valide sur la preview pour confirmer.

### Règles projet spécifiques

- Tests : `npx vitest run [fichier1.test.ts] [fichier2.test.ts]` — uniquement les fichiers de la story (jamais `npx vitest run` seul)
- Commit message : suivre le pattern `git log --oneline -5`
- Story file : mettre à jour tasks [x], File List, Completion Notes, status → `done`
- sprint-status.yaml : mettre à jour le status de la story → `done`
- Si un fix SCAN crée une régression → itérer TESS → fix jusqu'à 0 échec avant de continuer

### Code Review "cr"

La commande **"cr"** déclenche uniquement les étapes SCAN → TESS → mise à jour story → commit → push (sans reprendre depuis ATLAS/SPARK).

## Lovable Integration Pipeline — Mini-cycle par page (MUST follow)

Quand MiKL fournit un repo GitHub Lovable pour une page du Hub, executer ce pipeline AUTOMATIQUEMENT et INTEGRALEMENT, sans aucune pause ni demande de confirmation entre les etapes :

### Etape 1 — Integration (SPARK)
- Lire le repo Lovable via `gh api` (pas de clone)
- Adapter au monorepo : imports `@monprojetpro/ui`, hooks TanStack existants, Server Actions existantes, types existants
- NE PAS creer de composants en doublon — reutiliser ceux du module

### Etape 2 — Tests (TESS)
- Lancer `npx vitest run [fichiers concernes]` (JAMAIS le full suite)
- 0 echec obligatoire avant de continuer

### Etape 3 — Code Review (SCAN)
- Review adversarial du code integre
- Verifier : imports corrects, pas de mock data residuel, patterns architecture respectes, accessibilite, responsive
- Trouver les problemes (JAMAIS "looks good")

### Etape 4 — Fix + Re-test
- Corriger tous les HIGH et MEDIUM trouves par SCAN
- Relancer les tests pour confirmer 0 regression

### Etape 5 — Clean (CLEAN)
- Verifier : pas de code mort, pas de commentaires inutiles, pas de console.log
- Si refacto necessaire → re-test non-regression

### Etape 6 — UX Check (PIXEL)
- Verifier : responsive (mobile cards vs desktop table), accessibilite (aria, semantique HTML), coherence design system Hub (OKLCH, spacing p-6, skeleton loaders)
- Signaler les ecarts vs le design Lovable original

### Etape 7 — Commit + Push
- `git add` fichiers modifies
- `git commit` avec message format : `ui: [page] — description (Lovable integration)`
- `git push origin master`

### Etape 8 — ATLAS
- Si problemes rencontres pendant le cycle → enregistrer dans `docs/08-lessons-learned.md`
- Si aucun probleme significatif → ne rien noter (pas de bruit)

**Regles :**
- Tout s'enchaine automatiquement sans pause — de l'etape 1 a l'etape 8
- Pas de story file, pas de sprint-status pour les integrations Lovable
- Le cycle s'applique a CHAQUE page (Accueil, Clients, Validation, Visio, Chat, Documents, Facturation)
- Si MiKL n'a pas encore fourni le repo Lovable, preparer le prompt Lovable et ATTENDRE

## Model Routing — BMAD Agents & Workflows (MUST follow)

When a BMAD agent (`/bmad:bmm:agents:*`) or workflow (`/bmad:bmm:workflows:*`) is invoked, **check the recommended model below BEFORE proceeding**. If your current model doesn't match, warn the user in French:

> **Recommandation modele :** Ce {agent/workflow} fonctionne de maniere optimale avec **{model}**. Vous etes actuellement sur **{current_model}**. Tapez `/model` pour changer, ou continuez si vous preferez rester sur ce modele.

Full config: `_bmad/_config/model-routing.yaml`

### Quick Reference

| Tier | Model | Usage |
|------|-------|-------|
| **opus** | Claude Opus 4.6 | Architecture, revue adversariale, decisions complexes |
| **sonnet** | Claude Sonnet 4.5 | Dev quotidien, stories, tests, UX, analyse (DEFAULT) |
| **haiku** | Claude Haiku 4.5 | Status, scaffolding, diagrammes, docs simples |

### Opus (raisonnement complexe)

- **Agents**: architect
- **Workflows**: prd, create-architecture, create-epics-and-stories, check-implementation-readiness, code-review, correct-course, testarch-nfr

### Sonnet (defaut — bon equilibre)

- **Agents**: analyst, dev, pm, sm, ux-designer, tea, quick-flow-solo-dev, bmad-master
- **Workflows**: dev-story, create-story, retrospective, quick-dev, quick-spec, create-product-brief, research, create-ux-design, document-project, generate-project-context, testarch-atdd, testarch-automate, testarch-test-design, testarch-test-review, testarch-trace, brainstorming, party-mode

### Haiku (rapide & economique)

- **Agents**: tech-writer
- **Workflows**: sprint-planning, sprint-status, workflow-init, workflow-status, testarch-ci, testarch-framework, create-excalidraw-*

## Detailed Documentation

| Document | Path |
|----------|------|
| Architecture (7 sections) | `_bmad-output/planning-artifacts/architecture/index.md` |
| PRD (sharded) | `_bmad-output/planning-artifacts/prd/index.md` |
| Architecture PRD (agents, infra, onboarding) | `_bmad-output/planning-artifacts/prd/architecture-prd-consolidee/index.md` |
| UX Design Specification | `_bmad-output/planning-artifacts/ux-design-specification.md` |
| Implementation Patterns | `_bmad-output/planning-artifacts/architecture/04-implementation-patterns.md` |
| Project Structure | `_bmad-output/planning-artifacts/architecture/05-project-structure.md` |
| Design System Themes CSS | `_bmad-output/planning-artifacts/design-system-themes.css` |
| Project Overview (existing code) | `docs/project-overview.md` |
| Existing Architecture (code) | `docs/architecture.md` |
| Internationalization (i18n) | `docs/i18n.md` |
| **Orpheus — Velocity Reference** | `_orpheus/velocity-reference.md` |
