# Starter Template & Platform Architecture

[< Retour à l'index](./index.md) | [< Section précédente](./01-project-context-analysis.md) | [Section suivante >](./03-core-decisions.md)

---

### Existing Foundation

Monorepo Turborepo existant avec packages partagés (`@monprojetpro/ui`, `@monprojetpro/utils`, `@monprojetpro/tsconfig`). Stack confirmée et à jour : Next.js 16.1, React 19, TypeScript, Tailwind CSS 4, Vitest.

**Versions cibles :**

| Package | Version actuelle | Cible | Action |
|---------|-----------------|-------|--------|
| Next.js | 16.1.1 | 16.1.x | A jour |
| Turborepo | ^2.3.0 | ^2.8.x | Mise à jour |
| React | 19.2.3 | 19.x | A jour |
| Tailwind CSS | 4.x | 4.x | A jour |
| @supabase/supabase-js | Non installé | ^2.95.x | A ajouter |
| @supabase/ssr | Non installé | Latest | A ajouter |

### Application Structure Decision

**Architecture retenue : 2 applications Next.js + catalogue de modules**

```
monprojetpro-dash/
├── apps/
│   ├── hub/                    # MonprojetPro-Hub (opérateur/admin)
│   └── client/                 # MonprojetPro-Client (dashboard unifié Lab+One)
│
├── packages/
│   ├── ui/                     # Design system partagé (shadcn/Radix)
│   ├── utils/                  # Utilitaires partagés
│   ├── tsconfig/               # Configs TypeScript
│   └── modules/                # CATALOGUE DE MODULES
│       ├── core-dashboard/     # Module de base (accueil, nav, profil)
│       ├── chat/               # Module chat (Élio + MiKL)
│       ├── documents/          # Module documents
│       ├── visio/              # Module visio
│       ├── crm/                # Module CRM
│       ├── formations/         # Module formations
│       ├── evenements/         # Module événements
│       ├── adhesions/          # Module adhésions
│       ├── facturation/        # Module facturation
│       ├── parcours-lab/       # Module parcours Lab
│       ├── validation-hub/     # Module Validation Hub
│       └── [futur-module]/     # Chaque nouveau besoin = nouveau package
```

**Rationale :**

- Hub et Client sont des audiences distinctes (admin vs utilisateur final)
- Déploiement indépendant : `hub.monprojet-pro.com` / `app.monprojet-pro.com`
- Sécurité simplifiée (pas de risque d'exposer des routes admin)
- Bundles optimisés (chaque app charge uniquement ce qu'elle utilise)
- Packages partagés assurent la cohérence entre les deux apps

### Architecture Plateforme Modulaire

**Principe fondamental : "Développer une fois, déployer partout"**

Le système repose sur 3 piliers :

#### Pilier 1 : Modèle de déploiement — Architecture unifiée Lab + One

**Principe fondamental : une base de code unique `apps/client` sert à la fois Lab et One. La cible de déploiement dépend de l'état du client.**

> Décision validée le 2026-04-13. Références : [ADR-01 — Coexistence Lab & One dans la même instance](./adr-01-lab-one-coexistence-same-instance.md) et [ADR-02 — Feature flags & export One standalone](./adr-02-feature-flags-export.md).

Le code développé dans le cadre du projet appartient au client. MonprojetPro conserve le droit de réutiliser les patterns et modules développés. Si le client quitte MonprojetPro, il repart avec un bundle One pur (Lab et agents tree-shaken via feature flags), sa base de données et sa documentation complète.

**Cibles de déploiement :**

| Cible | Modèle | Infrastructure | Contenu | Propriété |
|-------|--------|----------------|---------|-----------|
| **Hub** | Instance unique | 1 Vercel + 1 Supabase | Cockpit opérateur MiKL | MonprojetPro |
| **Lab (pré-graduation)** | Multi-tenant | 1 Vercel + 1 Supabase (partagé) | `apps/client` en mode Lab uniquement | MonprojetPro |
| **Lab + One (post-graduation)** | Instance dédiée par client | 1 Vercel + 1 Supabase **par client** | `apps/client` avec **les deux** modules Lab et One | Client |

**Lab (multi-tenant, pré-graduation) :**

- Une seule instance déployée pour tous les clients en parcours d'incubation
- Isolation par `client_id` + Row Level Security (RLS)
- Configuration dynamique par client (modules actifs, parcours, thème violet)
- Les clients Lab ne possèdent pas encore d'outil dédié — ils travaillent sur la plateforme partagée

**Instance dédiée (post-graduation, Lab + One coexistants) :**

- Chaque client gradué reçoit sa propre instance Vercel + son propre projet Supabase
- Pas de RLS inter-client nécessaire (base de données dédiée)
- L'instance contient **à la fois** les modules Lab et les modules One — le client peut revenir à tout moment sur ses données Lab
- Données Lab reportées lors de la graduation : brief, livrables, historique Élio Lab, profil de communication
- Le client peut récupérer le code et être indépendant si demandé (voir "Export One standalone")
- Coût estimé par client : ~5-7€/mois sur tiers gratuits (Vercel Hobby + Supabase Free + VPS prorata + Élio)

**Hub (instance unique — MonprojetPro) :**

- Le Hub est multi-opérateur dès le départ (prépare la commercialisation)
- Table `operators` : MiKL = `operator_id: 1`
- Communique avec les instances dédiées via **API REST + webhooks HMAC** (pas de DB partagée)

##### Toggle Lab/One — bascule post-graduation

Après graduation, le shell dashboard expose un **toggle persistant "Mode Lab / Mode One"** qui permet au client de basculer instantanément entre les deux vues au sein de la même instance dédiée :

- **Mode Lab** : thème violet, onglets du parcours d'incubation, accès lecture aux livrables, historique Élio Lab
- **Mode One** : thème vert/orange, onglets de l'outil quotidien (CRM, facturation, visio, etc.)
- La bascule est instantanée (pas de reload, pas de session qui redémarre) — seul le jeu d'onglets et le thème changent
- Le toggle est persistant : la préférence est mémorisée entre les sessions (Zustand UI state)

**Feature flag Élio Lab :**

- `client_config.elio_lab_enabled` (boolean) : `false` par défaut après graduation
- L'agent Élio Lab est désactivé dans l'interface Mode Lab post-graduation (Élio Hub reste accessible côté MiKL)
- MiKL peut réactiver Élio Lab depuis le Hub à tout moment, par exemple pour accompagner un nouveau projet d'amélioration, une itération sur le positionnement, un nouveau livrable stratégique
- Le flag est synchronisé Hub → instance client via webhook HMAC

##### Export One standalone — tree-shaking au build

Pour le scénario de sortie d'abonnement ou de transfert de propriété, le bundle `apps/client` doit pouvoir être exporté en mode **One pur** (sans Lab, sans agents MonprojetPro) :

- `NEXT_PUBLIC_ENABLE_LAB_MODULE` : feature flag qui, à `false`, tree-shake l'intégralité du module Lab (parcours, soumissions, livrables Lab, toggle Lab/One)
- `NEXT_PUBLIC_ENABLE_AGENTS` : feature flag qui, à `false`, tree-shake Élio (Lab, One, One+), le chat MiKL, et tout code d'agent
- Les deux flags sont lus au build (`next build`) — le code exclu n'est pas présent dans le bundle final
- Le client sortant reçoit : le code source One standalone, sa base de données exportée, sa documentation complète
- Voir [ADR-02 — Feature flags & export One standalone](./adr-02-feature-flags-export.md) pour le détail des conditions d'import, des barrels et de la CI de vérification

#### Pilier 2 : Catalogue de modules plug & play

Chaque module est un package autonome dans `packages/modules/` qui respecte un **contrat strict** :

```typescript
// Contrat Module — chaque module exporte un manifest
export interface ModuleManifest {
  id: string                    // Identifiant unique ('crm', 'formations', etc.)
  name: string                  // Nom affiché
  version: string               // Versioning sémantique
  description: string           // Description du module

  navigation: {                 // Entrée dans la sidebar
    icon: string                // Icône Lucide
    label: string               // Label affiché
    position: number            // Ordre dans la nav
  }

  routes: ModuleRoute[]         // Pages du module (lazy-loaded)
  apiRoutes: ModuleApiRoute[]   // Endpoints API
  requiredTables: string[]      // Tables DB nécessaires
  targets: ('hub' | 'client-lab' | 'client-one')[]  // Dashboards compatibles
  dependencies: string[]        // Dépendances sur d'autres modules
}
```

**Cycle de vie d'un module :**

1. **Développement** : Créer un nouveau package dans `packages/modules/[nom]/`
2. **Documentation** : Rédiger `docs/guide.md`, `docs/faq.md`, `docs/flows.md` (obligatoire, vérifié en CI)
3. **Enregistrement** : Le module s'auto-enregistre via son manifest
4. **Activation Lab** : Ajouter l'id dans la config client → déploiement automatique (tous les clients Lab en bénéficient)
5. **Activation One** : Ajouter l'id dans la config de l'instance → redéployer l'instance Vercel du client
6. **Mise à jour Lab** : Push git → deploy auto → tous les clients Lab avec ce module en bénéficient
7. **Mise à jour One** : Push git → redéployer l'instance Vercel du client spécifique
8. **Désactivation** : Retirer l'id de la config → le module disparaît de l'interface

#### Pilier 3 : Configuration-driven, pas code-driven

**Table client_config (Lab — DB partagée multi-tenant) :**

```sql
-- Dans la DB Lab partagée : détermine ce que chaque client Lab voit
CREATE TABLE client_config (
  client_id UUID PRIMARY KEY REFERENCES clients(id),
  operator_id UUID REFERENCES operators(id),

  -- Modules actifs
  active_modules TEXT[] DEFAULT ARRAY['core-dashboard', 'chat', 'documents', 'parcours-lab'],

  -- Type de dashboard
  dashboard_type TEXT DEFAULT 'lab',  -- 'lab' (fixe dans cette DB)

  -- Personnalisation
  theme_variant TEXT DEFAULT 'lab',   -- Palette vert émeraude
  custom_branding JSONB,              -- Logo, nom affiché

  -- Configuration Élio
  elio_config JSONB,                  -- Contexte, profil comm, tier

  -- Parcours Lab
  parcours_config JSONB,              -- Étapes, progression

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Table client_config (One — DB dédiée par client) :**

```sql
-- Dans chaque DB One dédiée : un seul client, pas de RLS inter-client
CREATE TABLE client_config (
  client_id UUID PRIMARY KEY,         -- Un seul enregistrement dans cette DB

  -- Modules actifs (définis par le périmètre projet)
  active_modules TEXT[] DEFAULT ARRAY['core-dashboard', 'chat', 'documents'],

  -- Type de dashboard
  dashboard_type TEXT DEFAULT 'one',   -- 'one' (fixe)

  -- Personnalisation
  theme_variant TEXT DEFAULT 'one',    -- Palette orange
  custom_branding JSONB,               -- Logo, nom affiché

  -- Configuration Élio
  elio_config JSONB,                   -- Contexte, profil comm, tier

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Table client_instances (Hub — registre des instances) :**

```sql
-- Dans la DB Hub : registre de toutes les instances déployées
CREATE TABLE client_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  instance_type TEXT NOT NULL,          -- 'lab' | 'one'

  -- URLs de l'instance
  instance_url TEXT NOT NULL,           -- https://{slug}.monprojet-pro.com
  supabase_url TEXT,                    -- URL Supabase de l'instance (One uniquement)
  vercel_project_id TEXT,               -- ID projet Vercel (One uniquement)

  -- Sécurité inter-instances
  instance_secret TEXT NOT NULL,        -- Secret HMAC pour communication signée

  -- Monitoring
  status TEXT DEFAULT 'active',         -- 'provisioning', 'active', 'suspended', 'archived'
  last_health_check TIMESTAMP,
  usage_metrics JSONB,                  -- Dernières métriques (DB rows, storage, bandwidth)
  alert_level TEXT DEFAULT 'none',      -- 'none', 'info', 'warning', 'critical'

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Flux "nouveau client Lab" :**

1. MiKL crée le client dans le Hub
2. Le Hub insère `clients` + `client_config` dans la DB Lab partagée
3. Le client reçoit ses identifiants → se connecte à `lab.monprojet-pro.com`
4. Le middleware Auth lit `client_id` → charge `client_config` (RLS)
5. Le dashboard Lab s'affiche avec les modules du parcours

**Flux "nouveau client One" :**

1. MiKL crée le client dans le Hub
2. Script de provisioning : création projet Supabase + déploiement Vercel dédié
3. Configuration des env variables (Supabase URL, clés, modules actifs)
4. Le Hub enregistre l'URL de l'instance One (pour communication API)
5. Le client reçoit ses identifiants → se connecte à `{slug}.monprojet-pro.com`
6. **Livrable obligatoire** : documentation d'utilisation de chaque module activé

**Flux "graduation Lab → One" :**

1. Le client Lab termine son parcours et choisit MonprojetPro One
2. Script de provisioning de l'instance dédiée (nouveau Supabase + nouveau Vercel) — l'instance contient **à la fois** les modules Lab et les modules One
3. Copie des données Lab du client depuis la DB Lab multi-tenant vers la DB dédiée de la nouvelle instance (brief, livrables, historique Élio Lab, profil de communication)
4. Activation du Mode One par défaut + mise à disposition du toggle Lab/One dans le shell
5. Désactivation de Élio Lab (`elio_lab_enabled = false`) — réactivable par MiKL à la demande
6. Les données Lab restent pleinement accessibles en lecture via le Mode Lab de la nouvelle instance

**Flux "ajouter un module" (Lab — multi-tenant) :**

1. MiKL dans le Hub : active le module pour le client
2. `UPDATE client_config SET active_modules = active_modules || ARRAY['formations']`
3. Au prochain chargement, le client voit le nouveau module

**Flux "ajouter un module" (One — instance dédiée) :**

1. Développement/personnalisation du module dans le monorepo
2. Redéploiement de l'instance Vercel du client avec le module ajouté
3. Migration Supabase sur l'instance du client si nécessaire
4. **Livrable obligatoire** : documentation module (guide.md, faq.md, flows.md)

**Flux "client quitte One" :**

1. Export des données depuis le Supabase du client
2. Le client repart avec : code source + base de données + documentation complète
3. Retrait des modules service MonprojetPro (chat MiKL, visio, Élio) — sauf si dans le périmètre projet
4. Le dossier BMAD reste propriété MonprojetPro — le client reçoit les documents stratégiques (brief, PRD, architecture)

#### Pilier 4 : Communication Hub ↔ Instances

Le Hub ne partage pas de base de données avec les instances One. Toute communication passe par des API sécurisées.

```typescript
// API Hub → Instance One (dans l'instance client)
// apps/client/app/api/hub/route.ts
export interface HubApiContract {
  'POST /api/hub/sync': {        // Hub push des mises à jour config
    body: { action: string; payload: unknown }
    response: { success: boolean }
  }
  'GET /api/hub/health': {       // Hub vérifie la santé de l'instance
    response: { status: 'ok' | 'degraded'; metrics: UsageMetrics }
  }
}

// Webhook Instance One → Hub (dans le Hub)
// apps/hub/app/api/webhooks/client-instance/route.ts
export interface ClientWebhookContract {
  'POST /api/webhooks/client-instance': {
    body: {
      instanceId: string
      event: 'usage_alert' | 'client_action' | 'health_report'
      data: unknown
    }
  }
}
```

**Sécurité inter-instances :**

- Chaque instance One possède un `INSTANCE_SECRET` partagé avec le Hub
- Toutes les requêtes Hub↔One sont signées (HMAC SHA-256)
- Le Hub maintient un registre des instances actives (`client_instances` table)

#### Pilier 5 : Documentation comme livrable obligatoire

Chaque fonctionnalité développée DOIT produire sa documentation. Cette documentation :
- Alimente la base de connaissances d'Élio One (assistant IA contextuel)
- Est accessible au client via son module documents
- Est incluse dans l'export si le client quitte One

**Structure documentation par module :**

```
packages/modules/[nom]/
├── docs/
│   ├── guide.md          # Guide utilisateur pas-à-pas
│   ├── faq.md            # Questions fréquentes
│   └── flows.md          # Diagrammes de flux / parcours utilisateur
```

#### Pilier 6 : Surveillance usage & upgrade automatique

Système de monitoring pour anticiper les dépassements de capacité sur les tiers gratuits.

```
┌─────────────────┐     Cron quotidien      ┌──────────────────┐
│  Edge Function  │ ──────────────────────► │  Check usage     │
│  (Supabase)     │                         │  par instance    │
└─────────────────┘                         └────────┬─────────┘
                                                     │
                                            ┌────────▼─────────┐
                                            │  Seuils atteints │
                                            │  60% → info      │
                                            │  80% → warning   │
                                            │  95% → critical  │
                                            └────────┬─────────┘
                                                     │
                                            ┌────────▼─────────┐
                                            │  Notification    │
                                            │  Hub + email     │
                                            └────────┬─────────┘
                                                     │
                                            ┌────────▼─────────┐
                                            │  Workflow        │
                                            │  Debrief client  │
                                            │  Accord upgrade  │
                                            │  Migration tier  │
                                            └──────────────────┘
```

**Métriques surveillées :**

| Métrique | Source | Seuil gratuit |
|----------|--------|---------------|
| Lignes DB | Supabase API | 500K rows |
| Storage fichiers | Supabase Storage | 1 GB |
| Bandwidth | Supabase | 2 GB/mois |
| Edge Function invocations | Supabase | 500K/mois |
| Vercel bandwidth | Vercel API | 100 GB/mois |
