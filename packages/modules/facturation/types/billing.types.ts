// ============================================================
// Types Pennylane (snake_case — miroir API v2)
// ============================================================

export type PennylaneLineItem = {
  label: string
  description: string | null
  quantity: number
  unit: string
  vat_rate: string // ex: 'FR_200' pour 20%
  // V2 API : prix unitaire HT en string (ex: "500.00"), remplace currency_amount
  raw_currency_unit_price: string
}

export type PennylaneQuote = {
  // V2 API : id est un number, amount/currency_amount_before_tax/currency_tax sont des strings
  id: number
  customer: { id: number; url: string }
  quote_number: string
  status: 'draft' | 'pending' | 'accepted' | 'denied'
  date: string
  deadline: string
  // V2 : invoice_lines est une URL (lazy), pas un tableau embarqué
  invoice_lines: { url: string }
  currency: string
  amount: string
  currency_amount_before_tax: string
  currency_tax: string
  pdf_invoice_free_text: string | null
  public_file_url: string | null
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
// Types MonprojetPro internes (camelCase — convention projet)
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
  // V2 API : billing_address obligatoire pour company_customers
  billingAddress?: {
    address?: string
    postalCode?: string
    city?: string
    countryAlpha2?: string
  }
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

// ============================================================
// Types Story 13.4 — Typologie de devis (tunnel paiement)
// ============================================================

export type QuoteType =
  | 'lab_onboarding'
  | 'one_direct_deposit'
  | 'one_direct_final'
  | 'ponctuel_deposit'
  | 'ponctuel_final'

export const QUOTE_TYPE_LABELS: Record<QuoteType, string> = {
  lab_onboarding: 'Lab — 199€ 100% upfront',
  one_direct_deposit: 'One direct — acompte 30%',
  one_direct_final: 'One direct — solde 70%',
  ponctuel_deposit: 'Ponctuel — acompte 30%',
  ponctuel_final: 'Ponctuel — solde 70%',
}

export type QuoteMetadataRow = {
  pennylane_quote_id: string
  pennylane_invoice_id: string | null
  client_id: string
  quote_type: QuoteType
  total_amount_ht: number | null
  signed_at: string | null
  paid_at: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

export type CreateQuoteOptions = {
  sendNow?: boolean
  publicNotes?: string | null
  privateNotes?: string | null
  /** Story 11.6 — Si true et client.lab_paid=true, ajoute automatiquement la déduction 199€ */
  labDeduction?: boolean
  /** Story 13.4 — Typologie du devis (utilise par le webhook paiement) */
  quoteType?: QuoteType
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

// ============================================================
// Types Story 13-8 — Relances impayées
// ============================================================

export type ReminderLevel = 1 | 2 | 3
export type ReminderStatus = 'pending' | 'sent' | 'cancelled'
export type ReminderChannel = 'email' | 'chat' | 'both'

export type CollectionReminder = {
  id: string
  client_id: string
  invoice_id: string
  invoice_number: string
  invoice_amount: number
  invoice_date: string
  reminder_level: ReminderLevel
  status: ReminderStatus
  generated_body: string | null
  sent_at: string | null
  channel: ReminderChannel | null
  created_at: string
  updated_at: string
}

export type CollectionReminderWithClient = CollectionReminder & {
  client_email: string
  client_name: string
  has_communication_profile: boolean
}
