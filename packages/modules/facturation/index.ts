// Module Comptabilité (facturation) — Gestion devis, factures, abonnements via Pennylane
export { manifest } from './manifest'

// Components (Story 11.3)
export { BillingDashboard } from './components/billing-dashboard'
export { QuoteForm } from './components/quote-form'
export { QuotesList } from './components/quotes-list'

// Components (Story 11.5)
export { InvoicesList } from './components/invoices-list'
export { BillingSummary } from './components/billing-summary'

// Components (Story 11.6)
export { LabBillingTab } from './components/lab-billing-tab'

// Components (Story 13.2)
export { DocumentsList } from './components/documents-list'
export { SubscriptionCard } from './components/subscription-card'
export { PdfDownloadButton } from './components/pdf-download-button'
export { EmptyAccounting } from './components/empty-accounting'

// Hooks
export { useBillingQuotes, useBillingInvoices, useBillingSubscriptions, useBillingSummary, useBillingSyncRows, useBillingMetrics, billingKeys } from './hooks/use-billing'

// Actions
export { createPennylaneCustomer, getPennylaneCustomer, listQuotes, listInvoices, listSubscriptions } from './actions/billing-proxy'
export { createAndSendQuote } from './actions/create-quote'
export { convertQuoteToInvoice } from './actions/convert-quote-to-invoice'
export { sendQuoteByEmail } from './actions/send-quote-by-email'
export { cancelQuote } from './actions/cancel-quote'
export { updateQuote } from './actions/update-quote'
export type { UpdateQuotePayload } from './actions/update-quote'
export { getQuoteWithLines } from './actions/get-quote-with-lines'
export type { QuoteWithLines } from './actions/get-quote-with-lines'
export { getClientsWithPennylane } from './actions/get-clients'
export { createCreditNote } from './actions/create-credit-note'
export { triggerClientBillingSync } from './actions/trigger-client-billing-sync'
export { sendLabInvoice } from './actions/send-lab-invoice'
export { getClientLabStatus } from './actions/get-client-lab-status'
export type { ClientLabStatus } from './actions/get-client-lab-status'

// Utils
export {
  fromPennylaneQuote,
  toPennylaneQuote,
  fromPennylaneInvoice,
  toPennylaneInvoice,
  fromPennylaneSubscription,
  fromPennylaneLineItem,
  toPennylaneLineItem,
} from './utils/billing-mappers'

// Story 13.4 — Tunnel paiement Pennylane
// IMPORTANT: les helpers serveur (HMAC, password gen, handlers, admin user) utilisent
// node:crypto et l'admin Supabase API. Ils sont exposes via le subpath `./server` pour
// eviter de polluer le bundle webpack des composants client. Voir package.json exports.

// Types
export type {
  PennylaneQuote,
  PennylaneCustomerInvoice,
  PennylaneBillingSubscription,
  PennylaneLineItem,
  PennylaneCustomer,
  Quote,
  Invoice,
  BillingSubscription,
  LineItem,
  BillingSummary,
  CreatePennylaneCustomerInput,
  ListQuotesFilters,
  ListInvoicesFilters,
  ListSubscriptionsFilters,
  CreateQuoteOptions,
  ClientWithPennylane,
  BillingSyncRow,
  QuoteType,
  QuoteMetadataRow,
} from './types/billing.types'

export { QUOTE_TYPE_LABELS } from './types/billing.types'
