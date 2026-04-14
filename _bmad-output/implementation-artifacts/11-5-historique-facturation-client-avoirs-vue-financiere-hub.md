# Story 11.5: Historique facturation client, avoirs & vue financiere Hub

Status: done

## Story

As a **client MonprojetPro ou MiKL (operateur)**,
I want **consulter l'historique de facturation, generer des avoirs et avoir une vue financiere globale**,
so that **la gestion financiere est transparente, les corrections sont possibles, et MiKL a une vision cockpit**.

## Acceptance Criteria

**Given** un client One accede a sa section "Mes factures" (FR96)
**When** la page se charge
**Then** il voit depuis `billing_sync WHERE client_id = current_client AND entity_type = 'invoice'` :
- Liste factures : numero, date, montant, statut (badge colore)
- Bouton "Telecharger PDF" (depuis `billing_sync.data.file_url`)
- Pour factures impayees : bouton "Payer maintenant" (lien Pennylane/Stripe)
- Resume financier : total paye, montant en attente, prochain prelevement
- Bouton "Rafraichir" → sync immediat
- Vue lecture seule (RLS : client voit uniquement ses factures)

**Given** MiKL veut generer un avoir pour un client (FR97)
**When** il accede a la facture et clique "Creer un avoir"
**Then** :
1. Formulaire : reference facture origine, montant avoir (max = montant facture), raison
2. Server Action `createCreditNote(invoiceId, amount, reason)` → `POST /customer_invoices` (type credit note)
3. Pennylane envoie le PDF au client
4. `triggerBillingSync(clientId)`
5. Toast "Avoir de {montant} € genere pour {client}"

**Given** un client met a jour ses infos de paiement (FR98)
**When** il accede a "Paiement" dans ses parametres
**Then** :
- Mode actuel affiché (virement IBAN / CB / SEPA)
- Bouton "Modifier" → redirection vers portail Stripe Customer (si CB)
- Aucune donnee CB stockee dans MonprojetPro (NFR-S1)

