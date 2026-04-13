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

#### Pilier 1 : Modèle de déploiement — Architecture multi-tenant unifiée Lab + One

**Principe fondamental : une base de code unique `apps/client` est déployée UNE SEULE FOIS en multi-tenant sur `app.monprojet-pro.com`. TOUS les clients (phase Lab OU phase One) sont servis depuis ce même déploiement pendant toute la durée de leur abonnement. La graduation Lab → One n'est qu'un changement de flag dans `client_configs`, jamais un provisioning.**

> Décision validée le 2026-04-13 (Révision 2). Références : [ADR-01 — Coexistence Lab & One dans la même instance](./adr-01-lab-one-coexistence-same-instance.md) (Révision 2) et [ADR-02 — Feature flags & export One standalone](./adr-02-feature-flags-export.md) (Révision 2).

Pendant l'abonnement, le client n'a pas son propre déploiement ni sa propre DB : il est un tenant parmi d'autres dans l'app multi-tenant, isolé par RLS. Ce n'est qu'à la **sortie** qu'un kit de sortie (one-off) crée un déploiement standalone qui lui est transféré en propriété.

**Cibles de déploiement :**

| Cible | Modèle | Infrastructure | Contenu | Propriété |
|-------|--------|----------------|---------|-----------|
| **Hub** | Instance unique | 1 Vercel + 1 Supabase | Cockpit opérateur MiKL | MonprojetPro |
| **App Client (Lab + One)** | Multi-tenant (RLS) | 1 Vercel + 1 Supabase partagé | `apps/client` servant les deux modes pour TOUS les clients (Lab ou One selon `dashboard_type`) | MonprojetPro |
| **Standalone client sortant** | One-off via kit de sortie | 1 Vercel + 1 GitHub + 1 Supabase créés à la demande | Build `apps/client` tree-shaké (Lab et agents désactivés) | Client (transfert à la sortie) |

**App Client multi-tenant (`app.monprojet-pro.com`) :**

- Un seul déploiement Vercel + un seul projet Supabase pour **tous les clients**, qu'ils soient en phase Lab ou en phase One
- Isolation par `client_id` + Row Level Security (RLS) sur toutes les tables métier
- Le mode affiché dépend du flag `client_configs.dashboard_type` (`'lab'` ou `'one'`) et du toggle persistant côté client gradué
- Les modules Lab et les modules One coexistent dans le bundle en permanence — c'est le rôle du shell et du routage de n'exposer que ceux qui sont pertinents selon le `dashboard_type`
- Aucun client ne possède "son propre déploiement" pendant son abonnement — tout se passe dans ce déploiement unique
- Coût marginal par client : quasi nul (même infra partagée, scaling géré par Vercel + Supabase)

**Hub (instance unique — MonprojetPro) :**

- Le Hub est multi-opérateur dès le départ (prépare la commercialisation)
- Table `operators` : MiKL = `operator_id: 1`
- Partage la même base Supabase que l'app client multi-tenant (policies RLS distinctes pour les rôles opérateur vs client)

##### Flux graduation Lab → One — un simple flag update

La graduation d'un client Lab vers One **ne provisionne rien** et **ne migre aucune donnée** :

1. MiKL (ou un processus automatisé) met à jour `client_configs.dashboard_type` : `'lab'` → `'one'`
2. Optionnellement, `client_configs.active_modules` est étendu pour ajouter les modules One du périmètre projet
3. `client_configs.elio_lab_enabled` peut être basculé à `false` (Élio Lab masqué par défaut côté client gradué, mais réactivable par MiKL)
4. Au prochain chargement du shell côté client, le thème change (vert/orange) et le jeu d'onglets passe en Mode One
5. Toutes les données Lab restent dans la même DB Supabase multi-tenant et restent accessibles via le toggle Mode Lab

Pas de nouveau Supabase, pas de nouveau Vercel, pas de copie de données, pas de redéploiement. C'est instantané.

##### Toggle Lab/One — bascule post-graduation dans l'app multi-tenant

Après graduation, le shell dashboard expose un **toggle persistant "Mode Lab / Mode One"** qui permet au client de basculer instantanément entre les deux vues au sein du **même déploiement multi-tenant** :

