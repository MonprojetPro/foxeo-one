// ============================================================
// Types Pennylane (snake_case — miroir API v2)
// ============================================================

export type PennylaneLineItem = {
  label: string
  description: string | null
  quantity: number
  unit: string
  vat_rate: string // ex: 'FR_200' pour 20%
  currency_amount: number // prix unitaire HT
  plan_item_number: string | null
}

export type PennylaneQuote = {
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

export type PennylaneCustomerInvoice = {
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

export type PennylaneBillingSubscription = {
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

export type PennylaneCustomer = {
  id: string
  name: string
  emails: string[]
  billing_address: {
    address: string | null
    postal_code: string | null
    city: string | null
    country_alpha2: string | null
  } | null
  created_at: string
  updated_at: string
}

// ============================================================
// Types Foxeo internes (camelCase — convention projet)
// ============================================================

export type LineItem = {
  label: string
  description: string | null
  quantity: number
  unit: string
  unitPrice: number
  vatRate: string
  total: number
}

export type Quote = {
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

export type Invoice = {
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

export type BillingSubscription = {
  id: string
  clientId: string
  status: 'active' | 'stopped' | 'finished'
  plan: 'essentiel' | 'agentique' | 'ponctuel'
  frequency: 'monthly' | 'quarterly' | 'yearly'
  amount: number
  startDate: string
  extras: string[]
}

export type BillingSummary = {
  mrr: number
  arr: number
  activeSubscriptions: number
  pendingInvoices: number
  unpaidInvoices: number
  totalRevenue: number
}

// ============================================================
// Types de requête pour les proxy actions
// ============================================================

export type CreatePennylaneCustomerInput = {
  clientId: string
  companyName: string
  email: string
}

export type ListQuotesFilters = {
  pennylaneCustomerId?: string
  status?: PennylaneQuote['status']
}

export type ListInvoicesFilters = {
  pennylaneCustomerId?: string
  status?: PennylaneCustomerInvoice['status']
}

export type ListSubscriptionsFilters = {
  pennylaneCustomerId?: string
  status?: PennylaneBillingSubscription['status']
}

// ============================================================
// Types Story 11.3 — Création de devis
// ============================================================

export type CreateQuoteOptions = {
  sendNow?: boolean
  publicNotes?: string | null
  privateNotes?: string | null
  /** Story 11.6 — Si true et client.lab_paid=true, ajoute automatiquement la déduction 199€ */
  labDeduction?: boolean
}

export type ClientWithPennylane = {
  id: string
  name: string
  company: string | null
  email: string
  pennylaneCustomerId: string
  /** Story 11.6 — Statut paiement forfait Lab */
  labPaid?: boolean
  labPaidAt?: string | null
}

export type BillingSyncRow = {
  id: string
  entity_type: 'quote' | 'invoice' | 'subscription' | 'customer'
  pennylane_id: string
  client_id: string | null
  status: string
  amount: number | null
  data: Record<string, unknown>
  last_synced_at: string
  created_at: string
  updated_at: string
}