**Given** MiKL consulte le dashboard facturation Hub
**When** il accede au tableau de bord
**Then** il voit depuis `billing_sync` (pas d'appel API supplementaire) :
- CA mensuel (SUM amount WHERE status='paid' AND mois courant)
- Montant en attente (SUM amount WHERE status='unpaid')
- Nombre de devis en cours (COUNT WHERE entity_type='quote' AND status='pending')
- MRR (SUM abonnements actifs mensualises)

## Tasks / Subtasks

- [x] Creer la vue "Mes factures" client One (AC: #1)
  - [x] Creer `apps/client/app/(dashboard)/modules/facturation/page.tsx` — RSC
  - [x] Fetch `billing_sync WHERE client_id = current AND entity_type = 'invoice'` (RLS garantit l'isolation)
  - [x] Creer `packages/modules/facturation/components/invoices-list.tsx` — liste avec badges statut
  - [x] Composant `billing-summary.tsx` : total paye / en attente / prochain prelevement
  - [x] Bouton "Rafraichir" → `triggerClientBillingSync()` (action client — invoque billing-sync Edge Function)

- [x] Creer la Server Action avoir (AC: #2)
  - [x] Creer `packages/modules/facturation/actions/create-credit-note.ts`
  - [x] Auth check : `is_operator()` (seul MiKL peut creer un avoir)
  - [x] Validation Zod : `invoiceId` (UUID), `amount` (> 0, <= montant original), `reason` (string required)
  - [x] `POST /api/external/v2/customer_invoices` avec type credit_note
  - [x] `triggerBillingSync(clientId)`
  - [x] Activity log 'credit_note_created'

- [x] Creer le dashboard financier Hub (AC: #4)
  - [x] Creer `packages/modules/facturation/components/billing-dashboard.tsx` — metriques agregees
  - [x] Hook `useBillingMetrics()` : queries TanStack agregees sur `billing_sync`
  - [x] Metriques : CA mensuel, en attente, devis en cours, MRR
  - [x] MRR : normalisation mensuelle (quarterly/3, yearly/12) depuis billing_sync subscriptions actives

- [x] Creer la migration `email_templates` (pour Story 12.3, preparer la table)
  - [x] Creer `supabase/migrations/00064_create_email_templates.sql`
  - [x] Table `email_templates` : id, template_key (UNIQUE), subject, body, variables (TEXT[]), updated_at
  - [x] Seed des templates par defaut (bienvenue, facturation, etc.)

- [x] Creer les tests unitaires
  - [x] Test `create-credit-note.ts` : auth, validation montant, creation, sync (8 tests)
  - [x] Test `invoices-list.tsx` : rendu, badges, PDF download button (6 tests)
  - [x] Test `billing-dashboard.tsx` : metriques CA, MRR, en attente (6 tests)

## Dev Notes

### Architecture Patterns

- **Vue client = lecture seule** : le client One lit `billing_sync` via RLS (la policy `billing_sync_select_owner` garantit qu'il ne voit que ses factures). Pas de Server Action de lecture separee necessaire — RSC + Supabase server client directement.
- **MRR calcul** : `SUM(amount) WHERE entity_type='subscription' AND status='active'` sur `billing_sync`. Normaliser les abonnements trimestriels/annuels en mensuel (diviser par 3 ou 12).
- **PDF URL** : stocker dans `billing_sync.data.file_url` (champ Pennylane). URL directe Pennylane — pas de proxy, pas de stockage Supabase.
- **`MrrInfo`** dans `crm.types.ts` : `{ available: false, message }` ou `{ available: true, amount }`. Cette story fournit `available: true, amount: <vraiMRR>`.

### Source Tree

```
apps/client/app/(dashboard)/modules/facturation/
├── page.tsx                        # CREER: vue client factures

packages/modules/facturation/
├── components/
│   ├── invoices-list.tsx           # CREER
│   ├── invoices-list.test.tsx      # CREER
│   ├── billing-summary.tsx         # CREER
│   ├── billing-summary.test.tsx    # CREER
│   ├── billing-dashboard.tsx       # CREER: vue Hub
│   └── billing-dashboard.test.tsx  # CREER
└── actions/
    ├── create-credit-note.ts       # CREER
    └── create-credit-note.test.ts  # CREER

supabase/migrations/
└── 00064_create_email_templates.sql  # CREER (prep Story 12.3)
```

### Existing Code Findings

- **`MrrInfo`** dans `packages/modules/crm/types/crm.types.ts` : type deja defini, cette story le remplit avec de vraies donnees.
- **Pattern RSC + Supabase server client** : voir `apps/client/app/(dashboard)/layout.tsx` — pattern etabli pour fetch server-side.
- **`billing_sync` table** : creee Story 11.2 (prerequis). Si non disponible au dev de cette story, mocker la table.

### References

- [Source: epic-11-facturation-abonnements-stories-detaillees.md#Story 11.5]
- [Source: packages/modules/crm/types/crm.types.ts] — MrrInfo type

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun blocage notable.

### Completion Notes List

- Vue "Mes factures" client One créée : RSC + InvoicesList + BillingSummary
- `triggerClientBillingSync` créé (action client sans is_operator) pour le bouton Rafraîchir
- `createCreditNote` : validation Zod (UUID, montant ≤ facture, raison requise), is_operator, POST Pennylane type credit_note, activity_log
- `billing-dashboard.tsx` mis à jour : métriques Hub (CA mensuel, en attente, devis en cours, MRR) + InvoicesList + SubscriptionsList dans les tabs
- `useBillingMetrics` hook ajouté dans use-billing.ts avec agrégations CA/pending/quotes/MRR
- MRR normalisé : monthly=×1, quarterly÷3, yearly÷12
- Migration 00064 : table email_templates avec RLS opérateur + 5 seeds par défaut
- `@monprojetpro/modules-facturation` ajouté dans apps/client/package.json

### Code Review Fixes (Phase 2)

- HIGH #1: Amount unit mismatch — `createCreditNote` comparait euros vs centimes, converti en `amountCents = Math.round(amount * 100)`
- HIGH #2: Missing Skeleton loading — `billing-summary.tsx` affichait des zéros pendant le chargement, ajouté Skeleton + test
- HIGH #3: Missing notification — `createCreditNote` n'envoyait pas de notification in-app au client, ajouté insert notifications
- MEDIUM #4: Redundant state — `invoices-list.tsx` avait `syncing` state + `useTransition`, simplifié à `useTransition` seul
- MEDIUM #5: Missing created_at — Migration 00064 manquait la colonne `created_at`, ajoutée
- MEDIUM #6: Missing refetch mock — Tests `invoices-list.test.tsx` manquaient `refetch: vi.fn()` dans les mocks

### File List

- `apps/client/app/(dashboard)/modules/facturation/page.tsx` — CRÉÉ
- `apps/client/package.json` — MODIFIÉ
- `packages/modules/facturation/actions/create-credit-note.ts` — CRÉÉ
- `packages/modules/facturation/actions/create-credit-note.test.ts` — CRÉÉ
- `packages/modules/facturation/actions/trigger-client-billing-sync.ts` — CRÉÉ
- `packages/modules/facturation/components/invoices-list.tsx` — CRÉÉ
- `packages/modules/facturation/components/invoices-list.test.tsx` — CRÉÉ
- `packages/modules/facturation/components/billing-summary.tsx` — CRÉÉ
- `packages/modules/facturation/components/billing-summary.test.tsx` — CRÉÉ
- `packages/modules/facturation/components/billing-dashboard.tsx` — MODIFIÉ
- `packages/modules/facturation/components/billing-dashboard.test.tsx` — CRÉÉ
- `packages/modules/facturation/hooks/use-billing.ts` — MODIFIÉ
- `packages/modules/facturation/hooks/use-billing.test.ts` — MODIFIÉ
- `packages/modules/facturation/index.ts` — MODIFIÉ
- `supabase/migrations/00064_create_email_templates.sql` — CRÉÉ
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIÉ
