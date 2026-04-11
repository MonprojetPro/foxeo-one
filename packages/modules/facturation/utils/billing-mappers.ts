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
  const unitPrice = parseFloat(item.raw_currency_unit_price)
  return {
    label: item.label,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice,
    vatRate: item.vat_rate,
    total: item.quantity * unitPrice,
  }
}

// V2 API : raw_currency_unit_price est une string, pas de plan_item_number
export function toPennylaneLineItem(item: LineItem): PennylaneLineItem {
  return {
    label: item.label,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    vat_rate: item.vatRate,
    raw_currency_unit_price: item.unitPrice.toFixed(2),
  }
}

// ============================================================
// Quote mappers
// ============================================================

export function fromPennylaneQuote(quote: PennylaneQuote): Quote {
  return {
    id: String(quote.id),
    clientId: String(quote.customer.id),
    number: quote.quote_number,
    status: quote.status,
    lineItems: [], // V2 : invoice_lines est une URL lazy — non embarquée dans la liste
    totalHt: parseFloat(quote.currency_amount_before_tax),
    totalTtc: parseFloat(quote.amount),
    tax: parseFloat(quote.currency_tax),
    validUntil: quote.deadline,
    createdAt: quote.created_at,
  }
}

// V2 API : pas de wrapper, invoice_lines au lieu de line_items, date obligatoire
export function toPennylaneQuote(
  quote: Pick<Quote, 'clientId' | 'lineItems' | 'validUntil'> & {
    freeText?: string | null
    date?: string
  }
): Record<string, unknown> {
  return {
    customer_id: parseInt(quote.clientId, 10),
    date: quote.date ?? new Date().toISOString().split('T')[0],
    deadline: quote.validUntil,
    invoice_lines: quote.lineItems.map(toPennylaneLineItem),
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