- **Mode Lab** : thème violet, onglets du parcours d'incubation (en lecture pour l'historique), accès aux livrables, historique Élio Lab
- **Mode One** : thème vert/orange, onglets de l'outil quotidien (CRM, facturation, visio, etc.)
- La bascule est instantanée (pas de reload, pas de session qui redémarre) — seul le jeu d'onglets et le thème changent
- Le toggle est persistant : la préférence est mémorisée entre les sessions (Zustand UI state)

**Feature flag Élio Lab :**

- `client_configs.elio_lab_enabled` (boolean) contrôle la visibilité de l'agent Élio Lab pour un client donné
- MiKL l'active/désactive depuis le Hub admin à tout moment (ex : accompagner un nouveau projet d'amélioration pour un client gradué)
- Pas de synchronisation inter-instances nécessaire : le flag est lu directement dans la DB Supabase partagée

##### Export One standalone — déclenché UNIQUEMENT par le kit de sortie

Le tree-shaking du module Lab et des agents via `NEXT_PUBLIC_ENABLE_LAB_MODULE` / `NEXT_PUBLIC_ENABLE_AGENTS` **n'est pas utilisé en fonctionnement normal**. L'app multi-tenant en production garde toujours Lab ET One ET les agents activés dans son bundle.

Ce tree-shaking n'existe que pour un scénario : le **kit de sortie** (Story 13.1 — à créer). Quand un client quitte MonprojetPro, MiKL déclenche un script one-off qui :

1. Crée un nouveau projet Vercel dédié au client (via Vercel API)
2. Crée un nouveau repo GitHub privé (via GitHub API)
3. Provisionne un nouveau projet Supabase dédié au client
4. Exporte les données RLS-filtrées du client depuis la DB multi-tenant vers le nouveau Supabase
5. Pousse un **build standalone** de `apps/client` avec `NEXT_PUBLIC_ENABLE_LAB_MODULE=false` et `NEXT_PUBLIC_ENABLE_AGENTS=false` (Lab et agents exclus du bundle)
6. Connecte le nouveau Vercel au nouveau repo GitHub et déclenche le premier déploiement
7. Produit les credentials + un brouillon d'email pour le client
8. MiKL transfère l'ownership Vercel + GitHub au client

Après ce kit, le client possède son propre déploiement indépendant, sans aucun lien avec l'app multi-tenant MonprojetPro. Voir [ADR-02 — Feature flags & export One standalone](./adr-02-feature-flags-export.md) (Révision 2) pour le détail des conditions d'import, des barrels et de la CI de vérification, et [ADR-01 — Coexistence Lab & One](./adr-01-lab-one-coexistence-same-instance.md) (Révision 2) pour le rationale.

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

**Table `client_configs` (app multi-tenant — source unique de vérité) :**

