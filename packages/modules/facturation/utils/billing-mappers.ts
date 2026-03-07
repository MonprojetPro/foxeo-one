import type {
  PennylaneQuote,
  PennylaneCustomerInvoice,
  PennylaneBillingSubscription,
  PennylaneLineItem,
  Quote,
  Invoice,
  BillingSubscription,
  LineItem,
} from '../types/billing.types'

// ============================================================
// LineItem mappers
// ============================================================

export function fromPennylaneLineItem(item: PennylaneLineItem): LineItem {
  return {
    label: item.label,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.currency_amount,
    vatRate: item.vat_rate,
    total: item.quantity * item.currency_amount,
  }
}

export function toPennylaneLineItem(item: LineItem): PennylaneLineItem {
  return {
    label: item.label,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    vat_rate: item.vatRate,
    currency_amount: item.unitPrice,
    plan_item_number: null,
  }
}

// ============================================================
// Quote mappers
// ============================================================

export function fromPennylaneQuote(quote: PennylaneQuote): Quote {
  return {
    id: quote.id,
    clientId: quote.customer_id,
    number: quote.quote_number,
    status: quote.status,
    lineItems: quote.line_items.map(fromPennylaneLineItem),
    totalHt: quote.currency_amount_before_tax,
    totalTtc: quote.amount,
    tax: quote.currency_tax,
    validUntil: quote.deadline,
    createdAt: quote.created_at,
  }
}

export function toPennylaneQuote(
  quote: Pick<Quote, 'clientId' | 'lineItems' | 'validUntil'> & {
    freeText?: string | null
  }
): Partial<PennylaneQuote> {
  return {
    customer_id: quote.clientId,
    deadline: quote.validUntil,
    line_items: quote.lineItems.map(toPennylaneLineItem),
    pdf_invoice_free_text: quote.freeText ?? null,
  }
}

// ============================================================
// Invoice mappers
// ============================================================

export function fromPennylaneInvoice(invoice: PennylaneCustomerInvoice): Invoice {
  const amountPaid = invoice.amount - invoice.remaining_amount
  return {
    id: invoice.id,
    clientId: invoice.customer_id,
    number: invoice.invoice_number,
    status: invoice.status,
    lineItems: invoice.line_items.map(fromPennylaneLineItem),
    totalHt: invoice.currency_amount_before_tax,
    totalTtc: invoice.amount,
    amountPaid,
    remainingAmount: invoice.remaining_amount,
    dueDate: invoice.deadline,
    pdfUrl: invoice.file_url,
    createdAt: invoice.created_at,
  }
}

export function toPennylaneInvoice(
  invoice: Pick<Invoice, 'clientId' | 'lineItems' | 'dueDate'> & {
    freeText?: string | null
  }
): Partial<PennylaneCustomerInvoice> {
  return {
    customer_id: invoice.clientId,
    deadline: invoice.dueDate,
    line_items: invoice.lineItems.map(toPennylaneLineItem),
    pdf_invoice_free_text: invoice.freeText ?? null,
  }
}

// ============================================================
// Subscription mapper
// ============================================================

export function fromPennylaneSubscription(
  sub: PennylaneBillingSubscription,
  plan: BillingSubscription['plan'] = 'essentiel'
): BillingSubscription {
  return {
    id: sub.id,
    clientId: sub.customer_id,
    status: sub.status,
    plan,
    frequency: sub.recurring_period,
    amount: sub.amount,
    startDate: sub.start_date,
    extras: [],
  }
}
