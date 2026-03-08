# Story 11.6: Facturation Lab 199€ — Paiement forfait & deduction setup One

Status: done

## Story

As a **MiKL (operateur)**,
I want **facturer le forfait Lab a 199€, activer automatiquement l'acces Lab du client, et deduire ce montant du setup One si le client gradue**,
so that **le parcours Lab est financierement clair et le client beneficie de la deduction promise**.

## Acceptance Criteria

**Given** MiKL cree un client Lab et doit facturer le forfait Lab (FR169)
**When** il clique "Facturer le Lab" sur la fiche client
**Then** :
1. `POST /api/external/v2/customer_invoices` avec line_item : `{ label: "Forfait Lab Foxeo", quantity: 1, currency_amount: 199, vat_rate: "FR_200", unit: "piece" }`
2. `triggerBillingSync(clientId)`
3. Toast "Facture Lab envoyee a {client}"
4. Activity log 'lab_invoice_sent'

**Given** le client Lab paie le forfait 199€
**When** le polling detecte la facture Lab comme 'paid'
**Then** :
1. `clients.lab_paid` → true, `clients.lab_paid_at` → NOW(), `clients.lab_amount` → 19900
2. Dashboard Lab active si pas deja fait
3. Elio Lab active
4. Notification MiKL + client : "Acces Lab active"

**Given** un client Lab gradue vers One (FR170)
**When** MiKL cree le devis setup One pour ce client
**Then** :
- Ligne de deduction auto : "Deduction forfait Lab" → -199€ (`currency_amount: -199`)
- Tooltip : "Le forfait Lab (199€) est deduit du setup One, comme convenu."
- `metadata.lab_deduction: 19900`
- Si setup < 199€ : net = 0€ (pas de remboursement)

**Given** MiKL filtre les factures par type "Lab"
**When** il applique le filtre
**Then** il voit toutes les factures Lab avec statut + mention "Deduit du setup One" pour les clients gradues

## Tasks / Subtasks