```sql
-- Dans la DB Supabase multi-tenant partagée : une ligne par client
-- RLS garantit qu'un client ne lit/écrit que sa propre config
CREATE TABLE client_configs (
  client_id UUID PRIMARY KEY REFERENCES clients(id),
  operator_id UUID REFERENCES operators(id),

  -- Modules actifs (mix Lab + One selon la phase du client)
  active_modules TEXT[] DEFAULT ARRAY['core-dashboard', 'chat', 'documents', 'parcours-lab'],

  -- Phase courante du client : détermine le mode par défaut du shell
  dashboard_type TEXT DEFAULT 'lab',  -- 'lab' | 'one' — flag modifié à la graduation

  -- Feature flag Élio Lab (contrôlé par MiKL depuis le Hub)
  elio_lab_enabled BOOLEAN DEFAULT TRUE,

  -- Personnalisation
  theme_variant TEXT DEFAULT 'lab',
  custom_branding JSONB,

  -- Configuration Élio
  elio_config JSONB,

  -- Parcours Lab
  parcours_config JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Il n'y a **pas** de table `client_instances` pour un registre d'instances dédiées : il n'y a qu'un seul déploiement multi-tenant. Un éventuel registre n'existe que pour les clients sortis (post kit de sortie), à des fins de suivi commercial, et n'est pas nécessaire au fonctionnement normal de la plateforme.

**Flux "nouveau client" (Lab ou One) :**

1. MiKL crée le client dans le Hub
2. Le Hub insère `clients` + `client_configs` dans la DB multi-tenant partagée
3. `dashboard_type` est initialisé selon la phase (`'lab'` par défaut, ou `'one'` directement si le client entre sans passer par Lab)
4. Le client reçoit ses identifiants → se connecte à `app.monprojet-pro.com`
5. Le middleware Auth lit `client_id` → charge `client_configs` (RLS)
6. Le shell s'affiche dans le mode correspondant avec les modules du périmètre

**Flux "graduation Lab → One" — aucun provisioning :**

1. Le client Lab termine son parcours et choisit MonprojetPro One
2. MiKL (ou un processus automatisé) met à jour `client_configs.dashboard_type` : `'lab'` → `'one'`
3. Optionnellement, `active_modules` est étendu avec les modules One du périmètre projet, et `elio_lab_enabled` peut passer à `false`
4. Au prochain chargement du shell côté client, le thème passe en vert/orange et le jeu d'onglets passe en Mode One
5. Toutes les données Lab restent dans la même DB Supabase et restent accessibles via le toggle Mode Lab du shell

Pas de nouveau Supabase. Pas de nouveau Vercel. Pas de copie de données. Pas de redéploiement.

**Flux "ajouter un module" :**

1. MiKL dans le Hub : active le module pour le client
2. `UPDATE client_configs SET active_modules = active_modules || ARRAY['formations'] WHERE client_id = ...`
3. Au prochain chargement, le client voit le nouveau module — pas de redéploiement, pas de migration cross-instance
4. **Livrable obligatoire** : documentation module (`guide.md`, `faq.md`, `flows.md`)

**Flux "client quitte MonprojetPro" — kit de sortie (Story 13.1) :**

1. MiKL déclenche le script one-off "kit de sortie" depuis le Hub
2. Le script crée un nouveau projet Vercel, un nouveau repo GitHub privé, et un nouveau projet Supabase dédiés au client
3. Les données RLS-filtrées du client sont exportées depuis la DB multi-tenant vers le nouveau Supabase
4. Un build standalone de `apps/client` est poussé avec `NEXT_PUBLIC_ENABLE_LAB_MODULE=false` et `NEXT_PUBLIC_ENABLE_AGENTS=false` (Lab et agents tree-shakés, exclus du bundle final)
5. Le nouveau Vercel est connecté au nouveau repo GitHub et déclenche le premier déploiement
6. Le script produit les credentials + un brouillon d'email pour le client
7. MiKL transfère l'ownership Vercel + GitHub au client
8. Le client possède désormais un déploiement indépendant, sans aucun lien avec l'app multi-tenant MonprojetPro
9. Les données Lab + documentation stratégique (brief, PRD, architecture) sont incluses dans l'export

#### Pilier 4 : Communication Hub ↔ App Client

Hub et App Client partagent la **même DB Supabase multi-tenant**. Il n'y a donc pas de protocole HTTP/webhook à mettre en place pour la communication Hub ↔ Client en fonctionnement normal : toute la synchronisation passe par la base de données partagée et les policies RLS distinguent les rôles opérateur et client.

- MiKL depuis le Hub modifie directement `client_configs`, `active_modules`, `elio_lab_enabled`, `dashboard_type`, etc. via des Server Actions qui écrivent dans la DB commune
- Côté client, le shell lit `client_configs` au prochain chargement (ou via Supabase Realtime) et se met à jour automatiquement
- Les webhooks HMAC ne sont **pas** nécessaires pour piloter l'app client (c'est le même Supabase) — ils ne sont utilisés que pour les intégrations externes (Pennylane, Cal.com, etc.)

**Scénarios nécessitant un protocole HTTP :** uniquement le kit de sortie (Story 13.1), qui utilise la Vercel API, la GitHub API et la Supabase Management API pour provisionner le déploiement standalone du client sortant. Ces appels sont one-off et ne sont pas un protocole de fonctionnement courant.

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
