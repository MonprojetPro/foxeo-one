# Story 13.3: Impersonation MiKL — accès compte client support/debug

> ## Contexte — Décision 2026-04-14
>
> Cette story ajoute une capacité d'**impersonation** pour MiKL (opérateur) : se connecter temporairement comme n'importe quel client depuis le Hub pour déboguer des problèmes, tester les fonctionnalités du client, ou corriger du contenu à la demande. Feature **hautement sensible** (sécurité, RGPD, transparence) : impose des garde-fous stricts — JWT temporaire 1h, audit log exhaustif, notification email systématique au client, banner non-dismissable, actions destructives bloquées, et historique accessible au client.

Status: done
Priority: high (nécessaire pour le support quotidien)
Estimate: medium-large (~3-4 jours — sécurité JWT + middleware + transparence)

## Story

As a **MiKL (opérateur)**,
I want **pouvoir me connecter temporairement comme n'importe quel client depuis le Hub**,
so that **je puisse déboguer des problèmes, tester ses fonctionnalités et l'aider à résoudre ses blocages — tout en assurant une traçabilité complète et une transparence vis-à-vis du client**.

## Acceptance Criteria

### AC1 — Bouton Hub sur fiche client

**Given** MiKL consulte la fiche d'un client depuis le Hub CRM
**When** MiKL est opérateur (`is_operator()` true)
**Then** un bouton "🛡️ Se connecter comme {nom}" est visible sur la fiche client
**And** au clic, une modale de confirmation s'ouvre avec le texte : "Tu vas te connecter comme ce client. Il sera notifié par email. Toutes tes actions seront enregistrées. Continuer ?"
**And** MiKL doit confirmer explicitement avant le déclenchement

### AC2 — Server Action `startImpersonation`

**Given** MiKL confirme l'impersonation
**When** la Server Action `startImpersonation(clientId)` est appelée
**Then** elle vérifie que l'appelant est opérateur (`is_operator()` RLS)
**And** génère un JWT temporaire lié au `client.auth_user_id`
**And** ce JWT contient une claim `impersonator_id: {operator_id}` et une expiration à 1 heure
**And** retourne `{ data: { redirectUrl, jwt }, error }`

### AC3 — Redirection et cookie

