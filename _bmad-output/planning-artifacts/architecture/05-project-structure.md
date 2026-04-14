# Project Structure & Boundaries

[< Retour à l'index](./index.md) | [< Section précédente](./04-implementation-patterns.md) | [Section suivante >](./06-validation-results.md)

---

_Structure validée après revue Party Mode (Amelia, Murat, Sally, John) — 06/02/2026. Ajustements intégrés : packages/supabase partagé, actions métier uniquement dans modules, tout passe par le module registry (pas de routes statiques), fixtures de test, themes/assets dans @monprojetpro/ui._

### Complete Project Directory Structure

```
monprojetpro-dash/
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Lint + TypeScript + Tests + Build
│       └── rls-tests.yml                   # Tests isolation RLS (bloquant)
│
├── .env.example                            # Template variables d'environnement
├── .gitignore
├── .eslintrc.js                            # ESLint config racine
├── turbo.json                              # Configuration Turborepo
├── package.json                            # Workspace root
├── tsconfig.json                           # TypeScript racine
├── README.md
│
├── apps/
│   ├── hub/                                # FOXEO-HUB (opérateur/admin MiKL)
│   │   ├── app/
│   │   │   ├── (auth)/                     # Routes publiques (non-auth)
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx            # Login MiKL (email + 2FA)
│   │   │   │   └── layout.tsx              # Layout auth minimal
│   │   │   │
│   │   │   ├── (dashboard)/                # Routes authentifiées (shell dashboard)
│   │   │   │   ├── layout.tsx              # Dashboard shell Hub (sidebar dynamique, header, notifications)
│   │   │   │   ├── loading.tsx             # Skeleton shell complet (sidebar + header + zone contenu)
│   │   │   │   ├── page.tsx                # Accueil Hub (résumé, actions urgentes, stats)
│   │   │   │   │
│   │   │   │   └── modules/                # TOUT passe par le module registry
│   │   │   │       └── [moduleId]/         # Route dynamique — charge le module via registry
│   │   │   │           ├── page.tsx         # Charge le module correspondant
│   │   │   │           ├── loading.tsx      # Skeleton loader du module
│   │   │   │           └── error.tsx        # Error boundary du module
│   │   │   │
│   │   │   ├── api/
│   │   │   │   ├── webhooks/               # Callbacks externes + instances
│   │   │   │   │   ├── cal-com/
│   │   │   │   │   │   └── route.ts        # Webhook Cal.com → création prospect
│   │   │   │   │   ├── pennylane/
│   │   │   │   │   │   └── route.ts        # (Réservé) Webhook Pennylane si disponible à l'avenir
│   │   │   │   │   ├── openvidu/
│   │   │   │   │   │   └── route.ts        # Webhook OpenVidu → recording ready
│   │   │   │   │   └── client-instance/
│   │   │   │   │       └── route.ts        # Webhook instances One/Lab → usage, santé, événements
│   │   │   │   └── instances/              # API Hub → Instances (HMAC signé)
│   │   │   │       ├── [instanceId]/
│   │   │   │       │   ├── sync/
│   │   │   │       │   │   └── route.ts    # Push config/updates vers instance
│   │   │   │       │   └── health/
│   │   │   │       │       └── route.ts    # Health check instance
│   │   │   │       └── provision/
│   │   │   │           └── route.ts        # Provisioning nouvelle instance One
│   │   │   │
│   │   │   ├── layout.tsx                  # Root layout (providers)
│   │   │   └── globals.css                 # Import theme Hub (palette bordeaux)
│   │   │
│   │   ├── middleware.ts                    # Auth middleware (vérifie admin + 2FA)
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── client/                              # FOXEO-CLIENT (template — déployé Lab multi-tenant + One par client)
│       │                                    # Lab: lab.monprojet-pro.com (1 deployment, DB partagée)
│       │                                    # One: {slug}.monprojet-pro.com (1 deployment par client, DB dédiée)
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/
│       │   │   │   └── page.tsx             # Login client (email + mdp)
│       │   │   └── layout.tsx
│       │   │
│       │   ├── (dashboard)/
│       │   │   ├── layout.tsx               # Dashboard shell client (sidebar dynamique)
│       │   │   ├── loading.tsx              # Skeleton shell complet (sidebar + header + zone contenu)
│       │   │   ├── page.tsx                 # Accueil client (adapté Lab/One via config)
│       │   │   │
│       │   │   └── modules/                 # TOUT passe par le module registry
│       │   │       └── [moduleId]/          # Route dynamique — charge le module via registry
│       │   │           ├── page.tsx          # Charge le module correspondant
│       │   │           ├── loading.tsx       # Skeleton loader du module
│       │   │           └── error.tsx         # Error boundary du module
│       │   │
│       │   ├── api/
│       │   │   └── hub/                      # API Hub↔Client (communication inter-instances)
│       │   │       ├── sync/
│       │   │       │   └── route.ts          # Sync état client → Hub
│       │   │       └── health/
│       │   │           └── route.ts          # Health check pour monitoring Hub
│       │   │
│       │   ├── layout.tsx
│       │   └── globals.css                   # Import theme dynamique (Lab/One)
│       │
│       ├── middleware.ts                      # Auth middleware (Lab: client_id + RLS / One: single-tenant)
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── ui/                                   # @monprojetpro/ui — Design system partagé
│   │   ├── src/
│   │   │   ├── index.ts                      # Barrel export
│   │   │   ├── globals.css                   # Variables CSS base + imports themes
│   │   │   │
│   │   │   ├── themes/                       # Palettes par dashboard (Party Mode — Sally)
│   │   │   │   ├── hub.css                   # Variables OKLCH palette bordeaux #6B1B1B
│   │   │   │   ├── lab.css                   # Variables OKLCH palette vert émeraude #2E8B57
│   │   │   │   └── one.css                   # Variables OKLCH palette orange #F7931E
│   │   │   │
│   │   │   ├── assets/                       # Assets visuels partagés (Party Mode — Sally)
│   │   │   │   └── illustrations/
│   │   │   │       ├── welcome-lab.svg       # Illustration bienvenue Lab
│   │   │   │       ├── welcome-one.svg       # Illustration graduation One
│   │   │   │       └── empty-state.svg       # Illustrations états vides
│   │   │   │
│   │   │   ├── button.tsx                    # Existant
│   │   │   ├── card.tsx                      # Existant
│   │   │   ├── input.tsx                     # Existant
│   │   │   ├── dialog.tsx                    # Existant
│   │   │   ├── select.tsx                    # Existant
│   │   │   ├── skeleton.tsx                  # Existant
│   │   │   ├── tabs.tsx                      # Existant
│   │   │   ├── tooltip.tsx                   # Existant
│   │   │   ├── sidebar.tsx                   # Existant
│   │   │   ├── ... (autres composants shadcn existants)
│   │   │   │
│   │   │   ├── dashboard-shell.tsx           # Shell partagé (sidebar + header + slot contenu)
│   │   │   ├── module-skeleton.tsx           # Skeleton loader générique module
│   │   │   ├── shell-skeleton.tsx            # Skeleton shell complet (Party Mode — Sally)
│   │   │   ├── toast.tsx                     # Notifications toast
│   │   │   ├── data-table.tsx               # Table de données réutilisable
│   │   │   ├── search-command.tsx            # Recherche globale (Raycast-like)
│   │   │   ├── empty-state.tsx              # États vides explicatifs (FR73)
│   │   │   └── use-mobile.ts                # Existant
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── supabase/                             # @monprojetpro/supabase — Client + helpers partagés (Party Mode — Amelia)
│   │   ├── src/
│   │   │   ├── index.ts                      # Barrel export
│   │   │   ├── client.ts                     # createBrowserClient()
│   │   │   ├── server.ts                     # createServerClient()
│   │   │   ├── middleware.ts                 # createMiddlewareClient()
│   │   │   ├── realtime.ts                   # Helpers channels + patterns invalidation TanStack Query
│   │   │   └── providers/
│   │   │       ├── query-provider.tsx        # TanStack Query provider
│   │   │       ├── realtime-provider.tsx     # Supabase Realtime provider
│   │   │       └── theme-provider.tsx        # Thème OKLCH dynamique
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── utils/                                # @monprojetpro/utils — Utilitaires partagés
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── cn.ts                         # Existant (classnames)
│   │   │   ├── date.ts                       # Existant (formatRelativeDate)
│   │   │   ├── case-transform.ts             # toCamelCase / toSnakeCase
│   │   │   ├── format-currency.ts            # Formatage montants (centimes → €)
│   │   │   ├── validation-schemas.ts         # Schémas Zod partagés
│   │   │   └── module-registry.ts            # Registry auto-découvert modules (Party Mode — Amelia)
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── tsconfig/                             # @monprojetpro/tsconfig — Configs TypeScript
│   │   ├── base.json                         # Existant
│   │   ├── nextjs.json                       # Existant
│   │   ├── react-library.json                # Existant
│   │   └── package.json
│   │
│   ├── types/                                # @monprojetpro/types — Types partagés
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── database.types.ts             # Généré par `turbo gen:types` (jamais édité à la main)
│   │   │   ├── module-manifest.ts            # Interface ModuleManifest
│   │   │   ├── action-response.ts            # Type ActionResponse<T>
│   │   │   ├── auth.types.ts                 # Types Auth (UserRole, Session)
│   │   │   └── client-config.types.ts        # Types ClientConfig
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── modules/                              # CATALOGUE DE MODULES
│       │
│       ├── core-dashboard/                   # Module socle — toujours actif
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub', 'client-lab', 'client-one']
│       │   ├── docs/                         # Documentation livrable (obligatoire)
│       │   │   ├── guide.md                  # Guide utilisateur
│       │   │   ├── faq.md                    # FAQ
│       │   │   └── flows.md                  # Flux utilisateur
│       │   ├── components/
│       │   │   ├── welcome-screen.tsx        # Écran bienvenue (FR70, FR72)
│       │   │   ├── dashboard-home.tsx        # Vue d'ensemble
│       │   │   ├── breadcrumb-nav.tsx        # Fil d'ariane (FR108)
│       │   │   ├── global-search.tsx         # Recherche globale (FR106-107)
│       │   │   ├── context-bar.tsx           # Météo, date, salutation
│       │   │   └── profil-settings.tsx       # Profil + préférences utilisateur
│       │   ├── hooks/
│       │   │   └── use-client-config.ts
│       │   ├── actions/
│       │   │   └── update-preferences.ts
│       │   └── types/
│       │       └── core.types.ts
│       │
│       ├── chat/                             # Module chat (FR57, FR127-129)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub', 'client-lab', 'client-one']
│       │   ├── components/
│       │   │   ├── chat-window.tsx
│       │   │   ├── chat-message.tsx
│       │   │   ├── chat-input.tsx
│       │   │   └── chat-list.tsx
│       │   ├── hooks/
│       │   │   ├── use-chat-messages.ts      # TanStack Query + Realtime
│       │   │   └── use-chat-presence.ts      # Indicateur en ligne (FR129)
│       │   ├── actions/
│       │   │   └── send-message.ts
│       │   └── types/
│       │       └── chat.types.ts
│       │
│       ├── elio/                             # Module Agent IA Élio (FR21-25, FR32-37, FR44-51)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub', 'client-lab', 'client-one']
│       │   ├── components/
│       │   │   ├── elio-chat.tsx
│       │   │   ├── elio-thinking.tsx         # Indicateur réflexion (FR122)
│       │   │   ├── elio-feedback.tsx         # Feedback utile/pas utile (FR126)
│       │   │   └── elio-document.tsx         # Documents dans le chat (FR125)
│       │   ├── hooks/
│       │   │   ├── use-elio-chat.ts
│       │   │   └── use-elio-config.ts
│       │   ├── actions/
│       │   │   ├── send-to-elio.ts
│       │   │   ├── new-conversation.ts       # FR124
│       │   │   └── submit-feedback.ts
│       │   └── types/
│       │       └── elio.types.ts
│       │
│       ├── documents/                        # Module documents (FR62-65, FR144-146)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub', 'client-lab', 'client-one']
│       │   ├── components/
│       │   │   ├── document-list.tsx
│       │   │   ├── document-viewer.tsx       # Rendu HTML (FR62)
│       │   │   ├── document-upload.tsx       # Upload avec validation (FR144-145)
│       │   │   └── folder-tree.tsx           # Organisation dossiers (FR146)
│       │   ├── hooks/
│       │   │   └── use-documents.ts
│       │   ├── actions/
│       │   │   ├── upload-document.ts
│       │   │   ├── share-document.ts         # Partage MiKL→client (FR64)
│       │   │   └── download-pdf.ts
│       │   └── types/
│       │       └── document.types.ts
│       │
│       ├── visio/                            # Module visio (FR58-60, OpenVidu)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub', 'client-lab', 'client-one']
│       │   ├── components/
│       │   │   ├── visio-room.tsx
│       │   │   ├── visio-controls.tsx
│       │   │   ├── visio-history.tsx
│       │   │   └── transcription-viewer.tsx
│       │   ├── hooks/
│       │   │   └── use-visio-room.ts
│       │   ├── actions/
│       │   │   ├── create-room.ts
│       │   │   ├── start-recording.ts        # Hub uniquement
│       │   │   └── start-transcription.ts    # Hub uniquement
│       │   └── types/
│       │       └── visio.types.ts
│       │
│       ├── crm/                              # Module CRM Hub (FR1-7, FR77-81, FR130-133)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub']
│       │   ├── components/
│       │   │   ├── client-card.tsx
│       │   │   ├── client-list.tsx
│       │   │   ├── client-create-form.tsx
│       │   │   ├── client-timeline.tsx
│       │   │   ├── client-notes.tsx          # Notes privées (FR79)
│       │   │   ├── pinned-clients.tsx        # Clients prioritaires (FR131)
│       │   │   └── reminders.tsx             # Rappels (FR132-133)
│       │   ├── hooks/
│       │   │   └── use-clients.ts
│       │   ├── actions/
│       │   │   ├── create-client.ts
│       │   │   ├── update-client.ts
│       │   │   └── manage-reminders.ts
│       │   └── types/
│       │       └── crm.types.ts
│       │
│       ├── notifications/                    # Module notifications (FR61, FR99-101)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub', 'client-lab', 'client-one']
│       │   ├── components/
│       │   │   ├── notification-center.tsx
│       │   │   ├── notification-badge.tsx
│       │   │   └── notification-prefs.tsx    # FR100
│       │   ├── hooks/
│       │   │   └── use-notifications.ts
│       │   ├── actions/
│       │   │   └── update-notification-prefs.ts
│       │   └── types/
│       │       └── notification.types.ts
│       │
│       ├── facturation/                      # Module facturation (FR94-98, Pennylane API v2)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub', 'client-one']
│       │   ├── components/
│       │   │   ├── invoice-list.tsx
│       │   │   ├── quote-form.tsx
│       │   │   ├── payment-status.tsx
│       │   │   ├── billing-history.tsx
│       │   │   └── financial-overview.tsx     # Vue santé financière Hub (balance, CA)
│       │   ├── hooks/
│       │   │   └── use-invoices.ts
│       │   ├── actions/
│       │   │   ├── create-quote.ts           # Proxy → Pennylane API v2
│       │   │   ├── create-invoice.ts         # Proxy → Pennylane customer_invoices
│       │   │   └── create-subscription.ts    # Proxy → Pennylane billing_subscriptions
│       │   ├── config/
│       │   │   └── pennylane.ts              # Client HTTP Pennylane (Bearer token, env vars)
│       │   └── types/
│       │       └── facturation.types.ts
│       │
│       ├── parcours-lab/                     # Module parcours Lab (FR26-31)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['client-lab']
│       │   ├── components/
│       │   │   ├── parcours-progress.tsx
│       │   │   ├── etape-detail.tsx
│       │   │   ├── brief-submit.tsx
│       │   │   └── one-teasing.tsx           # Teasing MonprojetPro One (FR31)
│       │   ├── hooks/
│       │   │   └── use-parcours.ts
│       │   ├── actions/
│       │   │   └── submit-brief.ts
│       │   └── types/
│       │       └── parcours.types.ts
│       │
│       ├── validation-hub/                   # Module Validation Hub (FR8-14)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub']
│       │   ├── components/
│       │   │   ├── validation-queue.tsx
│       │   │   ├── request-detail.tsx
│       │   │   └── action-picker.tsx         # Choix action (FR13)
│       │   ├── hooks/
│       │   │   └── use-validation-queue.ts
│       │   ├── actions/
│       │   │   ├── approve-request.ts
│       │   │   ├── reject-request.ts
│       │   │   └── request-clarification.ts
│       │   └── types/
│       │       └── validation.types.ts
│       │
│       ├── agenda/                           # Module agenda (Cal.com intégré)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub', 'client-lab', 'client-one']
│       │   ├── components/
│       │   │   ├── calendar-view.tsx
│       │   │   ├── booking-form.tsx
│       │   │   └── next-appointment.tsx
│       │   ├── hooks/
│       │   │   └── use-calendar.ts
│       │   ├── actions/
│       │   │   └── create-booking.ts
│       │   └── types/
│       │       └── agenda.types.ts
│       │
│       ├── analytics/                        # Module analytics Hub (FR80, FR120-121)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub']
│       │   ├── components/
│       │   │   ├── stats-overview.tsx
│       │   │   └── usage-metrics.tsx
│       │   ├── hooks/
│       │   │   └── use-analytics.ts
│       │   └── types/
│       │       └── analytics.types.ts
│       │
│       ├── admin/                            # Module administration (FR102-105, FR147-148)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub']
│       │   ├── components/
│       │   │   ├── activity-logs.tsx         # Logs activité (FR102)
│       │   │   ├── maintenance-mode.tsx      # Mode maintenance (FR103)
│       │   │   ├── data-export.tsx           # Export données client (FR104)
│       │   │   ├── system-health.tsx         # Santé système (FR147-148)
│       │   │   └── instance-monitor.tsx      # Surveillance instances One (usage, seuils)
│       │   ├── hooks/
│       │   │   ├── use-admin.ts
│       │   │   └── use-instance-health.ts    # Polling santé instances One
│       │   ├── actions/
│       │   │   ├── toggle-maintenance.ts
│       │   │   ├── export-client-data.ts
│       │   │   └── provision-instance.ts     # Script provisioning nouvelle instance One
│       │   └── types/
│       │       └── admin.types.ts
│       │
│       ├── historique-lab/                   # Module historique Lab (FR75, mémoire coaching)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['client-one']
│       │   ├── components/
│       │   │   ├── lab-archive.tsx
│       │   │   └── lab-documents.tsx
│       │   ├── hooks/
│       │   │   └── use-lab-history.ts
│       │   └── types/
│       │       └── historique.types.ts
│       │
│       ├── templates/                        # Module templates parcours (FR137-139, Party Mode — John)
│       │   ├── index.ts
│       │   ├── manifest.ts                   # targets: ['hub']
│       │   ├── components/
│       │   │   ├── template-list.tsx         # Liste templates parcours
│       │   │   ├── template-editor.tsx       # Création/édition template
│       │   │   └── email-template-editor.tsx # Templates emails (FR138)
│       │   ├── hooks/
│       │   │   └── use-templates.ts
│       │   ├── actions/
│       │   │   ├── create-template.ts
│       │   │   └── update-template.ts
│       │   └── types/
│       │       └── template.types.ts
│       │
│       └── [futur-module]/                   # Placeholder — chaque nouveau besoin client
│           ├── docs/                         # Documentation livrable (CI vérifie la présence)
│           │   ├── guide.md
│           │   ├── faq.md
│           │   └── flows.md
│
├── supabase/                                 # Configuration Supabase
│   ├── config.toml                           # Config Supabase CLI
│   ├── seed.sql                              # Données initiales (MiKL operator, modules socle)
│   └── migrations/
│       ├── 00001_operators.sql               # Table operators (multi-opérateur)
│       ├── 00002_clients.sql                 # Table clients
│       ├── 00003_client_configs.sql          # Table client_config (pilier 3)
│       ├── 00004_module_manifests.sql        # Table module_manifests (registre DB)
│       ├── 00005_messages.sql                # Table messages (chat)
│       ├── 00006_documents.sql               # Table documents (avec tags)
│       ├── 00007_notifications.sql           # Table notifications
│       ├── 00008_meetings.sql                # Table meetings + transcripts
│       ├── 00009_parcours.sql                # Tables parcours Lab + parcours_templates (FR137)
│       ├── 00010_validation_requests.sql     # Table demandes validation
│       ├── 00011_elio_conversations.sql      # Table conversations Élio
│       ├── 00012_activity_logs.sql           # Table logs activité
│       ├── 00013_consents.sql                # Table consentements RGPD (FR140-143)
│       ├── 00014_rls_policies.sql            # Policies RLS centralisées
│       └── 00015_rls_functions.sql           # Fonctions is_admin(), is_owner(), is_operator()
│
├── docker/                                   # Services self-hosted
│   ├── docker-compose.yml                    # Compose principal (dev)
│   ├── docker-compose.prod.yml               # Override production
│   ├── openvidu/
│   │   └── agent-speech-processing.yaml
│   └── cal-com/
│       └── .env.example
│
├── tests/                                    # Tests d'intégration cross-app
│   ├── fixtures/                             # Données de test communes (Party Mode — Murat)
│   │   ├── operators.ts                      # Opérateur de test
│   │   ├── clients.ts                        # Clients de test (Lab, One, Ponctuel)
│   │   ├── client-configs.ts                 # Configs avec différents modules actifs
│   │   └── modules.ts                        # Manifests de test
│   ├── rls/                                  # Tests isolation RLS (obligatoires CI)
│   │   ├── lab-client-isolation.test.ts      # Client Lab A ne voit pas données Client Lab B
│   │   ├── operator-isolation.test.ts        # Opérateur A ne voit pas données Opérateur B
│   │   ├── one-instance-isolation.test.ts    # Instance One ne fuit pas vers Hub/Lab
│   │   └── helpers/
│   │       └── supabase-test-client.ts       # Client test avec différents rôles
│   ├── contracts/                            # Contract tests modules (obligatoires CI)
│   │   ├── module-manifest.test.ts           # Vérifie validité de tous les manifests
│   │   ├── module-docs.test.ts              # Vérifie présence docs/ (guide, faq, flows) par module
│   │   ├── hub-api-contract.test.ts         # Vérifie contrat API Hub↔Instances
│   │   └── required-tables.test.ts           # Vérifie requiredTables ↔ migrations (Party Mode — Murat)
│   └── e2e/                                  # Tests end-to-end (Playwright)
│       ├── playwright.config.ts
│       └── specs/
│           ├── auth.spec.ts
│           └── module-loading.spec.ts
│
└── docs/                                     # Documentation projet
    ├── project-overview.md                   # Existant
    └── project-context.md                    # Règles critiques pour agents IA
```

### Turbo Tasks (Party Mode — Murat)

```json
{
  "tasks": {
    "build": {},
    "dev": { "persistent": true },
    "lint": {},
    "test": { "dependsOn": ["build"] },
    "test:rls": { "dependsOn": ["build"] },
    "test:contracts": { "dependsOn": ["build"] },
    "test:e2e": { "dependsOn": ["build"] },
    "gen:types": {},
    "clean": {}
  }
}
```

| Task | Scope | Exécution |
|------|-------|-----------|
| `turbo test` | Vitest dans chaque package/module (unitaires co-localisés) | CI bloquant |
| `turbo test:rls` | Tests isolation RLS dans `tests/rls/` | CI bloquant |
| `turbo test:contracts` | Contract tests dans `tests/contracts/` | CI bloquant |
| `turbo test:e2e` | Playwright dans `tests/e2e/` | CI bloquant |
| `turbo gen:types` | `supabase gen types` → `packages/types/src/database.types.ts` | Manuel + CI |

### Architectural Boundaries

#### API Boundaries

| Frontière | Direction | Mécanisme |
|-----------|-----------|-----------|
| Hub ↔ Supabase Hub | Direct via `@monprojetpro/supabase` | RLS par operator_id |
| Lab ↔ Supabase Lab | Direct via `@monprojetpro/supabase` | RLS par client_id (multi-tenant) |
| One ↔ Supabase One | Direct via `@monprojetpro/supabase` | Single-tenant (DB dédiée client) |
| **Hub ↔ Instance One** | **API REST + webhooks signés (HMAC)** | **Pas de DB partagée — communication API uniquement** |
| **Hub ↔ Lab** | **API REST + webhooks signés (HMAC)** | **Même pattern que One pour cohérence** |
| Hub ↔ Pennylane | Proxy via Server Actions (dans module facturation) + Edge Function polling (sync cron 5min) | Bearer token dans Supabase Vault |
| Hub ↔ OpenVidu | Proxy via Server Actions (dans module visio) | LiveKit SDK server-side |
| Hub ↔ Cal.com | Webhook entrant | API Route `/api/webhooks/cal-com` |
| Hub ↔ Deepgram | Via Supabase Edge Function post-recording | API key dans Supabase Vault |
| Module ↔ App | Manifest contract | ModuleManifest + registry auto-découvert |

#### Component Boundaries (Party Mode — Amelia)

**Règle absolue : les actions métier vivent dans les modules, pas dans les routes.**

```
apps/hub/app/(dashboard)/modules/[moduleId]/page.tsx
  └── Importe et rend le composant du module via registry
      └── Le module (packages/modules/crm/) contient TOUTE la logique :
          ├── components/ (UI)
          ├── hooks/ (data fetching)
          ├── actions/ (Server Actions = mutations)
          └── types/ (types spécifiques)
```

Les routes Next.js dans `apps/` sont des **coquilles vides** qui :
1. Vérifient l'auth (middleware)
2. Chargent la config client
3. Appellent le module registry pour charger le bon module
4. Fournissent le layout (shell dashboard)

Elles ne contiennent AUCUNE logique métier.

#### Data Boundaries

| Donnée | Source de vérité | Accès |
|--------|-----------------|-------|
| Registre clients (Hub) | Supabase Hub | TanStack Query + RLS operator |
| Données client Lab | Supabase Lab (partagé) | TanStack Query + RLS client_id |
| Données client One | Supabase One (dédié, propriété client) | TanStack Query (single-tenant) |
| Factures, devis, paiements | Pennylane (SaaS) | Proxy API v2 depuis Server Actions + table miroir `billing_sync` via Edge Function polling |
| Rendez-vous | Cal.com DB | Webhook → copie dans Supabase (Hub ou instance) |
| Enregistrements visio | Supabase Storage (instance concernée) | Upload via OpenVidu Egress → S3 |
| Fichiers documents | Supabase Storage (instance concernée) | Upload direct + signed URLs |
| Documentation modules | Fichiers `docs/` dans le repo + Supabase Storage | Indexés par Élio, accessibles via module documents |
| Métriques usage | Supabase Hub (table `instance_metrics`) | Edge Function cron → Hub |
| État UI (sidebar, préfs) | Local browser | Zustand (persist localStorage) |

#### Module Communication Rules

- Un module ne peut PAS importer directement un autre module
- Communication inter-modules via : Supabase (données), Realtime (événements), TanStack Query (cache partagé)
- Chaque module déclare ses `dependencies` dans le manifest
- Le registry résout les dépendances au chargement
- Si un module dépend de données d'un autre, il requête Supabase directement (RLS garantit l'accès)

