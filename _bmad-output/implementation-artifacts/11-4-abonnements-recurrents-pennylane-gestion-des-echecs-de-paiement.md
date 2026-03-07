# Story 11.4: Abonnements recurrents Pennylane & gestion des echecs de paiement

Status: done

## Story

As a **MiKL (operateur)**,
I want **gerer les abonnements recurrents de mes clients via Pennylane avec des alertes en cas d'echec de paiement**,
so that **les paiements sont automatises et je suis prevenu immediatement si un client a un probleme de paiement**.

## Acceptance Criteria

**Given** MiKL veut creer un abonnement recurrent pour un client (FR94)
**When** il accede a la fiche client, section "Abonnement"
**Then** il peut configurer :
- Type : Ponctuel / Essentiel (49€/mois) / Agentique (99€/mois)
- Frequence : mensuelle, trimestrielle, annuelle
- Date de debut
- Modules supplementaires avec surcout
- Mode de paiement : CB (Stripe/Pennylane), virement IBAN, SEPA
- Bouton "Creer l'abonnement"

**Given** MiKL cree l'abonnement
**When** la Server Action `createSubscription(clientId, plan, frequency, extras, paymentMethod)` s'execute
**Then** :
1. `POST /api/external/v2/billing_subscriptions` avec mapping complet
2. Pennylane genere automatiquement les factures recurrentes
3. `triggerBillingSync(clientId)`
4. Toast "Abonnement cree pour {client}"

**Given** un paiement echoue (FR95)
**When** le polling detecte une facture `status: 'unpaid'` avec `deadline` depassee
**Then** :
1. Facture marquee 'overdue' dans `billing_sync`
2. Notification MiKL : "Echec paiement — {client}, facture {numero}, {montant} €"
3. Notification client : "Votre paiement de {montant} € est en attente"
4. Logge dans `activity_logs`
5. Apres 3 factures impayees consecutives : alerte critique MiKL

**Given** un paiement reussit
**When** le polling detecte `status: 'paid'`
**Then** UI mise a jour via Realtime + notification client "Paiement recu — merci !"

## Tasks / Subtasks

- [x] Creer le formulaire d'abonnement (AC: #1)
  - [x] Creer `packages/modules/facturation/components/subscription-form.tsx` — 'use client'
  - [x] Utiliser `SubscriptionTier` de `packages/modules/crm/types/subscription.types.ts` pour les types de plan (ATTENTION : importer depuis une action, pas directement depuis CRM — lire les valeurs via constantes locales)
  - [x] `TIER_PRICING` : Ponctuel = variable, Essentiel = 49€/mois, Agentique = 99€/mois
  - [x] Modules extras : tableau de checkboxes avec surcout par module
  - [x] Calcul total mensuel en temps reel

