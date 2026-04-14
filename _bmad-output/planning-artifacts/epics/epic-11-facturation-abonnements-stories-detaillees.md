# Epic 11 : Facturation & Abonnements — Stories detaillees

**Objectif :** MiKL et les clients gerent devis, factures et abonnements via Pennylane API v2 (SaaS) avec Stripe connecte pour les paiements CB, virement IBAN sur Compte Pro Pennylane, et SEPA optionnel. Synchronisation par polling intelligent (Edge Function cron). Conformite facturation electronique sept. 2026 geree nativement par Pennylane.

**FRs couverts:** FR77, FR78, FR94, FR95, FR96, FR97, FR98, **FR169, FR170**

**NFRs pertinentes:** NFR-I1, NFR-I3, NFR-S1, NFR-S7, NFR-P2, NFR-A1 a NFR-A4, NFR-M1 a NFR-M5

**Note architecturale (mise a jour 11/02/2026) :**

La facturation est geree par **Pennylane API v2** (SaaS cloud). Ce choix remplace Invoice Ninja (self-hosted Docker) pour les raisons suivantes :
1. **Conformite facturation electronique** obligatoire sept. 2026 — Pennylane gere nativement
2. **Expert-comptable MiKL** utilise Pennylane — single source of truth comptable
3. **API plus riche** : compta, export FEC, balance, abonnements, categories analytiques
4. **Moins d'infra** : pas de Docker Invoice Ninja + MySQL a maintenir

MonprojetPro Hub expose une UI custom (React) qui communique via des Server Actions proxy vers Pennylane API v2. Les clients accedent a une vue lecture seule "Mes Factures" dans leur dashboard One (donnees issues de la table miroir `billing_sync`).

**Absence de webhooks Pennylane** : Pennylane n'a pas de webhooks publics. La synchronisation se fait par **polling intelligent** via une Supabase Edge Function (cron toutes les 5 minutes) qui detecte les changements et les propage via Supabase Realtime → invalidation TanStack Query.

**Paiements** : Stripe connecte a Pennylane (CB), virement IBAN Compte Pro Pennylane (affiche sur facture), prelevement SEPA optionnel. Pennylane gere la reconciliation dans tous les cas.

---

## Story 11.1 : Module Facturation — Structure, integration Pennylane & types

> **Technical Enabler** — Integration technique, prerequis au module facturation visible.

As a **MiKL (operateur)**,
I want **un module de facturation integre dans le Hub connecte a Pennylane**,
So that **je peux gerer devis, factures et paiements de mes clients depuis une interface unifiee**.

**Acceptance Criteria :**

**Given** le module Facturation n'existe pas encore dans MonprojetPro
**When** le module est cree
**Then** la structure suivante est en place :
```
modules/facturation/
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
- `PENNYLANE_API_TOKEN` : Bearer token (depuis Supabase Vault, jamais expose cote client, NFR-S8)
- Headers par defaut : `Authorization: Bearer {token}`, `Content-Type: application/json`, `Accept: application/json`
- Timeout : 30 secondes (NFR-I1)
- Retry : 1 retry en cas de timeout ou erreur 5xx
- Gestion du rate limiting : respect des headers `Retry-After` si 429

**Given** les types de facturation
**When** `billing.types.ts` est cree
**Then** les types principaux sont definis (mappes aux modeles Pennylane API v2) :
```typescript
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

// Types MonprojetPro internes (mappes depuis Pennylane)
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

---

## Story 11.2 : Edge Function billing-sync — Polling intelligent Pennylane

> **Technical Enabler** — Synchronisation des donnees Pennylane vers Supabase, prerequis aux vues facturation.

As a **MiKL (operateur)**,
I want **que les donnees de facturation Pennylane soient synchronisees automatiquement dans MonprojetPro**,
So that **le Hub et les dashboards clients affichent des donnees de facturation a jour sans action manuelle**.

**Acceptance Criteria :**

