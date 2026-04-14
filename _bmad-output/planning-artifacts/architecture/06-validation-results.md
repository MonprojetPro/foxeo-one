# Architecture Validation Results

[< Retour à l'index](./index.md) | [< Section précédente](./05-project-structure.md) | [Section suivante >](./07-completion-summary.md)

---

_Validation initiale réalisée le 06/02/2026 — Croisement 152 FRs + 39 NFRs + documents source._
_Mise à jour 08/02/2026 : FR153-170 ajoutées (instance-per-client, Lab 199€). Total actuel : 170 FRs (161 in-scope, 9 Orpheus)._

### Coherence Validation

**Compatibilité des décisions :** Toutes les technologies sont compatibles entre elles. Next.js 16.1 + React 19 + Tailwind 4 forment la base front. @supabase/supabase-js + @supabase/ssr + TanStack Query gèrent le data layer sans conflit. Zustand (UI only) et TanStack Query (données serveur) ont une séparation claire. Server Actions dans des packages monorepo sont supportés depuis Next.js 14+ avec directive `"use server"`.

**Cohérence des patterns :** Les 3 patterns de data fetching (RSC/Server Actions/API Routes) sont alignés avec les capabilities de chaque couche. La transformation snake_case↔camelCase à la frontière DB/API est cohérente. Le module manifest contract est compatible avec le registry auto-découvert + next/dynamic.

**Alignement structure :** `packages/supabase/` partagé élimine la duplication. Les routes apps sont des coquilles vides, toute la logique vit dans les modules. Un seul mécanisme de routage (`modules/[moduleId]/`). Les 6 piliers (déploiement dual, catalogue modules, config-driven, communication inter-instances, documentation livrable, surveillance usage) sont cohérents entre eux.

**Modèle de déploiement dual :** Lab (multi-tenant, MonprojetPro) + One (instance par client, propriété client). Hub communique avec les instances via API REST + webhooks signés HMAC. Pas de DB partagée entre Hub et instances One.

**Aucune contradiction détectée.**

### Requirements Coverage Validation

**Functional Requirements — 170 FRs (152 initiales + 18 ajoutées le 08/02) :**

| Statut | Nombre | Détail |
|--------|--------|--------|
| Couvert (initial) | 140 | Mapping explicite vers module + fichier |
| Gap mineur (résolu) | 7 | Couvert implicitement, résolution documentée ci-dessous |
| Ajouté post-validation | 18 | FR153-170 (instance-per-client, Lab 199€) — couverts dans Epics 9, 11, 12 |
| Hors périmètre | 9 | FR15-20d (Orpheus = Cursor/BMAD, hors MonprojetPro) |

**Gaps fonctionnels résolus :**

| FR | Gap | Résolution intégrée |
|----|-----|---------------------|
| FR86 (Sync BMAD local) | Bridge webapp → filesystem | Action dans `modules/documents/` génère webhook vers stockage structuré Supabase que Cursor peut lire |
| FR109-111 (Support/Feedback) | Pas de module explicite | Composant `feedback-form.tsx` + FAQ dans `modules/core-dashboard/`. Table `support_tickets` dans Supabase |
| FR135 (Autosave brouillons) | Pattern non spécifié | `zustand persist` pour brouillons de formulaire avec debounce 2s |
| FR149-150 (Import/Export) | Non mappé | Import CSV → `modules/crm/actions/import-clients.ts`. Export → `modules/admin/actions/export-data.ts` |

**Non-Functional Requirements — 39 NFRs :**

| Statut | Nombre |
|--------|--------|
| Couvert | 36 |
| A préciser lors implémentation | 3 |

| NFR | Note implémentation |
|-----|---------------------|
| NFR-S3 (Argon2) | Supabase Auth utilise bcrypt par défaut. Configurer Argon2 dans GoTrue au setup du projet |
| NFR-S5 (5 tentatives) | Implémenter table `login_attempts` + policy custom. Rate limiting Supabase natif ne suffit pas |
| NFR-R6 (Mode dégradé) | Composant `ServiceUnavailable` dans `@monprojetpro/ui`. TanStack Query `onError` par module pour afficher message explicatif si service externe down |

### Implementation Readiness

**Complétude des décisions :** Toutes les dépendances ont des versions cibles. 10 enforcement guidelines avec exemples. Types partagés définis (ActionResponse, ModuleManifest, ClientConfig).

**Complétude de la structure :** Arbre complet avec chaque fichier nommé. 15 modules catalogués. 15 migrations Supabase. 5 turbo tasks. Package dependency graph.

**Complétude des patterns :** 32 points de conflit identifiés et résolus. Exemples code (bon + anti-pattern) pour chaque catégorie.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] 170 FRs analysés et catégorisés (152 initiales + 18 ajoutées le 08/02)
- [x] 39 NFRs évalués
- [x] Contraintes techniques identifiées
- [x] 7 cross-cutting concerns cartographiés

