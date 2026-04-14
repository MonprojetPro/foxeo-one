# Story 11.1: Module Facturation — Structure, integration Pennylane & types

Status: done

## Story

As a **MiKL (operateur)**,
I want **un module de facturation integre dans le Hub connecte a Pennylane**,
so that **je peux gerer devis, factures et paiements de mes clients depuis une interface unifiee**.

## Acceptance Criteria

**Given** le module Facturation n'existe pas encore dans MonprojetPro
**When** le module est cree
**Then** la structure suivante est en place :
```
packages/modules/facturation/
  index.ts
  manifest.ts                    # { id: 'facturation', targets: ['hub', 'client-one'], dependencies: [] }
  docs/
    guide.md                     # Guide utilisateur module facturation
    faq.md                       # FAQ facturation
    flows.md                     # Flux devis → facture → paiement
  components/
    (vide pour l'instant)
  hooks/
    use-billing.ts               # Hook TanStack Query pour les donnees facturation
  actions/
    billing-proxy.ts             # Server Actions proxy vers Pennylane API v2
  types/
    billing.types.ts             # Types TypeScript mappes aux modeles Pennylane
  config/
    pennylane.ts                 # Configuration client API Pennylane
```

**Given** le proxy API Pennylane
**When** `config/pennylane.ts` est configure
**Then** il expose un client HTTP configure avec :
- `PENNYLANE_API_URL` : `https://app.pennylane.com/api/external/v2` (fixe)
- `PENNYLANE_API_TOKEN` : Bearer token (depuis env var serveur, jamais expose cote client)
- Headers par defaut : `Authorization: Bearer {token}`, `Content-Type: application/json`, `Accept: application/json`
- Timeout : 30 secondes
- Retry : 1 retry en cas de timeout ou erreur 5xx
- Gestion du rate limiting : respect des headers `retry-after` si 429 (25 req / 5 sec)

**Given** les types de facturation
**When** `billing.types.ts` est cree
**Then** les types principaux sont definis (mappes aux modeles Pennylane API v2) :
```typescript
// Types Pennylane (snake_case, miroir API)
type PennylaneQuote = {
  id: string
  customer_id: string
  quote_number: string
  status: 'draft' | 'pending' | 'accepted' | 'denied'
  date: string
  deadline: string
  line_items: PennylaneLineItem[]
  currency: string
  amount: number
  currency_amount_before_tax: number
  currency_tax: number
  pdf_invoice_free_text: string | null
  created_at: string
  updated_at: string
}

type PennylaneCustomerInvoice = {
  id: string
  customer_id: string
  invoice_number: string
  status: 'draft' | 'pending' | 'paid' | 'unpaid'
  date: string
  deadline: string
  line_items: PennylaneLineItem[]
  currency: string
  amount: number
  currency_amount_before_tax: number
  currency_tax: number
  remaining_amount: number
  pdf_invoice_free_text: string | null
  file_url: string | null
  created_at: string
  updated_at: string
}

type PennylaneLineItem = {
  label: string
  description: string | null
  quantity: number
  unit: string
  vat_rate: string              // ex: 'FR_200' pour 20%
  currency_amount: number       // prix unitaire HT
  plan_item_number: string | null
}

type PennylaneBillingSubscription = {
  id: string
  customer_id: string
  status: 'active' | 'stopped' | 'finished'
  start_date: string
  recurring_period: 'monthly' | 'quarterly' | 'yearly'
  line_items: PennylaneLineItem[]
  amount: number
  created_at: string
  updated_at: string
}

// Types MonprojetPro internes (camelCase, convention projet)
type Quote = {
  id: string
  clientId: string
  number: string
  status: 'draft' | 'pending' | 'accepted' | 'denied'
  lineItems: LineItem[]
  totalHt: number
  totalTtc: number
  tax: number
  validUntil: string
  createdAt: string
}

type Invoice = {
  id: string
  clientId: string
  number: string
  status: 'draft' | 'pending' | 'paid' | 'unpaid'
  lineItems: LineItem[]
  totalHt: number
  totalTtc: number
  amountPaid: number
  remainingAmount: number
  dueDate: string
  pdfUrl: string | null
  createdAt: string
}

type LineItem = {
  label: string
  description: string | null
  quantity: number
  unitPrice: number
  vatRate: string
  total: number
}

type BillingSubscription = {
  id: string
  clientId: string
  status: 'active' | 'stopped' | 'finished'
  plan: 'essentiel' | 'agentique' | 'ponctuel'
  frequency: 'monthly' | 'quarterly' | 'yearly'
  amount: number
  startDate: string
  extras: string[]
}
```