### Requirements to Structure Mapping

| Catégorie FR | Module | Fichiers clés |
|-------------|--------|---------------|
| FR1-7 (Gestion clients) | `modules/crm/` | client-card.tsx, create-client.ts |
| FR8-14 (Validation Hub) | `modules/validation-hub/` | validation-queue.tsx, approve-request.ts |
| FR21-25 (Élio Hub) | `modules/elio/` | elio-chat.tsx (config Hub) |
| FR26-31 (Parcours Lab) | `modules/parcours-lab/` | parcours-progress.tsx, submit-brief.ts |
| FR32-37 (Élio Lab) | `modules/elio/` | elio-chat.tsx (config Lab) |
| FR38-43 (Structure One) | `modules/core-dashboard/` | dashboard-home.tsx, module-registry |
| FR44-51 (Élio One) | `modules/elio/` | elio-chat.tsx (config One) |
| FR52-56 (Auth) | `packages/supabase/`, `apps/*/middleware.ts` | middleware.ts, server.ts |
| FR57-61 (Communication) | `modules/chat/` + `modules/visio/` | chat-window.tsx, visio-room.tsx |
| FR62-65 (Documents) | `modules/documents/` | document-list.tsx, upload-document.ts |
| FR66-69 (Profil comm) | `packages/types/` + `modules/elio/` | client-config.types.ts |
| FR70-76 (Onboarding + Graduation) | `modules/core-dashboard/` + `modules/historique-lab/` | welcome-screen.tsx |
| FR77-81 (Gestion avancée) | `modules/crm/` | client-notes.tsx, reminders.tsx |
| FR94-98 (Facturation) | `modules/facturation/` | invoice-list.tsx, create-quote.ts |
| FR99-101 (Notifications) | `modules/notifications/` | notification-center.tsx |
| FR102-105 (Admin) | `modules/admin/` | activity-logs.tsx, maintenance-mode.tsx |
| FR106-108 (Recherche) | `modules/core-dashboard/` | global-search.tsx, breadcrumb-nav.tsx |
| FR120-121 (Analytics) | `modules/analytics/` | stats-overview.tsx |
| FR127-129 (Temps réel) | `packages/supabase/src/realtime.ts` | Channels + Presence |
| FR130-133 (Workflow MiKL) | `modules/crm/` | pinned-clients.tsx, reminders.tsx |
| FR137-139 (Templates) | `modules/templates/` | template-editor.tsx |
| FR140-143 (RGPD) | `supabase/migrations/00013_consents.sql` | Consentements dans login flow |
| FR147-148 (Monitoring) | `modules/admin/` | system-health.tsx |