**Given** Pennylane n'a pas de webhooks publics
**When** la strategie de synchronisation est mise en place
**Then** une Supabase Edge Function `billing-sync` est creee avec :
- Execution cron toutes les 5 minutes
- Appel Pennylane API v2 pour recuperer les entites modifiees depuis le dernier check
- Comparaison avec la table miroir `billing_sync` dans Supabase
- Mise a jour des enregistrements modifies
- Supabase Realtime propage les changements

**Given** la table miroir `billing_sync` n'existe pas
**When** la migration est creee
**Then** :
```sql
CREATE TABLE billing_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,         -- 'quote' | 'invoice' | 'subscription' | 'customer'
  pennylane_id TEXT NOT NULL,        -- ID Pennylane de l'entite
  client_id UUID REFERENCES clients(id),
  status TEXT NOT NULL,              -- statut actuel
  data JSONB NOT NULL,               -- donnees completes (snapshot Pennylane)
  amount INTEGER,                    -- montant en centimes
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, pennylane_id)
);

CREATE INDEX idx_billing_sync_client ON billing_sync(client_id);
CREATE INDEX idx_billing_sync_type_status ON billing_sync(entity_type, status);

-- RLS : MiKL voit tout, client voit uniquement ses enregistrements
ALTER TABLE billing_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_sync_select_operator ON billing_sync FOR SELECT USING (is_operator());
CREATE POLICY billing_sync_select_owner ON billing_sync FOR SELECT USING (client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid()));
```

**Given** l'Edge Function s'execute
**When** elle detecte un changement (nouveau devis, facture payee, etc.)
**Then** :
1. L'enregistrement dans `billing_sync` est mis a jour (UPSERT)
2. Le champ `updated_at` est actualise (declenche le trigger Realtime)
3. Le frontend (Hub ou Client) recoit l'evenement via Supabase Realtime
4. TanStack Query invalide les queries `billing` → UI mise a jour automatiquement

**Given** l'Edge Function rencontre une erreur
**When** Pennylane API est indisponible ou rate-limite
**Then** :
1. L'erreur est loggee dans `activity_logs` (type 'billing_sync_error')
2. L'Edge Function retente au prochain cycle (5 min)
3. Le systeme reste fonctionnel avec les dernieres donnees en cache
4. Si 3 echecs consecutifs, MiKL est notifie : "Alerte — synchronisation facturation en erreur"

**Given** MiKL ou un client veut des donnees en temps reel
**When** un bouton "Rafraichir" est clique dans le module facturation
**Then** une Server Action declenche un sync immediat (appel Pennylane + UPSERT billing_sync)
**And** le resultat est affiche sans attendre le prochain cycle cron

---

## Story 11.3 : Creation & envoi de devis par MiKL (Pennylane)

As a **MiKL (operateur)**,
I want **creer et envoyer des devis a mes clients avec suivi du statut**,
So that **je peux proposer des prestations de maniere professionnelle et suivre les acceptations**.

**Acceptance Criteria :**

**Given** MiKL accede au module Facturation dans le Hub (FR77)
**When** il clique sur "Nouveau devis"
**Then** un formulaire de creation s'affiche avec :
- Selection du client (dropdown des clients actifs, mappe vers `pennylane_customer_id`)
- Lignes du devis (ajout dynamique) : designation, description, quantite, prix unitaire HT, total ligne
- TVA : 20% par defaut (`vat_rate: 'FR_200'`), configurable
- Total HT, TVA, Total TTC (calcul automatique)
- Conditions : "Devis valable 30 jours" (par defaut, editable)
- Notes publiques (visibles par le client) et notes privees (MiKL uniquement)
- Pre-remplissage possible par Orpheus/Elio Hub (donnees structurees JSON)
- Boutons : "Enregistrer (brouillon)" / "Envoyer au client"
**And** le formulaire utilise react-hook-form avec validation Zod

**Given** MiKL envoie le devis
**When** la Server Action `createAndSendQuote(clientId, lineItems, terms)` s'execute
**Then** :
1. Le devis est cree dans Pennylane via `POST /api/external/v2/quotes` avec le mapping :
   - `customer_id` : pennylane_customer_id du client
   - `line_items` : lignes avec `label`, `quantity`, `currency_amount`, `vat_rate`, `unit`
   - `pdf_invoice_free_text` : notes publiques + conditions
   - `date` : date du jour
   - `deadline` : date + 30 jours
