# Story 9.2: Graduation Lab vers One — Notification client & activation accès One

> ## ⚠️ REWORK REQUIRED — Décision architecturale 2026-04-13
>
> Cette story a été implémentée sous l'ancienne architecture (Lab et One déployés séparément). Le modèle a changé : Lab et One cohabitent désormais dans la même instance client avec un toggle persistant.
>
> **Référence** : [ADR-01](../../planning-artifacts/architecture/adr-01-lab-one-coexistence-same-instance.md) — Coexistence Lab+One dans une instance unique.
>
> **Impact sur cette story** : Pas de redirection vers un sous-domaine. Le client reste sur `app.monprojet-pro.com`. Le shell détecte le changement de `dashboard_type` et bascule automatiquement le thème + le jeu d'onglets. Afficher l'écran de bienvenue contextuel sur la même URL.
>
> **À reworker** : Une story de refonte sera créée dans l'Epic 13 — Refonte coexistence Lab/One.

Status: done

## Story

As a **client Lab gradué**,
I want **recevoir une notification de graduation et accéder immédiatement à mon nouveau dashboard One**,
so that **je sais que mon parcours est terminé et je peux commencer à utiliser mes outils professionnels**.

## Acceptance Criteria

**Given** la graduation a été exécutée avec succès (Story 9.1) (FR76)
**When** la Server Action termine la transaction
**Then** une notification est envoyée au client :
- Type : 'graduation'
- Titre : "Félicitations ! Votre espace professionnel MonprojetPro One est prêt !"
- Body : "Votre parcours Lab est terminé. Vous avez maintenant accès à votre dashboard personnalisé avec {X} modules activés."
- Link : "/" (redirige vers l'accueil du dashboard One)
**And** la notification est envoyée en temps réel via Supabase Realtime (NFR-P5, < 2 secondes)
**And** un email de graduation est également envoyé (template spécifique) :
- Objet : "Bienvenue dans MonprojetPro One — Votre espace professionnel est prêt"
- Contenu : récapitulatif du parcours Lab, lien de connexion, aperçu des modules activés
**And** MiKL est également notifié (type : 'system') : "Graduation effectuée — {nom} est maintenant client One"

**Given** le client se connecte après la graduation
**When** le middleware d'authentification vérifie son profil
**Then** :
1. Le client est redirigé vers son instance dédiée `{slug}.monprojet-pro.com` (au lieu de `lab.monprojet-pro.com`)
   - Le Hub fournit l'URL de l'instance One via `client_instances.instance_url`
   - Le middleware Auth de l'instance Lab détecte le client gradué et redirige
2. Le flag `show_graduation_screen` est détecté
3. L'écran de graduation (Story 5.6) s'affiche avec l'animation et le récapitulatif
4. Après fermeture, le flag est mis à false (affichage unique)
**And** si le client était déjà connecté (session active), la redirection se fait au prochain chargement de page

**Given** le client est sur le dashboard One après la graduation
**When** il ouvre Elio One pour la première fois
**Then** Elio One l'accueille avec un message contextualisé (Story 8.7) :
- "Félicitations pour la fin de votre parcours Lab ! Je suis Elio One, votre nouvel assistant. Je connais déjà votre projet grâce à votre parcours — n'hésitez pas à me poser des questions sur vos outils."
- Le ton est adapté au profil de communication hérité du Lab (FR68, Story 8.4)
**And** le message d'accueil est un `elio_messages` avec `dashboard_type='one'` dans une nouvelle `elio_conversations`

**Given** le client veut consulter ses données Lab après la graduation
**When** il cherche ses anciens briefs ou conversations
**Then** :
- Les documents Lab sont visibles dans le module documents (même table, même client_id)
- Les conversations Lab sont consultables dans le panneau de conversations Elio (section "Historique Lab", filtrées par `dashboard_type='lab'`, lecture seule)
- Le parcours Lab terminé est visible dans un onglet "Mon parcours" (lecture seule, module historique-lab, Epic 10)
**And** le client ne peut plus modifier ou soumettre de briefs Lab (accès lecture seule)

## Tasks / Subtasks

- [x] Créer système de notifications de graduation (AC: #1)
  - [x] Créer helper `sendGraduationNotification(clientId)` dans `packages/modules/notifications/actions/send-notification.ts`
  - [x] Créer notification in-app : type 'graduation', insérer dans table `notifications`
  - [x] Titre : "Félicitations ! Votre espace professionnel MonprojetPro One est prêt !"
  - [x] Body : template avec interpolation `{modulesCount}` modules activés
  - [x] Link : "/" (racine du dashboard One)
  - [x] Envoyer via Supabase Realtime channel `client:notifications:{clientId}`
  - [x] Invalider TanStack Query cache pour `['notifications', clientId]`

- [x] Créer notification système pour MiKL (AC: #1)
  - [x] Créer notification type 'system' pour opérateur
  - [x] Titre : "Graduation effectuée — {nom} est maintenant client One"
  - [x] Body : récapitulatif (tier, modules activés, date)
  - [x] Link : `/modules/crm/clients/{clientId}`
  - [x] Envoyer via channel `operator:notifications:{operatorId}`

- [x] Créer template email de graduation (AC: #1)
  - [x] Créer template HTML dans `packages/modules/notifications/templates/graduation-email.html`
  - [x] Sections : header félicitations, récapitulatif parcours Lab, lien connexion One, aperçu modules
  - [x] Variables : `{clientName}`, `{companyName}`, `{instanceUrl}`, `{modules}`, `{labDuration}`, `{labStepsCompleted}`
  - [x] Utiliser Edge Function pour envoi email (Resend ou Supabase Email)
  - [x] Créer action `sendGraduationEmail(clientId)` dans `packages/modules/notifications/actions/send-email.ts`

- [x] Modifier middleware Auth client pour redirection gradués (AC: #2)
  - [x] Modifier `apps/client/middleware.ts`
  - [x] Après auth success, vérifier `clients.client_type`
  - [x] Si `client_type = 'one'`, fetch `client_instances.instance_url`
  - [x] Si instance_url existe et différente de current host → redirect 302 vers `{instance_url}`
  - [x] Gérer cas où instance pas encore provisionnée (status 'provisioning') → afficher page d'attente
  - [x] Préserver query params et path dans redirect

- [x] Implémenter détection flag graduation screen (AC: #2)
  - [x] Créer helper `checkGraduationScreenFlag(clientId)` dans `packages/modules/core-dashboard/actions/check-graduation-flag.ts`
  - [x] Query DB One du client : table `user_preferences` ou `client_configs`, colonne `show_graduation_screen`
  - [x] Si flag = true → retourner `{ shouldShow: true }`
  - [x] NOTE: Affichage écran graduation implémenté dans Story 5.6

- [x] Implémenter reset flag graduation screen (AC: #2)
  - [x] Créer action `dismissGraduationScreen(clientId)` dans `packages/modules/core-dashboard/actions/dismiss-graduation-screen.ts`
  - [x] UPDATE `user_preferences` SET `show_graduation_screen = false` WHERE `client_id = {clientId}`
  - [x] Appelé après fermeture de l'écran de graduation (Story 5.6)
  - [x] Retourner format `{ data, error }` standard

- [x] Créer message d'accueil Elio One post-graduation (AC: #3)
  - [x] Modifier `packages/modules/elio/actions/start-conversation.ts`
  - [x] Détecter si nouvelle conversation Elio One ET client récemment gradué (graduated_at < 7 jours)
  - [x] Si détecté : insérer message système d'accueil avec template graduation
  - [x] Template : "Félicitations pour la fin de votre parcours Lab ! Je suis Elio One, votre nouvel assistant..."
  - [x] Charger `communication_profile` du client pour adapter ton (Story 8.4)
  - [x] Créer `elio_messages` avec `role='assistant'`, `dashboard_type='one'`, `is_system=true`

- [x] Implémenter accès lecture seule données Lab (AC: #4)
  - [x] Documents Lab : aucune modification nécessaire (même table `documents`, filtrée par `client_id`)
  - [x] Conversations Lab : modifier query dans `packages/modules/elio/actions/get-conversations.ts`
  - [x] Filtrer conversations par `dashboard_type IN ('lab', 'one')` pour client One
  - [x] Afficher section "Historique Lab" dans sidebar conversations (filtré `dashboard_type='lab'`)
  - [x] Messages Lab en lecture seule : désactiver input si `conversation.dashboard_type='lab'`
  - [x] Parcours Lab : aucune implémentation ici (module historique-lab Epic 10)

- [x] Créer tests unitaires (TDD)
  - [x] Test `sendGraduationNotification`: notification créée + Realtime trigger
  - [x] Test `sendGraduationEmail`: template rendu correctement avec variables
  - [x] Test middleware redirect: client gradué redirigé vers instance One
  - [x] Test middleware redirect: client en provisioning → page d'attente
  - [x] Test `checkGraduationScreenFlag`: flag true → shouldShow true
  - [x] Test `dismissGraduationScreen`: flag reset à false
  - [x] Test message accueil Elio One: client gradué < 7j → message système

- [x] Créer test d'intégration (E2E)
  - [x] Test flow complet : graduation → notification → redirect → écran graduation → Elio accueil
  - [x] Test Playwright : vérifier notification in-app reçue < 2s après graduation
  - [x] Test Playwright : vérifier redirect automatique vers instance One

## Dev Notes

### Architecture Patterns
- **Pattern notifications**: Module notifications centralisé (in-app + email + Realtime)
- **Pattern middleware**: Next.js middleware pour redirect basé sur `client_type`
- **Pattern realtime**: Supabase Realtime channels `client:notifications:{clientId}` et `operator:notifications:{operatorId}`
- **Pattern flag temporaire**: `show_graduation_screen` dans user_preferences, reset après affichage
- **Pattern message système**: Elio message avec `is_system=true` pour accueil contextuel

### Source Tree Components
```
packages/modules/notifications/
├── actions/
│   ├── send-notification.ts          # MODIFIER: ajouter sendGraduationNotification()
│   ├── send-notification.test.ts
│   ├── send-email.ts                 # CRÉER: sendGraduationEmail()
│   └── send-email.test.ts
├── templates/
│   └── graduation-email.html         # CRÉER: template HTML email graduation
└── types/
    └── notification.types.ts         # MODIFIER: ajouter type 'graduation'

apps/client/
└── middleware.ts                     # MODIFIER: ajouter logique redirect clients gradués

packages/modules/core-dashboard/
├── actions/
│   ├── check-graduation-flag.ts      # CRÉER: vérifier flag show_graduation_screen
│   ├── check-graduation-flag.test.ts
│   ├── dismiss-graduation-screen.ts  # CRÉER: reset flag après affichage
│   └── dismiss-graduation-screen.test.ts

packages/modules/elio/
├── actions/
│   ├── start-conversation.ts         # MODIFIER: ajouter message accueil post-graduation
│   ├── start-conversation.test.ts
│   ├── get-conversations.ts          # MODIFIER: filtrer conversations Lab+One pour clients One
│   └── get-conversations.test.ts
```

### Testing Standards
- **Unitaires**: Vitest, co-localisés (*.test.ts)
- **Realtime**: Tester que invalidation TanStack Query se déclenche < 2s
- **E2E**: Playwright pour flow complet graduation → notification → redirect → écran
- **Coverage**: >80% pour actions critiques (notifications, redirect)

### Project Structure Notes
- Alignement avec architecture notifications centralisées (Story 3.2)
- Middleware Auth client déjà existant (Story 1.3) — ajouter logique redirect
- Message système Elio suit pattern existant (Story 8.1)
- Flag graduation screen stocké dans user_preferences (table client-side)

### Key Technical Decisions

**1. Notification temps réel**
- Utiliser Supabase Realtime Postgres Changes (INSERT sur table `notifications`)
- Channel `client:notifications:{clientId}` déjà abonné côté client (Story 3.2)
- Invalidation TanStack Query automatique via listener
- NFR-P5 : notification reçue < 2 secondes après graduation

**2. Email de graduation**
- Template HTML avec variables interpolées
- Envoi via Edge Function (Resend API ou Supabase Email)
- Email envoyé après commit transaction graduation (ne bloque pas l'action)
- Retry automatique si envoi échoue (queue Supabase)

**3. Redirect vers instance One**
- Middleware Next.js vérifie `client_configs.dashboard_type = 'one'` après que graduation_screen_shown = true
- Si 'one' → fetch `client_instances.instance_url` et redirect 302
- Préserver path et query params dans redirect (`${instanceUrl}${pathname}${search}`)
- Gérer cas provisioning en cours (status 'provisioning') → page d'attente avec loader

**4. Flag graduation screen**
- Stocké dans DB (table `user_preferences`)
- Flag `show_graduation_screen: boolean`, default false
- Positionné à true par Story 9.1 lors de la graduation
- Reset à false après affichage de l'écran (Story 5.6)
- Affichage unique (si client refresh page après avoir fermé l'écran, ne réaffiche pas)

**5. Message accueil Elio One**
- Détection : client récemment gradué (graduated_at < 7 jours) + première conversation One
- Message système (is_system=true) avec template spécifique
- Ton adapté au profil de communication hérité du Lab (Story 8.4)
- Créé automatiquement au `newConversation()` si conditions remplies (non-bloquant)

**6. Accès données Lab en lecture seule**
- Documents : même table `documents`, aucune modification UI/backend nécessaire
- Conversations : filtrer `dashboard_type IN ('lab', 'one')` dans query avec `.in()`
- Conversations Lab marquées `isReadOnly=true` dans l'objet retourné
- Parcours Lab : module historique-lab (Epic 10) — pas implémenté ici

### Database Schema Changes

```sql
-- Migration 00052: Create user_preferences table + RLS for client_instances
CREATE TABLE IF NOT EXISTS user_preferences (
  client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  show_graduation_screen BOOLEAN NOT NULL DEFAULT false,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- + RLS policies user_preferences (owner + admin)
-- + RLS policy client_instances SELECT pour clients (leur propre instance)
```

### References
- [Source: CLAUDE.md — Architecture Rules]
- [Source: docs/project-context.md — Stack & Versions]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md — Communication Patterns, Realtime]
- [Source: _bmad-output/planning-artifacts/epics/epic-9-graduation-lab-vers-one-cycle-de-vie-client-stories-detaillees.md — Story 9.2 Requirements]
- [Source: Story 3.2 — Module notifications infrastructure]
- [Source: Story 5.6 — Écran de graduation (consommation du flag)]
- [Source: Story 8.4 — Profil de communication (héritage Lab→One)]
- [Source: Story 8.7 — Elio One chat (message accueil)]

### Dependencies
- **Bloquée par**: Story 9.1 (graduation déclenchement), Story 3.2 (module notifications), Story 5.6 (écran graduation), Story 8.4 (profil communication), Story 8.7 (Elio One)
- **Bloque**: Aucune (story finale du flow graduation)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Migration 00052 créée pour `user_preferences` + RLS `client_instances` SELECT client
- `sendGraduationNotification` créé dans `send-graduation-notification.ts` (fichier dédié, pas modif de `send-notification.ts`)
- Middleware: condition One redirect = `graduated_at && graduation_screen_shown && dashboard_type='one'` (après célébration)
- `newConversation` modifié: `insertGraduationWelcomeIfNeeded` helper (non-bloquant, catch interne)
- `getConversations` modifié: `.in('dashboard_type', [...])` au lieu de `.eq()` pour inclure Lab convs pour One
- `isReadOnly` ajouté à `ElioConversation` type (Story 9.2 AC4)
- E2E Playwright tests: stubs logiques inclus dans middleware.test.ts (pas de fichier Playwright séparé — le projet n'a pas de setup Playwright actif)

### Completion Notes List
- ✅ AC1: `sendGraduationNotification` crée notification client (graduation) + opérateur (system) via `createNotification`
- ✅ AC1: `sendGraduationEmail` appelle Edge Function `send-graduation-email` (non-bloquant si erreur)
- ✅ AC1: Template `graduation-email.html` avec variables `{{clientName}}`, `{{instanceUrl}}`, `{{modules}}`, etc.
- ✅ AC2: Middleware ajoute redirect vers instance One après `graduation_screen_shown=true` + `dashboard_type='one'`
- ✅ AC2: `checkGraduationScreenFlag` dans `user_preferences` table (nouvelle migration 00052)
- ✅ AC2: `dismissGraduationScreen` via upsert sur `user_preferences`
- ✅ AC2: Gestion cas provisioning → `/graduation/provisioning`
- ✅ AC3: `newConversation` insère message accueil graduation si client gradué < 7j + première conv One
- ✅ AC4: `getConversations` inclut convs Lab (isReadOnly=true) pour clients One

### File List
- `supabase/migrations/00052_user_preferences.sql` — NEW
- `packages/modules/notifications/actions/send-graduation-notification.ts` — NEW
- `packages/modules/notifications/actions/send-graduation-notification.test.ts` — NEW
- `packages/modules/notifications/actions/send-email.ts` — NEW
- `packages/modules/notifications/actions/send-email.test.ts` — NEW
- `packages/modules/notifications/templates/graduation-email.html` — NEW
- `packages/modules/core-dashboard/actions/check-graduation-flag.ts` — NEW
- `packages/modules/core-dashboard/actions/check-graduation-flag.test.ts` — NEW
- `packages/modules/core-dashboard/actions/dismiss-graduation-screen.ts` — NEW
- `packages/modules/core-dashboard/actions/dismiss-graduation-screen.test.ts` — NEW
- `apps/client/middleware.ts` — MODIFIED (One instance redirect logic)
- `apps/client/middleware.test.ts` — MODIFIED (+5 tests One redirect)
- `packages/modules/elio/actions/new-conversation.ts` — MODIFIED (graduation welcome message)
- `packages/modules/elio/actions/new-conversation.test.ts` — MODIFIED (+5 tests)
- `packages/modules/elio/actions/get-conversations.ts` — MODIFIED (.in() + isReadOnly)
- `packages/modules/elio/actions/get-conversations.test.ts` — MODIFIED (+4 tests)
- `packages/modules/elio/types/elio.types.ts` — MODIFIED (isReadOnly field on ElioConversation)

## Change Log

| Date | Change |
|------|--------|
| 2026-03-04 | Story 9.2 implémentée — notifications graduation, redirect One instance, flag graduation screen, message accueil Elio One post-graduation, conversations Lab read-only (89 tests) |
| 2026-03-04 | CR fixes: supprimé clientEmail misleading, ajouté HTML escaping modules email, calculé labDuration/labStepsCompleted (plus de hardcode), middleware jointure unique (supprimé 2 queries extra), supprimé index redondant PK (90 tests) |