### Data Flow

```
┌──────────────┐     Server Component      ┌──────────────┐
│  Browser     │ ◄──────────────────────── │  Next.js     │
│  (React)     │                           │  Server      │
│              │     Server Action          │              │
│              │ ──────────────────────── ► │  (modules/)  │
│              │                           │              │
│  TanStack    │     Realtime (WS)         │  @monprojetpro/     │
│  Query Cache │ ◄──────────────────────── │  supabase    │
│              │                           │              │
│  Zustand     │     (UI state only)       │              │
│  (local)     │                           │              │
└──────────────┘                           └──────┬───────┘
                                                  │
                                     RLS + Policies
                                                  │
                                           ┌──────▼───────┐
                                           │  Supabase    │
                                           │  PostgreSQL  │
                                           └──────────────┘

External Services:
  Cal.com ──────────► /api/webhooks/cal-com ──────► Supabase (prospect)
  OpenVidu ─────────► /api/webhooks/openvidu ──────► Edge Function (transcription)

Polling Services (pas de webhooks disponibles):
  Edge Function (cron 5min) ──► Pennylane API v2 ──► billing_sync table
       └──► Supabase Realtime ──► invalidate TanStack Query (Hub + Client)

Inter-instances (API REST signées HMAC):
  Hub ─────────────► Instance One /api/hub/sync ──► Config, updates
  Hub ─────────────► Instance One /api/hub/health ► Health check + métriques usage
  Instance One ────► Hub /api/webhooks/client-instance ► Alertes usage, événements
  Hub ─────────────► Lab /api/hub/sync ───────────► Config, updates (même pattern)
```

### Package Dependencies Graph

```
apps/hub ──────┐
               ├──► @monprojetpro/supabase ──► @supabase/supabase-js, @supabase/ssr
apps/client ───┤                        @tanstack/react-query
               ├──► @monprojetpro/ui ─────────► tailwindcss, @radix-ui/*
               ├──► @monprojetpro/utils ──────► zod
               ├──► @monprojetpro/types ──────► (types purs, pas de runtime)
               └──► @monprojetpro/modules/* ──► (chaque module importe ui, utils, types, supabase)

@monprojetpro/tsconfig ──► (extend par tous les packages)
```