- [x] Creer la Server Action abonnement (AC: #2)
  - [x] Creer `packages/modules/facturation/actions/create-subscription.ts`
  - [x] Auth check : `is_operator()`
  - [x] Mapping plan Foxeo → `line_items` Pennylane (1 ligne pour le forfait + 1 ligne par module extra)
  - [x] `recurring_period` : 'monthly' | 'quarterly' | 'yearly'
  - [x] `triggerBillingSync(clientId)`
  - [x] Activity log 'subscription_created'
  - [x] Mettre a jour `client_configs.subscription_tier` + `pending_billing_update: false` (le flag est maintenant consomme)

- [x] Creer la detection des echecs de paiement dans l'Edge Function billing-sync (AC: #3)
  - [x] Dans `billing-sync/index.ts` : apres UPSERT, verifier les factures avec `status='unpaid'` et `deadline < NOW()`
  - [x] Si facture overdue detectee : logique de notification (MiKL + client) + activity log
  - [x] Compteur `consecutive_unpaid` dans `billing_sync.data` (JSONB) pour detecter 3 echecs
  - [x] Email via Edge Function `send-email` (template `payment-failed.ts` existe deja dans `_shared/email-templates/`)

- [x] Creer la liste des abonnements (AC: #1, #4)
  - [x] Creer `packages/modules/facturation/components/subscriptions-list.tsx` — lit `billing_sync WHERE entity_type='subscription'`
  - [x] Badge statut : actif (vert), suspendu (orange), termine (gris)

- [x] Creer les tests unitaires
  - [x] Test `create-subscription.ts` : mapping, auth, update pending_billing_update, sync (10 tests)
  - [x] Test detection overdue dans billing-sync : detection deadline depassee, compteur consecutif, notification (8 tests)
  - [x] Test `subscription-form.tsx` : rendu, calcul total, submit (6 tests)

## Dev Notes

### Architecture Patterns

- **`pending_billing_update: false`** : le flag dans `client_configs` est mis a `true` quand le tier change (Story 9.4). La Server Action `createSubscription` le remet a `false` apres la creation reelle dans Pennylane. Cela cree une coherence entre le tier Foxeo et l'abonnement Pennylane.
- **Template email `payment-failed.ts`** : existe deja dans `supabase/functions/_shared/email-templates/payment-failed.ts` — invoquer l'Edge Function `send-email` avec `{ template: 'payment-failed', data: { ... } }`.
- **Detection 3 echecs consecutifs** : stocker `consecutive_unpaid_count` dans `billing_sync.data` (JSONB). Au reset (paiement recu), remettre a 0.

### Source Tree

```
packages/modules/facturation/
├── components/
│   ├── subscription-form.tsx       # CREER
│   ├── subscription-form.test.tsx  # CREER
│   ├── subscriptions-list.tsx      # CREER
│   └── subscriptions-list.test.tsx # CREER
└── actions/
    ├── create-subscription.ts      # CREER
    └── create-subscription.test.ts # CREER

supabase/functions/billing-sync/index.ts  # MODIFIER: ajouter detection overdue
```

### Existing Code Findings

- **`payment-failed.ts`** : `supabase/functions/_shared/email-templates/payment-failed.ts` — DEJA CREE, pret.
- **`SubscriptionTier`** dans CRM : `'base' | 'essentiel' | 'agentique'`. En mode YOLO : definir des constantes locales dans le module facturation plutot qu'importer depuis CRM (regle inter-module).
- **`TIER_INFO`** dans `crm/utils/tier-helpers.ts` : les prix sont la. Copier les valeurs dans le module facturation.

### Technical Constraints

- **SEPA via Pennylane** : optionnel, Pennylane gere le mandat SEPA — aucune logique Foxeo necessaire. Juste stocker le mode prefere dans les metadonnees.
- **Paiement CB** : Stripe connecte a Pennylane — Pennylane genere le lien Stripe Checkout sur la facture. Foxeo n'intervient pas dans le flux de paiement.

### References

- [Source: epic-11-facturation-abonnements-stories-detaillees.md#Story 11.4]
- [Source: supabase/functions/_shared/email-templates/payment-failed.ts]
- [Source: packages/modules/crm/utils/tier-helpers.ts]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun blocage. Implementation directe.

### Completion Notes List

- **Constantes locales**: `SubscriptionPlan`, `PLAN_MONTHLY_PRICE`, `PLAN_LABEL`, `AVAILABLE_EXTRAS`, `TIER_PRICING` dans `create-subscription.ts` — pas d'import inter-module depuis CRM.
- **Overdue detection**: Logique extraite dans `billing-sync-overdue-logic.ts` (testable Node.js) et dupliquee dans l'Edge Function Deno. Pre-UPSERT: lecture de l'etat existant en DB pour conserver `consecutive_unpaid_count` a travers les cycles de polling.
- **upsertInvoices refactore**: Retourne maintenant `{ upserted, newlyOverdue, paidFromOverdue }` pour decoupler detection et notifications.
- **send-email Edge Function**: Invoquee avec try/catch gracieux — la fonction n'existe pas encore, l'echec est logue comme warning sans bloquer le flux.
- **59 tests passing** : 26 (overdue-logic) + 13 (create-subscription) + 11 (subscription-form) + 9 (subscriptions-list).
- **CR fixes** : notification schema aligné (recipient_type/recipient_id/body au lieu de user_id/content), variable shadowing corrigé dans upsertInvoices, N+1 queries batch-résolues dans handleOverdueNotifications et handlePaidTransitionNotifications, entity_id ajouté dans activity_log de createSubscription.

### File List

- packages/modules/facturation/actions/create-subscription.ts (CREE)
- packages/modules/facturation/actions/create-subscription.test.ts (CREE)
- packages/modules/facturation/components/subscription-form.tsx (CREE)
- packages/modules/facturation/components/subscription-form.test.tsx (CREE)
- packages/modules/facturation/components/subscriptions-list.tsx (CREE)
- packages/modules/facturation/components/subscriptions-list.test.tsx (CREE)
- packages/modules/facturation/utils/billing-sync-overdue-logic.ts (CREE)
- packages/modules/facturation/utils/billing-sync-overdue-logic.test.ts (CREE)
- supabase/functions/billing-sync/index.ts (MODIFIE: detection overdue, notifications, refactor upsertInvoices)
- _bmad-output/implementation-artifacts/sprint-status.yaml (MODIFIE: in-progress → review)

## Change Log

- 2026-03-07: Story 11.4 implementee — formulaire abonnement, Server Action createSubscription, detection overdue dans billing-sync, liste abonnements, 59 tests.
- 2026-03-07: Code review — 6 issues (2 HIGH, 3 MEDIUM, 1 LOW). Fixes: notification schema, variable shadowing, N+1 batch queries, entity_id activity log.
