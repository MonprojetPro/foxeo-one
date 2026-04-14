# Core Architectural Decisions

[< Retour à l'index](./index.md) | [< Section précédente](./02-platform-architecture.md) | [Section suivante >](./04-implementation-patterns.md)

---

_Décisions validées après revue Party Mode (Winston, Amelia, John, Murat, Sally) — 06/02/2026_

### Decision Priority Analysis

**Philosophie de développement :** Pas de contrainte de temps. Chaque brique est construite correctement dès le départ. Pas de raccourcis, pas de dette technique. Les services self-hosted (OpenVidu, Cal.com) et les services SaaS (Pennylane) sont intégrés dès le MVP.

### Data Architecture

| Décision | Choix | Version | Rationale |
|----------|-------|---------|-----------|
| **Client DB** | Supabase Client JS direct | @supabase/supabase-js ^2.95.x | Client typé natif, pas besoin d'ORM supplémentaire |
| **Auth SSR** | @supabase/ssr | latest | Gestion cookies/sessions côté serveur avec Next.js |
| **Validation** | Zod | existant dans le projet | Validation client ET serveur, intégration React Hook Form |
| **Migrations** | Supabase CLI (`supabase migration`) | — | Migrations versionnées dans le repo, appliquées via CI |
| **Cache & data fetching** | TanStack Query v5 | @tanstack/react-query ^5.90.x | Cache, revalidation, loading states, optimistic updates |
| **Types DB** | Génération auto via `supabase gen types` | — | Fichier `database.types.ts` partagé, toujours synchronisé |

**Règle Party Mode (Amelia)** : Supabase Realtime invalide le cache TanStack Query. Pas de sync manuelle entre les deux. Realtime → `queryClient.invalidateQueries()`, point final.

### Authentication & Security

| Décision | Choix | Rationale |
|----------|-------|-----------|
| **Auth côté serveur** | @supabase/ssr + Middleware Next.js | Cookies/sessions SSR, protection des routes |
| **Middleware auth** | Un middleware par app | `hub/middleware.ts` vérifie admin+2FA, `client/middleware.ts` vérifie client_id+config |
| **RBAC** | Triple couche : RLS (données) + Middleware (routes) + UI (composants) | Même si le front bug, la DB protège les données |
| **Policies RLS** | Fonctions SQL réutilisables : `is_admin()`, `is_owner()`, `is_operator()` | Logique centralisée, pas de duplication |

**Règle Party Mode (Murat)** : Tests RLS dédiés obligatoires en CI. Un test qui tente d'accéder aux données client B en étant authentifié client A. Si ce test passe → build cassé. Non négociable.

### API & Communication Patterns

| Décision | Choix | Rationale |
|----------|-------|-----------|
| **Lecture initiale** | Server Components (RSC) | Performance, pas de waterfall client |
| **Mutation utilisateur** | Server Actions | Moins de boilerplate que les API Routes |
| **Callback externe** | API Routes (`app/api/webhooks/[service]/route.ts`) | Nécessaire pour les webhooks Cal.com, OpenVidu |
| **Gestion d'erreurs** | Pattern `{ data, error }` (style Supabase) | Cohérent avec l'API Supabase, pas d'exceptions non gérées |
| **Temps réel** | Supabase Realtime (Channels + Presence) | Chat, notifications, présence — un seul provider |

**Règle Party Mode (Amelia)** : 3 patterns de data fetching, pas plus. Documentés dans project-context.md :
- **Lecture** → Server Component
- **Mutation** → Server Action
- **Externe** → API Route

Aucun cas gris autorisé.

### Frontend Architecture

| Décision | Choix | Version | Rationale |
|----------|-------|---------|-----------|
| **State management UI** | Zustand | ^5.0.x | État interface (sidebar, onglets, préférences). 2KB, simple, nécessaire vu la complexité multi-dashboard |
| **Formulaires** | React Hook Form + Zod resolver | react-hook-form ^7.71.x | Standard industrie, performant, intégration shadcn/ui |
| **Module loading** | `next/dynamic` avec lazy loading | — | Chaque module importé dynamiquement selon config client |
| **Module registry** | Auto-découvert, pas hardcodé | — | Registry centralisé qui scanne les manifests des modules |
| **Layout** | Dashboard shell partagé (`@monprojetpro/ui`) + slot de contenu | — | Sidebar, header, notifications dans le shell. Chaque module remplit le slot |
| **Thématisation** | CSS variables OKLCH + Tailwind v4 `@theme` | — | 3 palettes (Hub/Lab/One) = overrides CSS, pas de code conditionnel |

**Règles Party Mode :**
- **(Sally)** Dashboard shell avec variantes de densité : `density: 'compact' | 'comfortable' | 'spacious'` — Hub=compact (data-dense), Lab=spacious (émotionnel), One=comfortable (opérationnel)
- **(Sally)** Skeleton loaders obligatoires par module + prefetch intelligent des modules adjacents dans la nav
- **(Sally)** Transition graduation Lab→One : animation de passage, message d'accueil, pas de changement de couleur brutal
- **(Amelia)** Module registry auto-découvert : le registry scanne les manifests, pas de liste hardcodée à maintenir

### Infrastructure & Deployment

| Décision | Choix | Rationale |
|----------|-------|-----------|
| **CI/CD frontend** | Vercel (auto-deploy Git) + GitHub Actions (lint, tests) | Push → checks → deploy auto |
| **Environnements** | 3 : development (local), preview (Vercel PR), production | Supabase : 1 projet dev + N projets prod (1 Lab + 1 par client One) |
| **Déploiement Lab** | Instance unique Vercel → `lab.monprojet-pro.com` | Multi-tenant, DB partagée, RLS inter-client |
| **Déploiement One** | Instance Vercel par client → `{slug}.monprojet-pro.com` | Instance dédiée, DB propre, propriété client |
| **Déploiement Hub** | Instance unique Vercel → `hub.monprojet-pro.com` | Communique avec Lab et instances One via API/webhooks |
| **VPS services** | Docker Compose sur VPS unique (Scaleway/OVH) | OpenVidu + Cal.com. Intégrés dès le MVP |
| **Facturation SaaS** | Pennylane API v2 (Cloud) | Facturation, devis, abonnements, comptabilité, conformité facturation électronique sept. 2026. Synchronisation par polling (Edge Function cron 5min) — pas de webhooks publics disponibles |
| **Monitoring usage** | Supabase Edge Function (cron) + alertes seuils | Surveillance capacité par instance One (60%/80%/95%) |
| **Monitoring app** | Vercel Analytics + Supabase Dashboard + Sentry | 3 outils gratuits/low-cost, couvrent l'essentiel |
| **Env variables** | .env.local (dev) + Vercel Env (prod) + Supabase Vault (secrets) | Jamais de secrets dans le code |

### Per-Client Deployment (One)

| Décision | Choix | Rationale |
|----------|-------|-----------|
| **Provisioning** | Script CLI (`monprojetpro-cli provision`) | Création Supabase + Vercel + env vars + migrations automatisées |
| **Supabase par client** | 1 projet Supabase Free/Pro | Isolation complète, pas de RLS inter-client, le client possède ses données |
| **Vercel par client** | 1 projet Vercel Hobby/Pro | Déploiement indépendant, domaine personnalisable |
| **Communication Hub↔One** | API REST + webhooks mutuels | Le Hub n'accède pas directement aux DB clients |
| **Coût estimé** | ~5-7€/mois tiers gratuits | Vercel Hobby (gratuit) + Supabase Free (gratuit) + VPS prorata + Élio |
| **Sortie client** | Export code + DB + documentation | Le client repart avec un outil opérationnel autonome |

### Surveillance & Upgrade Automatique

| Décision | Choix | Rationale |
|----------|-------|-----------|
| **Mécanisme** | Supabase Edge Function (cron quotidien) | Vérifie usage DB, storage, bandwidth par instance |
| **Seuils d'alerte** | 60% (info) / 80% (warning) / 95% (critical) | Anticipation avant dépassement des tiers gratuits |
| **Notification** | Notification Hub + email MiKL | Tableau de bord santé dans le module admin |
| **Workflow upgrade** | Alerte → Debrief client → Accord → Migration tier | Pas d'upgrade automatique sans validation MiKL + client |

### Documentation comme Livrable

| Décision | Choix | Rationale |
|----------|-------|-----------|
| **Obligation** | Chaque module développé DOIT avoir sa documentation | Alimenter Élio One + livrable client |
| **Format** | 3 fichiers par module : `guide.md`, `faq.md`, `flows.md` | Guide utilisateur, FAQ, diagrammes de flux |
| **Accès** | Intégré dans le module documents + indexé par Élio | Le client y accède via son dashboard et via Élio |
| **Sortie client** | Documentation incluse dans l'export | Le client repart avec toute la documentation |

### Dependencies Summary

| Package | Version | Usage |
|---------|---------|-------|
| `@supabase/supabase-js` | ^2.95.x | Client Supabase (DB, Auth, Storage, Realtime) |
| `@supabase/ssr` | latest | Auth SSR pour Next.js |
| `@tanstack/react-query` | ^5.90.x | Cache & data fetching |
| `@tanstack/react-query-devtools` | ^5.91.x | DevTools (dev only) |
| `zustand` | ^5.0.x | État UI global |
| `react-hook-form` | ^7.71.x | Gestion formulaires |
| `@hookform/resolvers` | latest | Intégration Zod |

### Quality Gates (Party Mode — Murat)

| Gate | Automatisé | Bloquant |
|------|-----------|----------|
| Tests RLS Lab (isolation données inter-clients Lab) | Oui (CI) | Oui |
| Tests isolation instance (One ne fuit pas vers Hub/Lab) | Oui (CI) | Oui |
| Contract tests par module (manifest + routes + API) | Oui (CI) | Oui |
| Lint + TypeScript strict | Oui (CI) | Oui |
| Tests unitaires >80% couverture | Oui (CI) | Oui |
| Documentation module présente (guide.md, faq.md, flows.md) | Oui (CI) | Oui |
| Build successful | Oui (CI) | Oui |
