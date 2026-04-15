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
export { verifyPennylaneHmac } from './utils/verify-pennylane-hmac'
export {
  generateSecureTemporaryPassword,
  TEMP_PASSWORD_LENGTH,
} from './utils/generate-temp-password'
export { createClientAuthUser } from './utils/create-client-auth-user'
export type {
  CreateClientAuthUserResult,
  CreateClientAuthUserOptions,
} from './utils/create-client-auth-user'
export { matchQuoteFromInvoice } from './actions/match-quote-from-invoice'
export type { MatchQuoteInput } from './actions/match-quote-from-invoice'
export {
  dispatchPaidQuote,
  handleLabOnboardingPaid,
  handleOneDepositPaid,
  handleFinalPaymentPaid,
} from './actions/pennylane-paid-handlers'
export type { HandlerDeps, HandlerResult } from './actions/pennylane-paid-handlers'

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
