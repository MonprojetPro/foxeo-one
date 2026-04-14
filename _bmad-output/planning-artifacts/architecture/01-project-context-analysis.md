# Project Context Analysis

[< Retour à l'index](./index.md) | [Section suivante : Platform Architecture >](./02-platform-architecture.md)

---

### Requirements Overview

**Functional Requirements:**

170 FRs couvrant l'écosystème complet MonprojetPro, organisés en 28 catégories :

- **Hub (MiKL)** : Gestion clients (FR1-7), Validation Hub (FR8-14), Élio Hub (FR21-25), Gestion avancée (FR77-81), Administration (FR102-105), Workflow quotidien (FR130-133)
- **Lab (Clients en création)** : Parcours création (FR26-31), Élio Lab (FR32-37), Onboarding (FR70-73), Facturation forfait Lab (FR169-170)
- **One (Clients établis)** : Structure dashboard (FR38-43), Élio One/One+ (FR44-51), Évolutions
- **Commun** : Auth & Sécurité (FR52-56), Communication (FR57-61), Documents (FR62-65), Profil Communication (FR66-69), Facturation (FR94-98), Notifications (FR99-101), Recherche (FR106-108), Multi-device (FR112-114), Accessibilité (FR117-119), Analytics (FR120-121), Élio UX (FR122-126), Temps réel (FR127-129), Templates (FR137-139), Légal RGPD (FR140-143), Fichiers (FR144-146), Robustesse (FR151-152)
- **Orchestration** : Graduation Lab→One (FR74-76), Parcours alternatifs (FR88-93), Synchronisation BMAD (FR86-87)
- **Instance-per-client** : Propriété client (FR153-155), Provisioning (FR156-157), Documentation livrable (FR158-161), Surveillance usage (FR162-165), Graduation provisioning (FR166-168)
- **Orpheus** : Génération docs sources dans Cursor (FR15-20d) — hors périmètre applicatif MonprojetPro (9 FRs)

**Implications architecturales :** Dashboard client unifié (Lab+One) avec feature-flagging conditionnel, RBAC à 2 rôles (Admin MiKL / Client), système modulaire de configuration par client.

**Non-Functional Requirements:**

39 NFRs structurants pour l'architecture :

- **Performance** : FCP < 2s, actions < 500ms, Élio premier token < 3s, recherche < 1s, notifications temps réel < 2s
- **Sécurité** : TLS 1.3, AES-256 au repos, Argon2, sessions 8h inactivité, RLS Supabase, conformité RGPD
- **Scalabilité** : 50 clients simultanés, 100 requêtes Élio/h par client, 1 Go/client, migration VPS sans refonte
- **Fiabilité** : 99.5% disponibilité, RPO 24h, RTO 4h, mode dégradé si service externe down
- **Maintenabilité** : Tests unitaires >80%, linting, conventions documentées, mise à jour dépendances mensuelle

**Scale & Complexity:**

- Domaine principal : **Full-stack SaaS B2B** avec composante IA forte
- Niveau de complexité : **Élevé**
- Composants architecturaux estimés : ~15-20 modules applicatifs + 4 services externes + système IA multi-instance

### Technical Constraints & Dependencies

| Contrainte | Impact architectural |
|------------|---------------------|
| **Développeur unique (MiKL + Cursor/BMAD)** | Architecture simple, conventions strictes, automatisation maximale |
| **Budget progressif (0€ → 50€ → 150€/mois)** | Supabase cloud gratuit en V1, migration progressive vers VPS |
| **MVP = Cas client réel complet** | Pas de raccourcis — chaque module doit être production-ready |
| **Open source + SaaS stratégique** | OpenVidu, Cal.com (self-hosted VPS) + Pennylane (SaaS facturation/compta) |
| **Facturation électronique sept. 2026** | Pennylane gère nativement la conformité — pas de dev maison, pas de certification PDP |
| **Stack existante** | Next.js 16, React 19, Tailwind 4, TypeScript, Turborepo — non négociable |
| **Supabase comme backend** | PostgreSQL, Auth, Storage, Realtime, Edge Functions — décision prise |

### Cross-Cutting Concerns Identified

| Préoccupation | Composants impactés | Complexité |
|---------------|---------------------|------------|
| **Auth/RBAC + RLS** | Toutes les pages, toutes les requêtes DB | Haute — 2 rôles, feature-flagging par client, 4 niveaux de sécurité |
| **Temps réel (Supabase Realtime)** | Chat, Notifications, Validation Hub, Présence | Haute — subscriptions multiples, gestion de connexion |
| **Configuration client dynamique** | Modules actifs, thème, Élio config, parcours | Moyenne — table `client_config`, runtime feature flags |
| **Système de webhooks + polling** | Cal.com, OpenVidu (webhooks) + Pennylane (polling cron 5min, pas de webhooks publics) | Moyenne — 2 sources webhook + 1 source polling via Edge Function |
| **Gestion fichiers hybride** | Documents, Visios, Factures, Assets | Moyenne — Supabase Storage V1, migration MinIO V2 |
| **Agents IA (Élio x3)** | Hub, Lab, One — instances par client | Haute — injection contexte, sessions, coûts, rate limiting |
| **Internationalisation (P3)** | UI, emails, documents | Basse (préparer structure, pas implémenter) |