**Given** le mapping client MonprojetPro ↔ Pennylane
**When** un client est cree dans MonprojetPro Hub
**Then** un customer correspondant est cree dans Pennylane via `POST /api/external/v2/customers`
**And** le `pennylane_customer_id` est stocke dans la table `clients` (nouvelle colonne)
**And** la migration Supabase ajoute :
```sql
ALTER TABLE clients ADD COLUMN pennylane_customer_id TEXT;
```

## Tasks / Subtasks

- [x] Creer la structure du module facturation (AC: #1)
  - [x] Creer `packages/modules/facturation/manifest.ts` avec `ModuleManifest` : `{ id: 'facturation', name: 'Facturation', targets: ['hub', 'client-one'], dependencies: [], requiredTables: ['billing_sync'] }`
  - [x] Creer `packages/modules/facturation/index.ts` barrel export
  - [x] Creer `packages/modules/facturation/docs/guide.md` — guide utilisateur module facturation
  - [x] Creer `packages/modules/facturation/docs/faq.md` — FAQ facturation (Pennylane, paiements, devis)
  - [x] Creer `packages/modules/facturation/docs/flows.md` — flux devis → facture → paiement → avoir

- [x] Creer les types billing (AC: #3)
  - [x] Creer `packages/modules/facturation/types/billing.types.ts` avec tous les types Pennylane (PennylaneQuote, PennylaneCustomerInvoice, PennylaneLineItem, PennylaneBillingSubscription) et types MonprojetPro internes (Quote, Invoice, LineItem, BillingSubscription)
  - [x] Creer fonctions de mapping `toPennylaneQuote()`, `fromPennylaneQuote()`, `toPennylaneInvoice()`, `fromPennylaneInvoice()`, `fromPennylaneSubscription()` dans `packages/modules/facturation/utils/billing-mappers.ts`

- [x] Creer le client API Pennylane (AC: #2)
  - [x] Creer `packages/modules/facturation/config/pennylane.ts` :
    - Client HTTP avec `PENNYLANE_API_URL` = `https://app.pennylane.com/api/external/v2`
    - Token Bearer depuis `process.env.PENNYLANE_API_TOKEN` (serveur uniquement)
    - Timeout 30s, retry 1x sur 5xx/timeout
    - Rate limiting : respect header `retry-after` sur 429, monitoring `ratelimit-remaining`
    - Header migration 2026 : `X-Use-2026-API-Changes: true` (opt-in early)
    - Methodes : `get<T>(path)`, `post<T>(path, body)`, `put<T>(path, body)`, `del(path)`
    - Gestion erreurs : retourner `{ data, error }` (pattern ActionResponse)

- [x] Creer les Server Actions proxy billing (AC: #2, #4)
  - [x] Creer `packages/modules/facturation/actions/billing-proxy.ts` :
    - `createPennylaneCustomer(clientId, companyName, email)` : POST /customers → retourne pennylane_customer_id
    - `getPennylaneCustomer(pennylaneCustomerId)` : GET /customers/{id}
    - `listQuotes(pennylaneCustomerId?)` : GET /quotes avec filtres
    - `listInvoices(pennylaneCustomerId?)` : GET /customer_invoices avec filtres
    - `listSubscriptions(pennylaneCustomerId?)` : GET /billing_subscriptions avec filtres
    - Toutes les actions verifient `is_operator()` (auth check)
    - Toutes retournent `ActionResponse<T>` (jamais throw)

- [x] Creer le hook TanStack Query (AC: #1)
  - [x] Creer `packages/modules/facturation/hooks/use-billing.ts` :
    - `useBillingQuotes(clientId?)` : query key `['billing', 'quotes', clientId]`
    - `useBillingInvoices(clientId?)` : query key `['billing', 'invoices', clientId]`
    - `useBillingSubscriptions(clientId?)` : query key `['billing', 'subscriptions', clientId]`
    - `useBillingSummary()` : query key `['billing', 'summary']` — metriques globales
    - `staleTime: 5 * 60 * 1000` (5 min, aligne sur le cycle polling)
    - Données proviennent de `billing_sync` (pas d'appel Pennylane direct depuis le front)

- [x] Creer la migration Supabase (AC: #4)
  - [x] Creer `supabase/migrations/00062_add_pennylane_customer_id.sql` :
    - `ALTER TABLE clients ADD COLUMN pennylane_customer_id TEXT;`
    - Index : `CREATE INDEX idx_clients_pennylane ON clients(pennylane_customer_id) WHERE pennylane_customer_id IS NOT NULL;`
    - Pas de NOT NULL (migration progressive — clients existants n'ont pas encore de mapping)

- [x] Creer les tests unitaires (TDD)
  - [x] Test `pennylane.ts` : client HTTP, retry, rate limiting, headers, error handling (13 tests)
  - [x] Test `billing-mappers.ts` : mapping Pennylane ↔ MonprojetPro, edge cases null fields (14 tests)
  - [x] Test `billing-proxy.ts` : createCustomer, listQuotes, listInvoices, auth check, error responses (10 tests)
  - [x] Test `use-billing.ts` : query keys, staleTime, data transformation (10 tests)
  - [x] Test `manifest.ts` : contract test validité manifest (2 tests)

## Dev Notes

### Architecture Patterns

- **Pattern proxy API** : les Server Actions dans `billing-proxy.ts` appellent `pennylane.ts` qui fait le vrai HTTP vers Pennylane. Le front ne connait PAS l'API Pennylane — il lit `billing_sync` (table miroir, Story 11.2) via TanStack Query.
- **Pattern `{ data, error }`** : toutes les fonctions du client Pennylane et des Server Actions retournent `ActionResponse<T>`. Jamais de throw.
- **Pattern module plug & play** : `manifest.ts` est le premier fichier, `requiredTables: ['billing_sync']` (table creee en Story 11.2).
- **Separation types** : types Pennylane (snake_case, miroir API) dans la meme fichier que les types MonprojetPro (camelCase). Mappers dans un fichier separe.
- **Hook reads billing_sync** : le hook `use-billing.ts` lit depuis la table `billing_sync` (pas d'appel direct Pennylane). Les Server Actions proxy sont pour les mutations (creation devis, factures — Stories 11.3+).

### Pennylane API v2 — Specifications techniques (mars 2026)

- **Base URL** : `https://app.pennylane.com/api/external/v2`
- **Auth** : Bearer token (`Authorization: Bearer {token}`)
- **Rate limiting** : 25 requetes / 5 secondes par token. Headers : `ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset`. Sur 429 : `retry-after` (secondes).
- **Pagination** : cursor-based (champs `has_more`, `next_cursor`). Max 1000 items par page.
- **Changelog endpoints** (pour polling Story 11.2) : `/changelogs/customer_invoices`, `/changelogs/customers`. Parametres : `start_date` (timestamp dernier sync), retourne `operation: 'insert' | 'update' | 'delete'`. Retention : 4 semaines.
- **Migration 2026** : header `X-Use-2026-API-Changes: true` pour opt-in early. Deadline finale : 1er juillet 2026. Changements : cursor pagination, sort order desc par defaut, ID format simplifie, scopes granulaires.
- **Verification** : `GET /me` pour tester la connexion.
- **Endpoints cles** :
  - `POST /customers` — creer un client
  - `GET /customers/{id}` — recuperer un client
  - `GET /quotes` / `POST /quotes` — devis
  - `GET /customer_invoices` / `POST /customer_invoices` — factures
  - `GET /billing_subscriptions` / `POST /billing_subscriptions` — abonnements
  - `GET /changelogs/customer_invoices` — changelog pour polling

### Source Tree Components

```
packages/modules/facturation/
├── index.ts                          # CREER: barrel export
├── manifest.ts                       # CREER: ModuleManifest
├── docs/
│   ├── guide.md                      # CREER: guide utilisateur
│   ├── faq.md                        # CREER: FAQ
│   └── flows.md                      # CREER: flux
├── config/
│   └── pennylane.ts                  # CREER: client HTTP Pennylane
├── types/
│   └── billing.types.ts              # CREER: tous les types
├── utils/
│   ├── billing-mappers.ts            # CREER: mapping Pennylane ↔ MonprojetPro
│   └── billing-mappers.test.ts       # CREER: tests mappers
├── hooks/
│   ├── use-billing.ts                # CREER: hooks TanStack Query
│   └── use-billing.test.ts           # CREER: tests hooks
└── actions/
    ├── billing-proxy.ts              # CREER: Server Actions proxy
    └── billing-proxy.test.ts         # CREER: tests proxy

supabase/migrations/
└── 00062_add_pennylane_customer_id.sql  # CREER: colonne pennylane_customer_id
```

### Existing Code Findings

- **SubscriptionTier** existe deja dans `packages/modules/crm/types/subscription.types.ts` : `'base' | 'essentiel' | 'agentique'` — reutiliser pour le mapping `BillingSubscription.plan`
- **`pending_billing_update`** dans `client_configs` (migration 00054) — flag mis a `true` lors d'un changement de tier (Story 9.4). Epic 11 devra le consommer.
- **`change-tier.ts`** dans CRM : sets `pending_billing_update: true` — la future Edge Function `billing-sync` (11.2) devra detecter ce flag et synchroniser avec Pennylane.
- **Email template `payment-failed.ts`** existe deja dans `supabase/functions/_shared/email-templates/` — pret pour Story 11.4.
- **Pattern Edge Function** : `Deno.serve()` + `createClient(URL, SERVICE_ROLE_KEY)` + cron via `pg_cron SELECT cron.schedule(...)`. Voir `elio-alerts-cron`, `check-inactivity` pour reference.
- **Derniere migration** : `00061_create_client_assets_bucket.sql` → prochaine : `00062`.
- **MrrInfo** type dans `crm.types.ts` : `{ available: boolean, amount?: number }` — le hook `useBillingSummary()` fournira les vraies donnees MRR.
- **Module manifest pattern** : voir `packages/modules/chat/manifest.ts` ou `packages/modules/crm/manifest.ts` pour reference.

### Technical Constraints

- **Pennylane token serveur uniquement** : `process.env.PENNYLANE_API_TOKEN` dans les Server Actions et Edge Functions. JAMAIS expose cote client (pas de `NEXT_PUBLIC_`). En production : Supabase project secrets / Vercel env vars.
- **Pas de compte Pennylane disponible actuellement** : tout le code est developpe en mode mock. Le client HTTP `pennylane.ts` est pret mais ne sera teste en reel que quand le token sera disponible.
- **Migration 2026 Pennylane** : utiliser le header `X-Use-2026-API-Changes: true` des maintenant pour etre compatible avec les changements (cursor pagination, sort desc, scopes granulaires). Deadline migration : 1er juillet 2026.
- **Changelog polling** : les changelogs Pennylane ne retiennent que 4 semaines de donnees. Le premier sync devra faire un full fetch initial puis utiliser `start_date` pour le delta.
- **Table `billing_sync`** : creee en Story 11.2 (pas dans cette story). Le hook `use-billing.ts` lit cette table — pour les tests de cette story, mocker les donnees.
- **Inter-module interdit** : le module `facturation` ne peut PAS importer depuis `crm`. La relation `client_id` passe par Supabase (table `clients`). Le `pennylane_customer_id` est une colonne de la table `clients` (partagee).
- **Rate limit Pennylane** : 25 req/5s. Le client HTTP doit monitorer `ratelimit-remaining` et attendre `retry-after` sur 429. Pattern : queue sequentielle avec backoff.

### UI Patterns

- Pas de composants UI dans cette story (fondation technique). Les composants arrivent en Story 11.3+.

### Previous Story Learnings (Story 10.4)

- `URL.createObjectURL()` memory leak — toujours revoke. Pattern a suivre pour tout preview de fichiers.
- Pattern `extraTabs` dans les composants tabs — extensible sans modifier le composant parent.
- Les Server Actions Supabase Storage avec `upsert: true` fonctionnent bien pour les fichiers uniques.
- Le pattern CSS variable override (`--accent`) est operationnel dans le layout client.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-11-facturation-abonnements-stories-detaillees.md#Story 11.1]
- [Source: docs/project-context.md#Services Externes] — Pennylane integration pattern
- [Source: packages/modules/crm/types/subscription.types.ts] — SubscriptionTier existant
- [Source: supabase/migrations/00054_subscription_tier.sql] — pending_billing_update flag
- [Source: packages/modules/crm/actions/change-tier.ts] — sets pending_billing_update
- [Source: supabase/functions/_shared/email-templates/payment-failed.ts] — template email pret
- [Pennylane API v2 Docs: https://pennylane.readme.io/docs/getting-started]
- [Pennylane 2026 Migration: https://pennylane.readme.io/docs/2026-api-changes-guide]
- [Pennylane Changelog Endpoints: https://pennylane.readme.io/docs/tracking-data-changes-with-pennylane-api]
- [Pennylane Rate Limiting: https://pennylane.readme.io/docs/rate-limiting-1]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Fix test `throws` → `rejects.toThrow` : `getToken()` lance synchrone dans une async fn → rejection Promise (pas throw synchrone capturé par `.toThrow()`)

### Completion Notes List
- Module `facturation` créé avec structure complète plug & play
- Client HTTP Pennylane avec retry (1x sur 5xx/timeout), rate limiting (retry-after sur 429, max 3 retries), header 2026 migration
- Types séparés : Pennylane snake_case (miroir API) + MonprojetPro camelCase (interne)
- Mappers bidirectionnels Quote ↔ PennylaneQuote, Invoice ↔ PennylaneCustomerInvoice, Subscription
- Server Actions proxy avec auth check `is_operator()` retourne client Supabase pour réutilisation, pattern `{ data, error }` strict
- Hook `use-billing.ts` lit depuis `billing_sync` (table Story 11.2), staleTime 5min aligné polling
- Migration `00062` : colonne `pennylane_customer_id TEXT` nullable + index partiel
- **50 tests passing** (14 pennylane client + 14 mappers + 10 proxy + 10 hooks + 2 manifest)
- **CR fixes (Opus):** H1-supprimé import serveur dans hook client, H2-ajouté garde max 3 retries sur 429, M1-getToken retourne null→{data,error} au lieu de throw, M2-assertOperator retourne supabase client pour réutilisation, M3-documenté casts temporaires billing_sync, M4-ajouté champ unit à LineItem, L1-supprimé import inutilisé

### File List
- packages/modules/facturation/manifest.ts (créé)
- packages/modules/facturation/index.ts (créé)
- packages/modules/facturation/docs/guide.md (créé)
- packages/modules/facturation/docs/faq.md (créé)
- packages/modules/facturation/docs/flows.md (créé)
- packages/modules/facturation/types/billing.types.ts (créé)
- packages/modules/facturation/utils/billing-mappers.ts (créé)
- packages/modules/facturation/utils/billing-mappers.test.ts (créé)
- packages/modules/facturation/config/pennylane.ts (créé)
- packages/modules/facturation/config/pennylane.test.ts (créé)
- packages/modules/facturation/actions/billing-proxy.ts (créé)
- packages/modules/facturation/actions/billing-proxy.test.ts (créé)
- packages/modules/facturation/hooks/use-billing.ts (créé)
- packages/modules/facturation/hooks/use-billing.test.ts (créé)
- packages/modules/facturation/manifest.test.ts (créé)
- supabase/migrations/00062_add_pennylane_customer_id.sql (créé)
- _bmad-output/implementation-artifacts/sprint-status.yaml (mis à jour : 11-1 → done)