2. Si "Envoyer" : le devis est finalise dans Pennylane (statut 'pending')
3. Une notification in-app est envoyee au client : "Nouveau devis de MiKL — {montant} €"
4. Un sync immediat est declenche pour mettre a jour `billing_sync`
**And** un toast confirme "Devis envoye a {client}"
**And** le devis est visible dans la liste des devis du Hub

**Given** MiKL veut suivre le statut d'un devis (FR78)
**When** il consulte la liste des devis
**Then** il voit pour chaque devis (depuis `billing_sync` WHERE `entity_type = 'quote'`) :
- Numero, client, montant, date de creation
- Statut avec badge colore : brouillon (gris), en attente (bleu), accepte (vert), refuse (rouge)
- Actions disponibles : "Relancer", "Convertir en facture", "Annuler"
**And** les filtres disponibles : par statut, par client, par periode
**And** les donnees proviennent de la table `billing_sync` (synchronisee depuis Pennylane)

**Given** un client accepte un devis
**When** le polling detecte le changement de statut dans Pennylane (`status: 'accepted'`)
**Then** :
1. `billing_sync` est mis a jour → Realtime notifie le Hub
2. MiKL est notifie : "Le client {nom} a accepte le devis {numero} — {montant} €"
3. MiKL peut convertir en facture via Server Action : `POST /api/external/v2/customer_invoices` (creation depuis le devis)
4. La facture est creee dans Pennylane et envoyee au client
**And** le cache TanStack Query est invalide

---

## Story 11.4 : Abonnements recurrents Pennylane & gestion des echecs de paiement

As a **MiKL (operateur)**,
I want **gerer les abonnements recurrents de mes clients via Pennylane avec des alertes en cas d'echec de paiement**,
So that **les paiements sont automatises et je suis prevenu immediatement si un client a un probleme de paiement**.

**Acceptance Criteria :**

**Given** MiKL veut creer un abonnement recurrent pour un client (FR94)
**When** il accede a la fiche client, section "Abonnement"
**Then** il peut configurer la facturation recurrente :
- Type d'abonnement : Ponctuel / Essentiel (49€/mois) / Agentique (99€/mois)
- Frequence : mensuelle (par defaut), trimestrielle, annuelle
- Date de debut
- Modules supplementaires avec surcout (ex : Signature +15€/mois, SEO Advanced +25€/mois)
- Mode de paiement prefere : CB (via Stripe/Pennylane), virement IBAN, prelevement SEPA
- Bouton "Creer l'abonnement"

**Given** MiKL cree l'abonnement
**When** la Server Action `createSubscription(clientId, plan, frequency, extras, paymentMethod)` s'execute
**Then** :
1. Un abonnement est cree dans Pennylane via `POST /api/external/v2/billing_subscriptions` avec :
   - `customer_id` : pennylane_customer_id du client
   - `recurring_period` : 'monthly' | 'quarterly' | 'yearly'
   - `start_date` : date choisie
   - `line_items` : forfait de base + modules extras
2. Pennylane genere automatiquement les factures recurrentes selon la frequence
3. Les factures affichent l'IBAN du Compte Pro Pennylane pour les virements
4. Si CB : le bouton "Payer maintenant" sur la facture Pennylane utilise Stripe Checkout (connecte a Pennylane)
5. Un sync immediat est declenche
**And** un toast confirme "Abonnement cree pour {client}"

**Given** un paiement echoue (FR95)
**When** le polling detecte une facture avec `status: 'unpaid'` et depassement de la `deadline`
**Then** :
1. La facture est marquee 'overdue' dans `billing_sync`
2. Une notification prioritaire est envoyee a MiKL : "Echec/retard de paiement pour {client} — facture {numero}, {montant} €"
3. Une notification est envoyee au client : "Votre paiement de {montant} € est en attente. Veuillez proceder au paiement."
4. Pennylane gere les rappels automatiques selon sa configuration
**And** l'evenement est logge dans `activity_logs`
**And** apres 3 factures impayees consecutives, MiKL est alerte avec priorite critique

