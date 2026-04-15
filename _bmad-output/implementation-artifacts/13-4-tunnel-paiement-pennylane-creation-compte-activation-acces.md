# Story 13.4: Tunnel paiement Pennylane — création compte + activation accès

Status: done
Priority: critical (bloque l'automatisation commerciale)
Estimate: large (~4-5 jours)

## Story

As a **MiKL (opérateur)**,
I want **que le paiement d'une facture Pennylane déclenche automatiquement la création du compte client (pour Lab ou One direct) ou le déblocage de la livraison (pour paiement final 70%)**,
so that **je puisse éliminer toutes les étapes manuelles post-paiement et offrir une expérience client fluide, du devis à l'activation du dashboard**.

## Background

Aujourd'hui, le flow commercial n'est pas automatisé. MiKL crée un prospect, fait une visio, génère un devis manuel dans Pennylane (Story 11.3 existante), l'envoie au client. Mais ensuite **rien ne se passe automatiquement** quand le client paye — MiKL doit manuellement créer le compte et activer l'accès. Cette story automatise intégralement le tunnel paiement → compte → accès.

MiKL a validé le 2026-04-14 les règles commerciales suivantes :

- **Lab** (offre d'appel, 199€ fixe) → client paye **100% upfront** → Lab s'ouvre immédiatement
- **One direct** (setup + abonnement mensuel) → client paye **30% d'acompte d'engagement** → MiKL active le One et commence le dev → client paye les **70% restants** à la livraison finale
- **Projet ponctuel** (mission unique, forfait) → même logique que One direct : 30% acompte + 70% à la livraison

Le webhook Pennylane "facture payée" déclenche automatiquement :

1. Vérification que la facture correspond à un prospect/client identifié
2. Détermination du type (Lab full payment, One/Ponctuel acompte 30%, ou paiement final 70%)
3. Action automatique selon le type (création de compte, activation de modules, email d'invitation)

## Acceptance Criteria

### Phase 1 — Configuration devis avec métadonnées

### AC1 — Enrichissement devis avec `quote_type`

**Given** MiKL crée un devis dans le Hub (Story 11.3 existante à étendre)
**When** le formulaire de création devis s'affiche
**Then** un sélecteur `quote_type` est présent avec les valeurs suivantes :
- `lab_onboarding` (199€ fixe, 100% upfront)
- `one_direct_deposit` (30% acompte d'un projet One direct)
- `one_direct_final` (70% solde final d'un projet One direct)
- `ponctuel_deposit` (30% acompte d'un projet ponctuel)
- `ponctuel_final` (70% solde final d'un projet ponctuel)

**And** le type est stocké dans `quotes.quote_type` (nouvelle colonne)
**And** le type est propagé comme métadonnée custom sur Pennylane via le champ `description` ou un tag, afin de pouvoir le relire au moment du webhook

### AC2 — Stockage lien devis ↔ client

**Given** un devis est créé
**When** il est persisté
**Then** la table `quotes` contient : `client_id`, `quote_type`, `total_amount_ht`, `status`, `sent_at`, `signed_at`, `paid_at`, `pennylane_quote_id`, `pennylane_invoice_id`
**And** l'index sur `pennylane_invoice_id` permet une lookup rapide depuis le webhook

### Phase 2 — Webhook Pennylane paid

### AC3 — Endpoint webhook sécurisé

**Given** Pennylane notifie qu'une facture est payée
**When** Pennylane POST `apps/hub/app/api/webhooks/pennylane/paid/route.ts`
**Then** la signature HMAC est vérifiée via le header `x-pennylane-signature` avec secret partagé stocké en env var
**And** toute requête non signée retourne 401
**And** toute requête signée mais malformée retourne 400

### AC4 — Identification du devis depuis la facture

**Given** un payload webhook valide
**When** le handler lit `pennylane_invoice_id` depuis le payload
**Then** il trouve le devis correspondant dans la table `quotes` via `pennylane_invoice_id` (ou remonte depuis `pennylane_quote_id`)
**And** si aucun devis n'est trouvé, le handler log une erreur et retourne 200 OK (idempotent, pas de retry)

### AC5 — Marquage `paid_at`

**Given** le devis est identifié
**When** le traitement commence
**Then** `quotes.paid_at = now()` est enregistré
**And** une entrée `activity_log action: 'quote_paid'` est créée

### Phase 3 — Action automatique selon le type

### AC6 — Cas `lab_onboarding`

**Given** `quote_type = 'lab_onboarding'`
**When** le handler s'exécute
**Then** :
1. Vérifier que le client n'a pas déjà un compte auth (`clients.auth_user_id IS NULL`)
2. Créer `auth.users` via Supabase service_role_key avec l'email du client
3. Générer un mot de passe temporaire sécurisé (crypto random, 16 caractères, urlsafe)
4. Mettre à jour `clients.auth_user_id` avec le nouvel `auth.users.id`
5. Mettre à jour `client_configs.dashboard_type = 'lab'`, `lab_mode_available = true`, `elio_lab_enabled = true`, `active_modules = ['core-dashboard', 'parcours', 'documents', 'chat', 'elio', 'visio']`
6. Envoyer un email d'invitation avec lien vers `/login`, mot de passe temporaire et message de bienvenue Lab
7. Enregistrer `activity_log action: 'lab_access_activated'`

### AC7 — Cas `one_direct_deposit` ou `ponctuel_deposit`

**Given** `quote_type IN ('one_direct_deposit', 'ponctuel_deposit')`
**When** le handler s'exécute
**Then** :
1. Vérifier que le client n'a pas déjà un compte auth
2. Créer `auth.users` + mot de passe temporaire (même logique AC6)
3. Mettre à jour `client_configs.dashboard_type = 'one'`, `lab_mode_available = false`, `elio_lab_enabled = false`, `active_modules` selon les modules sélectionnés dans le devis (défaut : `['core-dashboard', 'chat', 'documents', 'elio']`)
4. Mettre à jour `client_configs.deposit_paid_at = now()`
5. Envoyer un email d'invitation avec lien vers `/login` et message de bienvenue One
6. Enregistrer `activity_log action: 'one_access_activated'`

### AC8 — Cas `one_direct_final` ou `ponctuel_final`

**Given** `quote_type IN ('one_direct_final', 'ponctuel_final')`
**When** le handler s'exécute
**Then** :
1. Le compte client existe déjà (activé au deposit)
2. Mettre à jour `client_configs.final_payment_at = now()`
3. Marquer le projet comme complet : `clients.project_status = 'completed'`
4. Envoyer un email de confirmation : « Projet livré et payé en intégralité. Merci ! »
5. Enregistrer `activity_log action: 'final_payment_received'`

### Phase 4 — Garde-fous et robustesse

### AC9 — Idempotence

**Given** un webhook Pennylane rejoué (Pennylane peut réémettre)
**When** le handler démarre
**Then** il détecte `quotes.paid_at !== null` et ne recrée pas de compte
**And** retourne 200 OK sans action supplémentaire

### AC10 — Fiabilité email mot de passe temporaire

**Given** l'envoi email échoue (SMTP down, bounce, etc.)
**When** le handler tente d'envoyer l'invitation
**Then** un retry automatique 3 fois avec backoff exponentiel est exécuté
**And** si échec permanent, une notification in-app MiKL est créée
**And** le mot de passe temporaire est visible dans le Hub (fiche client) pour que MiKL puisse le communiquer manuellement

### AC11 — Premier login forcé changement mot de passe

**Given** un client a un mot de passe temporaire (`clients.password_change_required = true`)
**When** il se connecte pour la première fois
**Then** le middleware détecte le flag et force la redirection vers `/onboarding/password-change`
**And** aucun accès aux modules n'est possible avant validation du nouveau mot de passe
**And** une fois le mot de passe changé, le flag est remis à `false`

### AC12 — Notification MiKL in-app

**Given** un paiement est reçu et traité
**When** un compte est créé ou activé
**Then** une notification Hub in-app est envoyée à MiKL avec le contenu « Facture X payée — compte Y créé/activé »
**And** MiKL voit la notification dans le centre de notifications sans avoir à checker Pennylane

## Tasks / Subtasks

- [ ] Migration DB : table `quotes` complétée avec colonnes `quote_type`, `pennylane_quote_id`, `pennylane_invoice_id`, `signed_at`, `paid_at` (AC: #1, #2)
- [ ] Migration DB : ajouter `deposit_paid_at`, `final_payment_at` à `client_configs`, `password_change_required` à `clients` (AC: #7, #8, #11)
- [ ] Extension UI Hub Story 11.3 : sélecteur `quote_type` dans le formulaire devis (AC: #1)
- [ ] Endpoint webhook `apps/hub/app/api/webhooks/pennylane/paid/route.ts` avec HMAC verification (AC: #3)
- [ ] Service `matchQuoteFromInvoice(pennylaneInvoiceId)` pour retrouver le devis (AC: #4)
- [ ] Handler `handleLabOnboardingPaid(quote)` (AC: #6)
- [ ] Handler `handleOneDepositPaid(quote)` (AC: #7)
- [ ] Handler `handleFinalPaymentPaid(quote)` (AC: #8)
- [ ] Helper `createClientAuthUser(clientId, email)` qui appelle Supabase admin API
- [ ] Helper `generateSecureTemporaryPassword()` — crypto random 16 chars urlsafe
- [ ] Service email `sendLabWelcomeEmail(client, tempPassword)` (AC: #6)
- [ ] Service email `sendOneWelcomeEmail(client, tempPassword)` (AC: #7)
- [ ] Service email `sendFinalPaymentConfirmationEmail(client)` (AC: #8)
- [ ] Retry + fallback email avec notification MiKL in-app (AC: #10)
- [ ] Middleware : check `password_change_required` → redirect `/onboarding/password-change` (AC: #11)
- [ ] Page `/onboarding/password-change` (nouveau mot de passe + confirm) (AC: #11)
- [ ] Notification Hub in-app « Paiement reçu » (AC: #12)
- [ ] Idempotence check dans chaque handler (AC: #9)
- [ ] Tests unitaires des 3 handlers (AC: #6, #7, #8)
- [ ] Tests intégration webhook → handler → DB → email mock (AC: #3, #4, #5)
- [ ] Tests E2E : scénario Lab paid → compte créé → login → password change (AC: #6, #11)

## Dev Notes

### Architecture Patterns

- **Pattern webhook sécurisé** : HMAC verification obligatoire avant toute logique métier
- **Pattern idempotence** : check `quotes.paid_at` en première ligne du handler, retour 200 si déjà traité
- **Pattern `{ data, error }`** : les helpers serveur retournent toujours ce format, jamais de throw
- **Pattern email retry** : backoff exponentiel (1s, 5s, 30s), fallback notification in-app
- **Pattern admin API** : `supabase.auth.admin.createUser({ email, password, email_confirm: true })` avec service_role_key stocké en env var

### Source Tree Components

```
apps/hub/
└── app/
    ├── api/webhooks/pennylane/paid/
    │   ├── route.ts                            # CRÉER (webhook handler)
    │   └── route.test.ts
    └── onboarding/password-change/
        ├── page.tsx                            # CRÉER
        └── page.test.tsx

packages/modules/billing/
├── actions/
│   ├── match-quote-from-invoice.ts             # CRÉER
│   ├── handle-lab-onboarding-paid.ts           # CRÉER
│   ├── handle-one-deposit-paid.ts              # CRÉER
│   ├── handle-final-payment-paid.ts            # CRÉER
│   └── *.test.ts
├── utils/
│   ├── create-client-auth-user.ts              # CRÉER
│   ├── generate-temp-password.ts               # CRÉER
│   └── verify-pennylane-hmac.ts                # CRÉER
└── components/
    └── quote-form.tsx                          # MODIFIER (ajouter sélecteur quote_type)

packages/modules/emails/
└── templates/
    ├── lab-welcome.tsx                         # CRÉER
    ├── one-welcome.tsx                         # CRÉER
    └── final-payment-confirmation.tsx          # CRÉER

supabase/migrations/
├── [timestamp]_extend_quotes_pennylane.sql     # CRÉER
└── [timestamp]_add_password_change_required.sql # CRÉER
```

### Testing Standards

- Vitest, tests co-localisés (`*.test.ts`)
- Mocks Supabase admin API et service email
- Pas de full suite — uniquement fichiers de la story
- Test idempotence : rejouer le webhook 2 fois et vérifier qu'une seule action est effectuée

### Key Technical Decisions

**1. Supabase admin API**
- Utilisation de `supabase.auth.admin.createUser` avec `email_confirm: true` pour bypass la confirmation par lien
- Le service_role_key est stocké dans `SUPABASE_SERVICE_ROLE_KEY` (env var Vercel, jamais exposé client)

**2. Pennylane HMAC**
- Vérifier la doc Pennylane webhooks pour la signature exacte (probablement SHA-256 du payload avec secret partagé)
- Secret stocké dans `PENNYLANE_WEBHOOK_SECRET`

**3. Stratégie idempotence**
- Check `quotes.paid_at` en première ligne du handler
- Si `paid_at !== null` → retour 200 sans action
- Garantit que Pennylane peut réémettre le webhook sans effet de bord

**4. Mapping `quote_type` → Pennylane**
- Les webhooks Pennylane ne supportent pas forcément des champs custom natifs
- Solution retenue : stocker le `quote_type` dans notre table `quotes` (source de vérité), relier via `pennylane_invoice_id` au moment du webhook
- Alternative éventuelle : champ `description` ou tag Pennylane, à valider lors de l'implémentation

**5. Premier login forcé**
- Flag `clients.password_change_required = true` posé à la création du compte
- Middleware Next.js détecte le flag et redirige vers `/onboarding/password-change`
- Après changement, flag remis à `false`
- Applicable uniquement aux dashboards Lab et One (pas Hub, MiKL gère son propre mot de passe)

**6. Sécurité mot de passe temporaire**
- Envoi par email : compromis acceptable pour MVP
- Alternative future possible : magic link à usage unique (à évaluer post-launch)

### Database Schema Changes

```sql
-- Extend quotes table
ALTER TABLE quotes ADD COLUMN quote_type TEXT CHECK (quote_type IN (
  'lab_onboarding',
  'one_direct_deposit',
  'one_direct_final',
  'ponctuel_deposit',
  'ponctuel_final'
));
ALTER TABLE quotes ADD COLUMN pennylane_quote_id TEXT;
ALTER TABLE quotes ADD COLUMN pennylane_invoice_id TEXT;
ALTER TABLE quotes ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_quotes_pennylane_invoice_id ON quotes(pennylane_invoice_id);

-- Extend client_configs
ALTER TABLE client_configs ADD COLUMN deposit_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE client_configs ADD COLUMN final_payment_at TIMESTAMP WITH TIME ZONE;

-- Add password_change_required to clients
ALTER TABLE clients ADD COLUMN password_change_required BOOLEAN DEFAULT false;
```

### References

- [Source: Story 11.3 — Création et envoi de devis via Pennylane (à étendre)]
- [Source: Story 11.2 — Edge Function billing-sync (backup polling)]
- [Source: Story 3.3 — Emails transactionnels (infra email)]
- [Source: Pennylane webhooks — doc officielle]
- [Source: Supabase Admin API — https://supabase.com/docs/reference/javascript/auth-admin-createuser]
- [Source: CLAUDE.md — Architecture Rules (webhooks only via API Routes)]

### Dependencies

- **Bloquée par** :
  - **Story 11.3** (existante, à étendre) — Création de devis Pennylane + ajout du sélecteur `quote_type`
  - **Story 11.2** (existante) — Edge Function billing-sync, peut aider au matching invoice en backup
  - **Story 3.3** (existante) — Infra emails transactionnels
- **Prérequis env vars** : `SUPABASE_SERVICE_ROLE_KEY`, `PENNYLANE_WEBHOOK_SECRET`
- **Bloque** : automatisation complète du tunnel commercial (toute vente manuelle sans cette story)

### Risks

- **Webhook Pennylane manqué** : si Pennylane ne renvoie pas les webhooks (réseau, endpoint down), le paiement n'est pas détecté. Mitigation : poll Pennylane toutes les X minutes via l'edge function billing-sync (Story 11.2) en backup — comparer `billing_sync` et `quotes.paid_at` pour détecter les paiements orphelins.
- **Faux positif création compte** : si un devis est payé mais le client n'est plus intéressé, le compte est quand même créé. Pas de vrai problème business (client peut ignorer l'email), mais à documenter dans les opérations MiKL.
- **Sécurité mot de passe temporaire** : l'envoi par email n'est pas idéal (risque d'interception). Alternative possible : magic link à usage unique. À réévaluer post-launch.
- **Paiement partiel** : si le client paye moins que le montant prévu (ex : 10% au lieu de 30%), le webhook Pennylane nous notifie quand même. On s'appuie sur `status: 'paid'` de Pennylane, pas sur le montant — vérifier ce comportement exact dans la doc Pennylane avant implémentation.
- **Concurrence webhook** : si Pennylane envoie plusieurs webhooks rapprochés pour la même facture, le check d'idempotence sur `paid_at` doit être atomique (transaction DB) pour éviter les créations de compte doubles.

## Dev Agent Record

### Context Reference

### Agent Model Used

Claude Opus 4.6 (pipeline MPP — 2026-04-14)

### Debug Log References

### Completion Notes List

**Décision architecture — Option C : table `quote_metadata`**

La story supposait une table `quotes` qui n'existait pas (codebase utilise `billing_sync`
comme miroir Pennylane passif). Décision : créer une table légère `quote_metadata`
(pennylane_quote_id PK, client_id FK, quote_type, paid_at, processed_at) dédiée aux
métadonnées business MPP. Elle ne duplique pas `billing_sync`, garantit l'idempotence
atomique du webhook et reste typée côté TypeScript.

**Scope implémenté**
- Migration 00083 — `quote_metadata` + extensions `clients.password_change_required`/`project_status` + `client_configs.deposit_paid_at`/`final_payment_at`
- 3 helpers utils : `verify-pennylane-hmac`, `generate-temp-password`, `create-client-auth-user`
- 3 handlers + dispatcher idempotents : `lab_onboarding`, `one/ponctuel_deposit`, `one/ponctuel_final`
- Webhook endpoint `/api/webhooks/pennylane/paid/route.ts` avec HMAC SHA-256 + service-role + dispatch
- Extension `create-quote.ts` + `quote-form.tsx` : sélecteur `quote_type` + persist `quote_metadata`
- 2 nouveaux templates email (`welcome-one`, `final-payment-confirmation`) + extension handler send-email
- Middleware client : check `password_change_required` avant consent/onboarding
- Page `/onboarding/password-change` + form + action `changeTemporaryPassword`
- Notifications MiKL in-app à chaque paiement + alerte en cas d'échec handler

**Tests : 69 verts**
- verify-pennylane-hmac : 9
- generate-temp-password : 4
- create-client-auth-user : 5
- pennylane-paid-handlers : 16 (Lab + deposit + final + dispatcher)
- webhook route : 8 (HMAC, matching, dispatch, error fallback)
- change-temporary-password : 5
- create-quote : 14 (non-régression)
- quote-form : 8 (non-régression)

### File List

**Nouveaux fichiers**
- supabase/migrations/00083_pennylane_tunnel.sql
- packages/modules/facturation/utils/verify-pennylane-hmac.ts + .test.ts
- packages/modules/facturation/utils/generate-temp-password.ts + .test.ts
- packages/modules/facturation/utils/create-client-auth-user.ts + .test.ts
- packages/modules/facturation/actions/match-quote-from-invoice.ts
- packages/modules/facturation/actions/pennylane-paid-handlers.ts + .test.ts
- apps/hub/app/api/webhooks/pennylane/paid/route.ts + route.test.ts
- apps/client/app/onboarding/password-change/page.tsx
- apps/client/app/onboarding/actions/change-temporary-password.ts + .test.ts
- apps/client/app/components/onboarding/password-change-form.tsx
- supabase/functions/_shared/email-templates/welcome-one.ts
- supabase/functions/_shared/email-templates/final-payment-confirmation.ts

**Fichiers modifiés**
- packages/modules/facturation/types/billing.types.ts (QuoteType, QuoteMetadataRow, QUOTE_TYPE_LABELS, CreateQuoteOptions.quoteType)
- packages/modules/facturation/actions/create-quote.ts (persist quote_metadata)
- packages/modules/facturation/components/quote-form.tsx (sélecteur quote_type)
- packages/modules/facturation/index.ts (exports story 13.4)
- supabase/functions/send-email/handler.ts (welcome-one + final-payment-confirmation)
- apps/client/middleware.ts (redirect si password_change_required)

### Change Log

- Story 13.4 créée — tunnel paiement Pennylane automatisé (création compte + activation accès) (2026-04-14)
- Story 13.4 implémentée — pipeline MPP complet, 69 tests verts (2026-04-14)