**Platform Architecture**
- [x] Déploiement dual : Lab multi-tenant + One instance par client (propriété client)
- [x] Catalogue modules plug & play (manifest contract)
- [x] Configuration-driven (client_config Lab + One)
- [x] 2 apps (hub + client template) avec déploiement flexible (1 Lab + N One)
- [x] Communication Hub↔Instances via API REST + webhooks signés HMAC
- [x] Documentation obligatoire par module (guide, FAQ, flows)
- [x] Surveillance usage & workflow upgrade automatique

**Architectural Decisions**
- [x] Data architecture avec versions
- [x] Auth & Security triple couche
- [x] 3 API patterns stricts
- [x] Frontend (Zustand UI, RHF, module loading)
- [x] Infrastructure (Vercel + VPS Docker + Supabase)
- [x] Quality gates automatisés

**Implementation Patterns**
- [x] Naming conventions (DB, API, Code, Files)
- [x] Structure patterns (modules, apps, tests)
- [x] Format patterns (API response, data)
- [x] Communication patterns (Realtime, Zustand)
- [x] Process patterns (error handling, loading)
- [x] 10 enforcement guidelines

**Project Structure**
- [x] Arbre complet (2 apps, 5 packages, 15 modules)
- [x] Frontières API/Data/Module définies
- [x] Mapping FR → fichiers complet
- [x] Flux de données documentés
- [x] Package dependency graph

### Architecture Readiness Assessment

**Status global : PRET POUR IMPLEMENTATION**

**Niveau de confiance : ELEVE**

**Forces clés :**
- Architecture modulaire scalable — pilier central du projet
- Conventions strictes avec exemples concrets pour chaque pattern
- Frontières clairement définies entre modules, apps, packages
- Quality gates automatisés (RLS tests Lab, isolation One, contract tests, docs check, lint, coverage)
- Modèle de propriété client clair : le client One possède son outil
- Déploiement dual flexible : Lab multi-tenant + One instance par client
- Documentation comme livrable intégrée au workflow
- Aucun gap critique bloquant

**Axes d'amélioration future :**
- Pattern Edge Functions Supabase détaillé (transcription, webhooks)
- Pattern cache granulaire (staleTime, gcTime par type de données)
- Animations de transition Lab→One détaillées
- Métriques monitoring Sentry détaillées

### Implementation Handoff

**Directives pour agents IA :**
1. Suivre TOUTES les décisions architecturales exactement comme documenté
2. Utiliser les implementation patterns de manière cohérente dans TOUS les composants
3. Respecter la structure projet et les frontières module/app/package
4. Référencer CE document pour toute question architecturale
5. Créer un `manifest.ts` AVANT tout autre fichier lors de la création d'un module
6. Exécuter les quality gates (RLS tests + contract tests) avant chaque merge

**Première priorité d'implémentation :**
1. Setup monorepo (packages/supabase, packages/types, turbo tasks)
2. Migrations Supabase (tables + RLS + fonctions)
3. Module `core-dashboard` + shell dashboard
4. Auth flow (middleware + login)
5. Premier module métier (chat ou documents)