**Given** un paiement reussit
**When** le polling detecte le changement de statut (`status: 'paid'`)
**Then** :
1. `billing_sync` est mis a jour → Realtime notifie
2. La facture est marquee 'paid' dans l'interface
3. Le client est notifie : "Paiement de {montant} € recu — merci !"
**And** le cache TanStack Query est invalide
**And** Pennylane gere la reconciliation comptable automatiquement

---

## Story 11.5 : Historique facturation client, avoirs & vue financiere Hub

As a **client MonprojetPro ou MiKL (operateur)**,
I want **consulter l'historique de facturation, generer des avoirs et avoir une vue financiere globale**,
So that **la gestion financiere est transparente, les corrections sont possibles, et MiKL a une vision cockpit**.

**Acceptance Criteria :**

**Given** un client One accede a sa section "Mes factures" (FR96)
**When** la page se charge
**Then** il voit (depuis `billing_sync` filtre par `client_id`) :
- La liste de toutes ses factures avec : numero, date, montant, statut (brouillon, en attente, payee, impayee)
- Pour chaque facture : bouton "Telecharger PDF" (URL depuis `billing_sync.data.file_url`)
- Pour les factures impayees : bouton "Payer maintenant" (redirige vers le lien de paiement Pennylane/Stripe)
- Un resume financier : total paye, montant en attente, prochain prelevement
**And** le client ne voit que SES factures (RLS sur `billing_sync.client_id`)
**And** la vue est lecture seule pour le client
**And** bouton "Rafraichir" pour sync immediate

**Given** MiKL veut generer un avoir pour un client (FR97)
**When** il accede a la facture concernee et clique "Creer un avoir"
**Then** un formulaire s'affiche avec :
- Reference de la facture d'origine
- Montant de l'avoir (max = montant de la facture)
- Raison de l'avoir (textarea)
- Bouton "Generer l'avoir"
**And** l'avoir (credit note) est cree dans Pennylane via `POST /api/external/v2/customer_invoices` (type credit note)
**And** Pennylane gere l'envoi email au client avec le PDF
**And** le montant est deduit automatiquement par Pennylane sur les prochaines factures (si applicable)
**And** MiKL est confirme par toast : "Avoir de {montant} € genere pour {client}"
**And** un sync immediat est declenche

**Given** un client veut mettre a jour ses informations de paiement (FR98)
**When** il accede a ses parametres, section "Paiement"
**Then** il voit :
- Le mode de paiement actuel (virement IBAN / CB / SEPA)
- Si CB : les 4 derniers chiffres de la carte
- Un bouton "Modifier mes informations de paiement"
**And** le bouton redirige vers le portail Stripe Customer (si CB) pour mise a jour securisee
**And** les informations de paiement ne sont jamais stockees dans MonprojetPro (pas de donnees CB, NFR-S1)