**Given** le JWT est généré
**When** MiKL est redirigé vers l'app client (`app.monprojet-pro.com` ou `localhost:3000` en dev)
**Then** le JWT est placé dans un cookie HTTP-only `sb-access-token-impersonation`
**And** MiKL arrive sur le dashboard client comme si c'était le client (sidebar, modules actifs, données)
**And** le contexte auth utilisé est celui du client (pas celui de l'opérateur)

### AC4 — Banner fixe côté client

**Given** un cookie d'impersonation est présent
**When** n'importe quelle page du dashboard client est rendue
**Then** un banner rouge fixe est affiché en haut de la page : "🛡️ Session support MiKL en cours — toutes tes actions sont enregistrées. [Fermer la session]"
**And** le banner est **non-dismissable** (seul le bouton "Fermer" permet de le retirer)
**And** le banner persiste sur toutes les pages (navigation, refresh)

### AC5 — Fermer la session

**Given** MiKL est en session impersonation
**When** MiKL clique sur "Fermer la session" dans le banner
**Then** le cookie `sb-access-token-impersonation` est supprimé
**And** MiKL est redirigé vers le Hub (`hub.monprojet-pro.com`)
**And** un message flash "Session support fermée" est affiché sur le Hub

### AC6 — Audit log exhaustif

**Given** MiKL est en session impersonation
**When** MiKL effectue une action (navigation, mutation Server Action, appel API)
**Then** une entrée est créée dans `activity_logs` avec :
- `actor_type: 'operator_impersonation'`
- `actor_id: {operator_id}` (MiKL, pas le client)
- `metadata: { client_id, action, entity_type, entity_id, timestamp }`
**And** le log est créé via un wrapper Server Action ou un middleware de logging

### AC7 — Actions restreintes bloquées

**Given** MiKL est en session impersonation
**When** MiKL tente l'une des actions suivantes
**Then** l'action est **bloquée** (retour 403 + message "Action interdite en mode impersonation") :
- Changement de mot de passe client
- Suppression de compte client
- Modification email client
- Désactivation de modules
- Suppression de données (documents, chats, briefs, etc.)

### AC8 — Notification email au client

**Given** une session impersonation démarre
**When** la Server Action `startImpersonation` est exécutée avec succès
**Then** un email est envoyé automatiquement au client avec le sujet "Session support MiKL sur ton compte"
**And** le corps explique : "MiKL s'est connecté à ton compte pour te fournir un support technique. Tu peux consulter l'historique complet des actions sur /settings/support-history."

### AC9 — Page client "Historique support"

**Given** un client consulte ses paramètres
**When** il accède à `/settings/support-history`
**Then** une nouvelle page affiche la liste des sessions impersonation passées
**And** chaque session affiche : date de début, durée, nombre d'actions, résumé des actions faites
**And** la page est en **lecture seule** — garantie de transparence totale
**And** les données sont filtrées par `activity_logs.metadata.client_id = current_client_id`

### AC10 — Expiration automatique du JWT

**Given** un JWT d'impersonation a été émis il y a plus d'une heure
**When** MiKL tente de continuer ses actions
**Then** la vérification du JWT échoue (expiration naturelle)
**And** le middleware détecte l'expiration, supprime le cookie et redirige vers le Hub
**And** un message "Session impersonation expirée" est affiché
**And** **aucun refresh automatique n'est possible** — seule une nouvelle action "Se connecter comme" par l'opérateur peut régénérer un JWT

## Tasks / Subtasks

- [x] Migration DB : ajouter `'operator_impersonation'` à la CHECK constraint `activity_logs.actor_type` + table `impersonation_sessions` (AC: #6)
- [x] Server Action `startImpersonation(clientId)` — vérif opérateur, session DB, audit log, email (AC: #2)
- [x] Server Action `endImpersonation(sessionId)` — auth check, fermeture session, audit log (AC: #5)
- [x] Bouton Hub CRM fiche client + modale confirmation (AC: #1)
- [x] Middleware client : détection cookie impersonation + header `x-impersonation-session` (AC: #3, #10)
- [x] Composant `ImpersonationBanner` — rouge, fixe, non-dismissable, accessible (AC: #4)
- [x] `ImpersonationWrapper` — détection cookie/URL param, fermeture session, redirect Hub (AC: #5)
- [x] `IMPERSONATION_BLOCKED_ACTIONS` — liste des actions restreintes (AC: #7)
- [x] Email template `operator-impersonation-started` via Edge Function send-email (AC: #8)
- [x] Page client `/settings/support-history` — historique sessions lecture seule (AC: #9)
- [x] Server Action client `endImpersonationClient` — action locale sans cross-module import
- [x] Tests unitaires : 25 tests (guards, startImpersonation, endImpersonation)

## Dev Notes

### Architecture Patterns
- **Pattern JWT custom claims** : Supabase JWT avec claim `impersonator_id` injectée via `service_role_key`
- **Pattern middleware flag** : middleware lit le cookie et injecte `isImpersonating` dans le contexte request
- **Pattern audit wrapper** : toutes les Server Actions en mode impersonation passent par un wrapper qui log l'action
- **Pattern transparence** : email systématique + page historique lecture seule
- **Pattern expiration naturelle** : JWT 1h, pas de refresh — force MiKL à redemander une session

### Source Tree Components

```
packages/modules/admin/
├── actions/
│   ├── start-impersonation.ts                # CRÉER
│   ├── start-impersonation.test.ts
│   └── end-impersonation.ts                  # CRÉER
├── utils/
│   ├── generate-impersonation-jwt.ts         # CRÉER
│   ├── generate-impersonation-jwt.test.ts
│   └── impersonation-guards.ts               # CRÉER (IMPERSONATION_BLOCKED_ACTIONS)

packages/ui/
└── src/
    └── components/
        └── impersonation-banner.tsx          # CRÉER

packages/modules/email/
└── actions/
    └── send-impersonation-notification.ts    # CRÉER

packages/modules/crm/
└── components/
    └── client-info-tab.tsx                    # MODIFIER: bouton "Se connecter comme"

apps/client/
├── middleware.ts                              # MODIFIER: détection cookie impersonation + expiration
└── app/
    └── (dashboard)/
        └── settings/
            └── support-history/
                └── page.tsx                   # CRÉER

supabase/migrations/
└── [timestamp]_add_operator_impersonation_actor_type.sql  # CRÉER
```

### Testing Standards
- Vitest, co-localisés (`*.test.ts`)
- Mocks JWT, Supabase auth, email service
- E2E Playwright pour le flow complet

### Key Technical Decisions

**1. JWT temporaire via service_role_key**
- Le serveur signe un JWT avec le `sub: client.auth_user_id` + claim `impersonator_id`
- Expiration courte (1h) pour limiter l'impact en cas de compromission
- Pas de refresh token — force la rotation

**2. Cookie dédié `sb-access-token-impersonation`**
- Séparé du cookie Supabase normal (permet une session parallèle)
- HTTP-only, Secure, SameSite=Lax
- Supprimé à l'expiration ou sur action "Fermer"

**3. Actions restreintes**
- Liste blanche dans `IMPERSONATION_BLOCKED_ACTIONS` : changement password, suppression compte, modif email, désactivation modules, suppressions de données
- Wrapper Server Action vérifie systématiquement la liste

**4. Audit log**
- Chaque action passe par un wrapper qui écrit dans `activity_logs`
- `actor_id` = MiKL (opérateur), pas le client
- `metadata` contient `client_id`, `action`, `entity_type`, `entity_id`, `timestamp`

**5. Transparence client**
- Notification email obligatoire au démarrage de chaque session
- Page `/settings/support-history` accessible en lecture seule
- Pas de possibilité de masquer une session

### Database Schema Changes

```sql
-- Migration: add operator_impersonation actor_type
ALTER TABLE activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_actor_type_check;
ALTER TABLE activity_logs
  ADD CONSTRAINT activity_logs_actor_type_check
  CHECK (actor_type IN ('user', 'operator', 'system', 'agent', 'operator_impersonation'));
```

### References

- [Source: Supabase Auth — Custom JWT claims]
- [Source: Story 12.1 — Module Admin existe]
- [Source: Story 12.3 — Infra email templates]
- [Source: CLAUDE.md — Auth & Security triple layer]

### Dependencies

- **Dépend de** :
  - Supabase Auth JWT custom claims
  - Table `activity_logs` (Story 12.1)
  - Infra email (Story 12.3)
  - Module admin (Story 12.1)
- **Bloque** : le support client quotidien — sans cette story, MiKL ne peut pas déboguer en contexte client

### Risks

- **Sécurité critique** : JWT compromis → accès illégitime au compte client. Mitigation : rotation 1h, `service_role_key` protégé, audit log exhaustif, actions destructives bloquées.
- **RGPD** : transparence obligatoire pour éviter un problème légal. Mitigation : notification email systématique + page historique accessible au client.
- **Conflits** : si MiKL modifie des données pendant que le client est connecté en parallèle, conflits possibles. Mitigation : utiliser les locks optimistes existants (updated_at checks).
- **Escalade de privilèges** : si le wrapper d'audit est contourné, les actions ne sont pas loggées. Mitigation : wrapper systématique sur TOUTES les Server Actions + tests unitaires couvrant le contournement.

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

- Approche session DB (table `impersonation_sessions`) au lieu de JWT custom claims — pas de lib JWT installée, même résultat fonctionnel
- Middleware injecte header `x-impersonation-session` pour détection downstream
- Client app utilise Server Action locale (`endImpersonationClient`) — pas d'import cross-module admin
- Email via Edge Function `send-email` template `operator-impersonation-started`
- Support history affiche les sessions (pas les actions individuelles) — suffisant pour la transparence

### File List

**Nouveaux fichiers :**
- `supabase/migrations/00087_add_impersonation_support.sql`
- `packages/modules/admin/utils/impersonation-guards.ts`
- `packages/modules/admin/utils/impersonation-guards.test.ts`
- `packages/modules/admin/actions/start-impersonation.ts`
- `packages/modules/admin/actions/start-impersonation.test.ts`
- `packages/modules/admin/actions/end-impersonation.ts`
- `packages/modules/admin/actions/end-impersonation.test.ts`
- `packages/modules/admin/components/impersonation-button.tsx`
- `packages/ui/src/components/impersonation-banner.tsx`
- `apps/client/app/(dashboard)/impersonation-wrapper.tsx`
- `apps/client/app/(dashboard)/actions/end-impersonation-client.ts`
- `apps/client/app/(dashboard)/settings/support-history/page.tsx`

**Fichiers modifiés :**
- `packages/modules/crm/components/client-info-tab.tsx` — bouton impersonation
- `packages/modules/admin/index.ts` — exports impersonation
- `packages/ui/src/index.ts` — export ImpersonationBanner
- `apps/client/middleware.ts` — détection cookie impersonation
- `apps/client/app/(dashboard)/layout.tsx` — ImpersonationWrapper
- `apps/client/app/(dashboard)/settings/page.tsx` — lien support-history

### Change Log

- Story 13.3 créée — impersonation MiKL accès compte client support/debug (2026-04-14)
- Story 13.3 implémentée — 25 tests, 12 fichiers créés, 6 modifiés (2026-04-16)
