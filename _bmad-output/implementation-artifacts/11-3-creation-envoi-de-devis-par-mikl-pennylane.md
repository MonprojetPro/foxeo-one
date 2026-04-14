# Story 11.3: Creation & envoi de devis par MiKL (Pennylane)

Status: done

## Story

As a **MiKL (operateur)**,
I want **creer et envoyer des devis a mes clients avec suivi du statut**,
so that **je peux proposer des prestations de maniere professionnelle et suivre les acceptations**.

## Acceptance Criteria

**Given** MiKL accede au module Facturation dans le Hub (FR77)
**When** il clique sur "Nouveau devis"
**Then** un formulaire s'affiche avec :
- Selection du client (dropdown des clients actifs avec `pennylane_customer_id`)
- Lignes du devis (ajout dynamique) : designation, description, quantite, prix unitaire HT, total ligne
- TVA : 20% par defaut (`vat_rate: 'FR_200'`), configurable
- Total HT, TVA, Total TTC (calcul automatique en temps reel)
- Notes publiques (visibles par le client) et notes privees (MiKL uniquement)
- Boutons "Enregistrer (brouillon)" / "Envoyer au client"
- Formulaire avec react-hook-form + validation Zod

**Given** MiKL envoie le devis
**When** la Server Action `createAndSendQuote(clientId, lineItems, terms, sendNow)` s'execute
**Then** :
1. `POST /api/external/v2/quotes` avec mapping complet
2. Si `sendNow` : le devis est finalise (statut 'pending'), Pennylane envoie l'email PDF
3. Notification in-app au client : "Nouveau devis de MiKL — {montant} €"
4. `triggerBillingSync(clientId)` → sync immediat billing_sync
5. Toast "Devis envoye a {client}"

**Given** MiKL consulte la liste des devis (FR78)
**When** il accede a la liste
**Then** il voit depuis `billing_sync WHERE entity_type = 'quote'` :
- Numero, client, montant, date, statut (badge colore)
- Actions : "Relancer", "Convertir en facture", "Annuler"
- Filtres : par statut, par client, par periode

**Given** un client accepte un devis
**When** le polling detecte `status: 'accepted'`
**Then** :
1. `billing_sync` mis a jour → Realtime notifie
2. Notification MiKL : "Le client {nom} a accepte le devis {numero}"
3. MiKL peut convertir en facture : `POST /api/external/v2/customer_invoices`

## Tasks / Subtasks