**Given** MiKL veut une vue financiere globale dans le Hub
**When** il accede au tableau de bord facturation
**Then** il voit (donnees Pennylane) :
- CA mensuel (somme factures payees du mois)
- Montant en attente (factures impayees)
- Nombre de devis en cours
- Abonnements actifs et leur valeur mensuelle recurrente (MRR)
**And** ces metriques sont calculees depuis `billing_sync` (pas d'appel API supplementaire)

---

## Story 11.6 : Facturation Lab 199€ — Paiement forfait & deduction setup One

As a **MiKL (operateur)**,
I want **facturer le forfait Lab a 199€, activer automatiquement l'acces Lab du client, et deduire ce montant du setup One si le client gradue**,
So that **le parcours Lab est financierement clair et le client beneficie de la deduction promise**.

**Acceptance Criteria:**

**Given** MiKL cree un client Lab et doit facturer le forfait Lab (FR169)
**When** il accede a la section "Facturation" de la fiche client et clique "Facturer le Lab"
**Then** une facture est generee via Pennylane `POST /api/external/v2/customer_invoices` avec :
- `customer_id` : pennylane_customer_id du client
- `line_items` : [{ label: "Forfait Lab MonprojetPro — Accompagnement creation de projet", quantity: 1, currency_amount: 199, vat_rate: "FR_200", unit: "piece" }]
- Type : facture unique (pas de recurrence)
- Pennylane gere l'envoi email + PDF + lien de paiement
**And** un sync immediat est declenche
**And** un toast confirme "Facture Lab envoyee a {client}"
**And** l'evenement est logge dans `activity_logs`

**Given** le client Lab paie le forfait 199€
**When** le polling detecte la facture Lab comme 'paid' dans Pennylane
**Then** :
1. `clients.lab_paid` → true
2. `clients.lab_paid_at` → NOW()
3. `clients.lab_amount` → 19900 (centimes)
4. Le dashboard Lab est active pour le client (si pas deja fait)
5. Elio Lab est active
6. MiKL est notifie : "Paiement Lab recu — {client} a acces au Lab"
**And** le client recoit une notification in-app : "Votre acces au Lab MonprojetPro est active !"

**Given** un client Lab gradue vers One (FR170)
**When** MiKL cree le devis setup One pour ce client
**Then** le systeme affiche automatiquement :
- Ligne de deduction : "Deduction forfait Lab" → -199€
- Le montant net du setup est calcule : setup_total - 199€
- Un tooltip explique : "Le forfait Lab (199€) est deduit du setup One, comme convenu."
**And** le devis Pennylane inclut la ligne de deduction avec `currency_amount: -199`
**And** la deduction est tracee dans les metadonnees : `metadata.lab_deduction: 19900`
**And** si le setup One est inferieur a 199€ (cas improbable), le montant net est 0€ (pas de remboursement du surplus)

**Given** MiKL veut voir l'historique des paiements Lab
**When** il filtre les factures par type "Lab" (tag ou categorie Pennylane)
**Then** il voit toutes les factures Lab avec statut (payee/en attente/annulee)
**And** pour les clients gradues, la mention "Deduit du setup One" est visible

---

## Resume Epic 11 — Couverture FRs

| Story | Titre | FRs couvertes |
|-------|-------|---------------|
| 11.1 | Module Facturation — structure, integration Pennylane & types | — (fondation technique) |
| 11.2 | Edge Function billing-sync — Polling intelligent Pennylane | — (fondation technique) |
| 11.3 | Creation & envoi de devis par MiKL (Pennylane) | FR77, FR78 |
| 11.4 | Abonnements recurrents Pennylane & gestion echecs paiement | FR94, FR95 |
| 11.5 | Historique facturation, avoirs & vue financiere Hub | FR96, FR97, FR98 |
| 11.6 | Facturation Lab 199€ — Paiement forfait & deduction setup One | FR169, FR170 |

**Toutes les 9 FRs de l'Epic 11 sont couvertes.**

---

## Changements architecturaux par rapport a la version precedente (Invoice Ninja)

| Element | AVANT (Invoice Ninja) | APRES (Pennylane) |
|---------|----------------------|-------------------|
| Service | Self-hosted Docker + MySQL | SaaS cloud (API v2) |
| Auth API | X-Api-Token header | Bearer token OAuth/Company |
| Endpoints | `/api/v1/quotes`, `/api/v1/invoices` | `/api/external/v2/quotes`, `/api/external/v2/customer_invoices` |
| Abonnements | `recurring_invoices` | `billing_subscriptions` |
| Webhooks | Oui (quote.approved, payment.created) | **Non disponibles** → polling Edge Function |
| Paiements | Stripe Connect OAuth via IN | Stripe connecte a Pennylane + virement IBAN + SEPA |
| Comptabilite | Non | Oui (ledger_entries, FEC export, trial_balance) |
| Conformite e-facture | Non | Oui (natif sept. 2026) |
| Infra | Docker IN + MySQL sur VPS | Rien a heberger |
| Fichiers supprimes | — | `webhooks/invoice-ninja/`, `webhooks/stripe/`, `docker/invoice-ninja/` |
| Fichiers ajoutes | — | `supabase/functions/billing-sync/`, `billing_sync` migration |

---
