// Facturation Module — Gestion devis, factures, abonnements via Pennylane
export { manifest } from './manifest'

// Components (Story 11.3)
export { BillingDashboard } from './components/billing-dashboard'
export { QuoteForm } from './components/quote-form'
export { QuotesList } from './components/quotes-list'

// Hooks
export { useBillingQuotes, useBillingInvoices, useBillingSubscriptions, useBillingSummary, useBillingSyncRows, billingKeys } from './hooks/use-billing'

// Actions
export { createPennylaneCustomer, getPennylaneCustomer, listQuotes, listInvoices, listSubscriptions } from './actions/billing-proxy'
export { createAndSendQuote } from './actions/create-quote'
export { convertQuoteToInvoice } from './actions/convert-quote-to-invoice'
export { getClientsWithPennylane } from './actions/get-clients'

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
} from './types/billing.types'