- [x] Creer la page module Facturation Hub (AC: #1)
  - [x] Creer `apps/hub/app/(dashboard)/modules/facturation/page.tsx` — page principale avec onglets Devis / Factures / Abonnements
  - [x] Creer `apps/hub/app/(dashboard)/modules/facturation/loading.tsx` — skeleton
  - [x] Creer `apps/hub/app/(dashboard)/modules/facturation/error.tsx` — error boundary

- [x] Creer le formulaire de devis (AC: #1)
  - [x] Creer `packages/modules/facturation/components/quote-form.tsx` — 'use client', react-hook-form + Zod
  - [x] Schema Zod : clientId (UUID requis), lineItems (min 1), chaque ligne (label requis, quantity > 0, unitPrice >= 0, vatRate)
  - [x] Calcul auto Total HT/TVA/TTC en temps reel (`watch()` react-hook-form)
  - [x] Champ ajout de lignes dynamique (`useFieldArray`)
  - [x] Dropdown client : fetcher les clients actifs avec `pennylane_customer_id` non null

- [x] Creer les Server Actions devis (AC: #2, #4)
  - [x] Creer `packages/modules/facturation/actions/create-quote.ts` :
    - `createAndSendQuote(clientId, lineItems, options)` → `POST /quotes` Pennylane
    - Auth check : `is_operator()`
    - Mapping MonprojetPro LineItem → PennylaneLineItem (label, quantity, currency_amount, vat_rate, unit, description)
    - `deadline` = date + 30 jours
    - Si `sendNow` : finaliser dans Pennylane (status → 'pending')
    - Notification in-app client
    - `triggerBillingSync(clientId)`
    - Activity log 'quote_created'
  - [x] Creer `packages/modules/facturation/actions/convert-quote-to-invoice.ts` :
    - `convertQuoteToInvoice(quoteId, clientId)` → `POST /customer_invoices`
    - Activity log 'quote_converted'

- [x] Creer la liste des devis (AC: #3)
  - [x] Creer `packages/modules/facturation/components/quotes-list.tsx` — lit `billing_sync` via TanStack Query
  - [x] Badges statut : brouillon (gris), en attente (bleu), accepte (vert), refuse (rouge)
  - [x] Filtres client/statut/periode

- [x] Creer les tests unitaires
  - [x] Test `create-quote.ts` : mapping, auth, notification, sync (10 tests)
  - [x] Test `convert-quote-to-invoice.ts` : conversion, erreur, log (4 tests)
  - [x] Test `quote-form.tsx` : rendu, calcul total, ajout lignes, submit (8 tests)

## Dev Notes

### Architecture Patterns

- **Lecture depuis `billing_sync`** : la liste des devis lit la table `billing_sync` (pas d'appel Pennylane direct). TanStack Query, queryKey `['billing', 'quotes', clientId?]`, staleTime 5 min.
- **Ecriture vers Pennylane** : les mutations (creation, envoi) passent par les Server Actions proxy Pennylane.
- **Pattern Pennylane quote** : le mapping `currency_amount` = prix unitaire HT (pas le total). Pennylane calcule le total.
- **`vat_rate: 'FR_200'`** = 20% TVA France. Autres valeurs : `'FR_100'` (10%), `'FR_55'` (5.5%), `'FR_21'` (2.1%), `'FR_0'` (exonere).
- **Clients sans `pennylane_customer_id`** : le dropdown filtre uniquement les clients avec mapping Pennylane. Si un client n'a pas de mapping, afficher un lien "Creer le client dans Pennylane" qui appelle `createPennylaneCustomer()` (Story 11.1).

### Source Tree

```
apps/hub/app/(dashboard)/modules/facturation/
├── page.tsx                    # CREER: page principale
├── loading.tsx                 # CREER: skeleton
└── error.tsx                   # CREER: error boundary

packages/modules/facturation/
├── components/
│   ├── quote-form.tsx          # CREER: formulaire devis
│   ├── quote-form.test.tsx     # CREER: tests
│   ├── quotes-list.tsx         # CREER: liste devis
│   └── quotes-list.test.tsx    # CREER: tests
└── actions/
    ├── create-quote.ts         # CREER: Server Action creation
    ├── create-quote.test.ts    # CREER: tests
    ├── convert-quote-to-invoice.ts  # CREER
    └── convert-quote-to-invoice.test.ts
```

### Existing Code Findings

- **`billing-proxy.ts`** (Story 11.1) : `listQuotes()` deja implemente — utiliser pour alimenter la liste.
- **`use-billing.ts`** (Story 11.1) : `useBillingQuotes()` deja cree — utiliser dans `quotes-list.tsx`.
- **Pattern `useFieldArray`** : react-hook-form supporte nativement les tableaux de champs — pas besoin d'etat useState pour les lignes.
- **`showSuccess/showError`** : depuis `@monprojetpro/ui` — pattern etabli dans toutes les stories precedentes.
- **Notification in-app** : pattern depuis modules chat/notifications — `supabase.from('notifications').insert(...)`.

### Technical Constraints

- **Module ne peut PAS importer CRM** : pour fetcher les clients, creer une action `getClientsWithPennylane()` dans le module facturation (lit la table `clients` directement).
- **Pennylane n'envoie l'email PDF** que si le devis est en statut 'pending' (non brouillon). Si MiKL choisit "Brouillon", le devis reste en 'draft' dans Pennylane — Pennylane ne l'envoie pas.

### References

- [Source: epic-11-facturation-abonnements-stories-detaillees.md#Story 11.3]
- [Pennylane quotes endpoint: https://pennylane.readme.io/]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Fix: `'client-1'` n'est pas un UUID valide → utiliser `'00000000-0000-0000-0000-000000000001'` dans les fixtures de test
- Fix: `getByText(/en attente/i)` ambiguïté filtre + badge → `getAllByText` + `getByText('Accepté')`

### Completion Notes List
- `packages/modules/facturation/package.json` créé (manquait depuis Story 11.1)
- `BillingDashboard` composant principal avec onglets Devis / Nouveau devis / Factures / Abonnements
- `QuoteForm` : react-hook-form + Zod, useFieldArray, calcul HT/TVA/TTC en temps réel via useWatch
- `QuotesList` : lit `billing_sync` via `useBillingSyncRows` hook (nouveau), badges statut colorés, filtres client/statut/période, actions Relancer/Annuler/Convertir
- `createAndSendQuote` : auth → fetch client → map lineItems → POST /quotes → finalize si sendNow → notification → triggerBillingSync → activity log
- `convertQuoteToInvoice` : auth → GET /quotes/{id} → POST /customer_invoices → activity log
- `getClientsWithPennylane` : liste les clients actifs avec pennylane_customer_id non null
- `useBillingSyncRows` ajouté dans `use-billing.ts` pour lecture brute `billing_sync` typée
- Tous types Story 11.3 ajoutés : `CreateQuoteOptions`, `ClientWithPennylane`, `BillingSyncRow`
- 33 tests passent : 10 (create-quote) + 4 (convert-quote-to-invoice) + 8 (quote-form) + 11 (quotes-list)

### Code Review Fixes (Opus)
- CR #1 HIGH: Supprimé dead re-exports (`fromPennylaneInvoice`, `Invoice`, `PennylaneCustomerInvoice`) de create-quote.ts
- CR #2 HIGH: Ajouté filtres client (dropdown) et période (7j/30j/90j) dans QuotesList (AC #3)
- CR #3 HIGH: Ajouté actions "Relancer" (pending) et "Annuler" (draft/pending) dans QuotesList (AC #3)
- CR #4 MEDIUM: Extrait `assertOperator()` dans `assert-operator.ts` partagé — remplace la duplication dans 3 fichiers
- CR #5 MEDIUM: Notification insert error maintenant loggée avec console.warn
- CR #6-7 MEDIUM: Activity log insert errors maintenant loggées avec console.warn (create-quote + convert-quote)

### File List
- packages/modules/facturation/package.json (CRÉE)
- packages/modules/facturation/types/billing.types.ts (MODIFIÉ — +CreateQuoteOptions, +ClientWithPennylane, +BillingSyncRow)
- packages/modules/facturation/hooks/use-billing.ts (MODIFIÉ — +useBillingSyncRows)
- packages/modules/facturation/actions/assert-operator.ts (CRÉE — CR fix #4)
- packages/modules/facturation/actions/get-clients.ts (CRÉE)
- packages/modules/facturation/actions/create-quote.ts (CRÉE)
- packages/modules/facturation/actions/create-quote.test.ts (CRÉE — 10 tests)
- packages/modules/facturation/actions/convert-quote-to-invoice.ts (CRÉE)
- packages/modules/facturation/actions/convert-quote-to-invoice.test.ts (CRÉE — 4 tests)
- packages/modules/facturation/components/quote-form.tsx (CRÉE)
- packages/modules/facturation/components/quote-form.test.tsx (CRÉE — 8 tests)
- packages/modules/facturation/components/quotes-list.tsx (CRÉE)
- packages/modules/facturation/components/quotes-list.test.tsx (CRÉE — 11 tests)
- packages/modules/facturation/components/billing-dashboard.tsx (CRÉE)
- packages/modules/facturation/index.ts (MODIFIÉ — exports BillingDashboard, QuoteForm, QuotesList, createAndSendQuote, convertQuoteToInvoice, getClientsWithPennylane, useBillingSyncRows)
- apps/hub/app/(dashboard)/modules/facturation/page.tsx (CRÉE)
- apps/hub/app/(dashboard)/modules/facturation/loading.tsx (CRÉE)
- apps/hub/app/(dashboard)/modules/facturation/error.tsx (CRÉE)
- apps/hub/package.json (MODIFIÉ — +@monprojetpro/modules-facturation)
- _bmad-output/implementation-artifacts/sprint-status.yaml (MODIFIÉ — 11-3 → done)