- [x] Creer la migration colonnes Lab sur `clients` (AC: #2)
  - [x] Creer `supabase/migrations/00065_add_lab_billing_fields.sql` :
    ```sql
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS lab_paid BOOLEAN DEFAULT false;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS lab_paid_at TIMESTAMPTZ;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS lab_amount INTEGER DEFAULT 0;
    ```

- [x] Creer la Server Action `sendLabInvoice` (AC: #1)
  - [x] Creer `packages/modules/facturation/actions/send-lab-invoice.ts`
  - [x] Auth check : `is_operator()`
  - [x] Verifier que le client n'a pas deja une facture Lab payee (`clients.lab_paid = false`)
  - [x] `POST /customer_invoices` Pennylane
  - [x] Stocker `pennylane_lab_invoice_id` dans `billing_sync` metadata
  - [x] Activity log 'lab_invoice_sent'

- [x] Detecter le paiement Lab dans billing-sync (AC: #2)
  - [x] Dans `billing-sync/index.ts` : identifier les factures Lab (via label ou tag Pennylane)
  - [x] Quand `status='paid'` et facture Lab : UPDATE `clients SET lab_paid=true, lab_paid_at=NOW(), lab_amount=19900`
  - [x] Notification in-app MiKL et client
  - [x] Activity log 'lab_payment_received'

- [x] Creer la logique deduction setup One (AC: #3)
  - [x] Modifier `packages/modules/facturation/actions/create-quote.ts` : si client a `lab_paid=true` ET c'est un devis setup One → ajouter ligne deduction automatiquement
  - [x] Afficher un indicateur dans le formulaire devis : "Ce client a paye le Lab (199€) — deduction auto appliquee"
  - [x] Stocker `metadata.lab_deduction: 19900` sur le devis Pennylane (`pdf_invoice_free_text` ou metadata custom)

- [x] Ajouter bouton "Facturer le Lab" dans la fiche client Hub (AC: #1)
  - [x] Modifier `apps/hub/app/(dashboard)/modules/crm/clients/[clientId]/client-detail-with-support.tsx`
  - [x] Nouveau bouton dans onglet "Facturation" (ou section dediee) si `client.lab_paid = false`
  - [x] Si `lab_paid = true` : afficher "Lab paye le {date}" avec badge vert

- [x] Creer les tests unitaires
  - [x] Test `send-lab-invoice.ts` : auth, garde lab_paid, creation Pennylane (6 tests)
  - [x] Test detection paiement Lab dans billing-sync : update clients, notifications (6 tests dans billing-sync-logic.test.ts)
  - [x] Test deduction dans create-quote : ajout ligne -199€ si lab_paid (4 tests)

## Dev Notes

### Architecture Patterns

- **Identification facture Lab** : Pennylane n'a pas de tags natifs sur les factures. Identifier une facture Lab par son `pdf_invoice_free_text` contenant un tag interne (ex: `[FOXEO_LAB]`) ou par un champ `plan_item_number` specifique.
- **`lab_amount` en centimes** : convention projet (comme `amount` dans `billing_sync`). 199€ = 19900 centimes.
- **Deduction dans le formulaire** : auto-insert une ligne avec `currency_amount: -199` et `label: "Deduction forfait Lab Foxeo"`. L'utilisateur peut voir mais pas supprimer cette ligne (read-only si lab_paid).

### Source Tree

```
supabase/migrations/
└── 00065_add_lab_billing_fields.sql    # CREER

packages/modules/facturation/actions/
├── send-lab-invoice.ts                 # CREER
└── send-lab-invoice.test.ts            # CREER

supabase/functions/billing-sync/index.ts  # MODIFIER: detection paiement Lab

apps/hub/app/(dashboard)/modules/crm/clients/[clientId]/
└── client-detail-with-support.tsx      # MODIFIER: bouton "Facturer le Lab"
```

### Existing Code Findings

- **`client-detail-with-support.tsx`** : modifie recemment (Story 10.4 pour onglet Branding). Pattern `extraTabs` etabli — ajouter la logique Lab dans l'onglet existant ou dans un nouveau composant.
- **`clients` table** : colonnes `lab_paid`, `lab_paid_at`, `lab_amount` ajoutees par cette migration. A verifier qu'aucune Story anterieure n'a deja ajoute ces colonnes.

### References

- [Source: epic-11-facturation-abonnements-stories-detaillees.md#Story 11.6]
- [Source: apps/hub/app/(dashboard)/modules/crm/clients/[clientId]/client-detail-with-support.tsx]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
Aucun blocage majeur. Identification Lab via tag `[FOXEO_LAB]` dans pdf_invoice_free_text (Pennylane n'a pas de tags natifs sur factures).

### Completion Notes List
- Migration 00065 : 3 colonnes Lab sur `clients` (lab_paid, lab_paid_at, lab_amount)
- `sendLabInvoice` : action opérateur avec guard lab_paid, POST Pennylane, upsert billing_sync, activity log, triggerBillingSync
- `billing-sync/index.ts` : helpers isLabInvoice/shouldActivateLabAccess dupliqués (Deno), `handleLabPaymentActivations` activé après upsert, met à jour clients + notifications MiKL/client + activity log
- `billing-sync-logic.ts` : fonctions pures `isLabInvoice`, `shouldActivateLabAccess`, `LAB_INVOICE_TAG`, `LAB_AMOUNT_CENTS` (testables Vitest)
- `create-quote.ts` : option `labDeduction` dans CreateQuoteOptions, auto-insert ligne -199€ si lab_paid=true, `[LAB_DEDUCTION:19900]` dans pdf_invoice_free_text
- `get-clients.ts` : inclut lab_paid/lab_paid_at dans select + mapping ClientWithPennylane
- `get-client-lab-status.ts` : nouvelle action pour lire le statut Lab d'un client
- `lab-billing-tab.tsx` : nouvel onglet "Facturation Lab" dans la fiche client Hub (bouton envoi + badge payé)
- `client-detail-with-support.tsx` : ajout onglet "Facturation Lab"
- Tests : 47 passing (6 send-lab-invoice + 11 billing-sync-logic dont 10 Lab + 14 create-quote dont 4 déduction)

### Code Review Fixes (Opus 4.6)
- **H1**: Fixed missing `labInvoicesPaid: []` in billing-sync error return (runtime TypeError)
- **H2**: Fixed deduction capping — `Math.min(199, setupTotalHt)` so net >= 0 when setup < 199€
- **H3**: Added Lab badge + "Déduit du setup One" indicator in invoices-list.tsx
- **M1**: Added Lab deduction indicator in quote-form.tsx (green banner when client has labPaid)
- **M2**: Added duplicate Lab invoice guard in sendLabInvoice (checks billing_sync for pending/unpaid)
- **M3**: Rewrote lab-billing-tab.tsx from useEffect+useState to TanStack Query (architecture compliance)
- **L1**: Removed duplicate LAB_INVOICE_TAG export, imported from billing-sync-logic.ts
- **L2**: Documented: Edge Function helpers duplicated (Deno can't import workspace packages)
- **L3**: Documented: get-client-lab-status.ts missing dedicated tests (acceptable for simple pass-through action)

### File List
- supabase/migrations/00065_add_lab_billing_fields.sql (créé)
- packages/modules/facturation/actions/send-lab-invoice.ts (créé)
- packages/modules/facturation/actions/send-lab-invoice.test.ts (créé)
- packages/modules/facturation/actions/get-client-lab-status.ts (créé)
- packages/modules/facturation/components/lab-billing-tab.tsx (créé)
- packages/modules/facturation/utils/billing-sync-logic.ts (modifié — helpers Lab)
- packages/modules/facturation/utils/billing-sync-logic.test.ts (modifié — tests Lab)
- supabase/functions/billing-sync/index.ts (modifié — détection + activation Lab)
- packages/modules/facturation/actions/create-quote.ts (modifié — déduction Lab)
- packages/modules/facturation/actions/create-quote.test.ts (modifié — 4 tests déduction)
- packages/modules/facturation/types/billing.types.ts (modifié — labDeduction option, labPaid/labPaidAt sur ClientWithPennylane)
- packages/modules/facturation/actions/get-clients.ts (modifié — select lab_paid/lab_paid_at)
- packages/modules/facturation/index.ts (modifié — exports LabBillingTab, sendLabInvoice, getClientLabStatus)
- apps/hub/app/(dashboard)/modules/crm/clients/[clientId]/client-detail-with-support.tsx (modifié — onglet Facturation Lab)
