import { describe, it, expect } from 'vitest'
import {
  fromPennylaneQuote,
  toPennylaneQuote,
  fromPennylaneInvoice,
  toPennylaneInvoice,
  fromPennylaneSubscription,
  fromPennylaneLineItem,
  toPennylaneLineItem,
} from './billing-mappers'
import type {
  PennylaneQuote,
  PennylaneCustomerInvoice,
  PennylaneBillingSubscription,
  PennylaneLineItem,
  LineItem,
} from '../types/billing.types'

// V2 API : raw_currency_unit_price est une string (ex: "400.00")
const PENNYLANE_LINE_ITEM: PennylaneLineItem = {
  label: 'Accompagnement MonprojetPro One',
  description: 'Forfait mensuel',
  quantity: 1,
  unit: 'piece',
  vat_rate: 'FR_200',
  raw_currency_unit_price: '400.00',
}

const FOXEO_LINE_ITEM: LineItem = {
  label: 'Accompagnement MonprojetPro One',
  description: 'Forfait mensuel',
  quantity: 1,
  unit: 'piece',
  unitPrice: 400,
  vatRate: 'FR_200',
  total: 400,
}

// V2 API : id number, customer: {id, url}, invoice_lines: {url}, amounts strings
const PENNYLANE_QUOTE: PennylaneQuote = {
  id: 4807770486,
  customer: { id: 275890907, url: 'https://app.pennylane.com/api/external/v2/customers/275890907' },
  quote_number: 'DEV-2026-001',
  status: 'pending',
  date: '2026-03-01',
  deadline: '2026-03-31',
  invoice_lines: { url: 'https://app.pennylane.com/api/external/v2/quotes/4807770486/invoice_lines' },
  currency: 'EUR',
  amount: '480.0',
  currency_amount_before_tax: '400.0',
  currency_tax: '80.0',
  pdf_invoice_free_text: null,
  public_file_url: null,
  created_at: '2026-03-01T10:00:00Z',
  updated_at: '2026-03-01T10:00:00Z',
}

const PENNYLANE_INVOICE: PennylaneCustomerInvoice = {
  id: 'inv-789',
  customer_id: 'cust-456',
  invoice_number: 'FA-2026-001',
  status: 'paid',
  date: '2026-03-01',
  deadline: '2026-03-15',
  line_items: [PENNYLANE_LINE_ITEM],
  currency: 'EUR',
  amount: 480,
  currency_amount_before_tax: 400,
  currency_tax: 80,
  remaining_amount: 0,
  pdf_invoice_free_text: null,
  file_url: 'https://app.pennylane.com/invoices/fa-2026-001.pdf',
  created_at: '2026-03-01T10:00:00Z',
  updated_at: '2026-03-15T10:00:00Z',
}

const PENNYLANE_SUBSCRIPTION: PennylaneBillingSubscription = {
  id: 'sub-999',
  customer_id: 'cust-456',
  status: 'active',
  start_date: '2026-03-01',
  recurring_period: 'monthly',
  line_items: [PENNYLANE_LINE_ITEM],
  amount: 480,
  created_at: '2026-03-01T10:00:00Z',
  updated_at: '2026-03-01T10:00:00Z',
}

describe('billing-mappers', () => {
  describe('fromPennylaneLineItem', () => {
    it('maps snake_case fields to camelCase correctly', () => {
      const result = fromPennylaneLineItem(PENNYLANE_LINE_ITEM)
      expect(result.label).toBe('Accompagnement MonprojetPro One')
      expect(result.unit).toBe('piece')
      expect(result.unitPrice).toBe(400)
      expect(result.vatRate).toBe('FR_200')
      expect(result.total).toBe(400)
    })

    it('preserves null description', () => {
      const item = { ...PENNYLANE_LINE_ITEM, description: null }
      const result = fromPennylaneLineItem(item)
      expect(result.description).toBeNull()
    })

    it('calculates total as quantity * unitPrice', () => {
      const item = { ...PENNYLANE_LINE_ITEM, quantity: 3, raw_currency_unit_price: '100.00' }
      const result = fromPennylaneLineItem(item)
      expect(result.total).toBe(300)
    })
  })

  describe('toPennylaneLineItem', () => {
    it('maps camelCase fields to snake_case correctly', () => {
      const result = toPennylaneLineItem(FOXEO_LINE_ITEM)
      // V2 : raw_currency_unit_price est une string (ex: "400.00")
      expect(result.raw_currency_unit_price).toBe('400.00')
      expect(result.vat_rate).toBe('FR_200')
      expect(result.unit).toBe('piece')
    })
  })

  describe('fromPennylaneQuote', () => {
    it('maps all quote fields correctly', () => {
      const result = fromPennylaneQuote(PENNYLANE_QUOTE)
      // V2 : String(id number), String(customer.id number), amounts parseFloat(string)
      expect(result.id).toBe('4807770486')
      expect(result.clientId).toBe('275890907')
      expect(result.number).toBe('DEV-2026-001')
      expect(result.status).toBe('pending')
      expect(result.totalHt).toBe(400)
      expect(result.totalTtc).toBe(480)
      expect(result.tax).toBe(80)
      expect(result.validUntil).toBe('2026-03-31')
    })

    it('returns empty lineItems (invoice_lines is a lazy URL in V2)', () => {
      const result = fromPennylaneQuote(PENNYLANE_QUOTE)
      // V2 : invoice_lines est une URL lazy, lineItems retourné vide
      expect(result.lineItems).toHaveLength(0)
    })
  })

  describe('toPennylaneQuote', () => {
    it('maps MonprojetPro quote to Pennylane format', () => {
      const result = toPennylaneQuote({
        clientId: 'cust-456',
        lineItems: [FOXEO_LINE_ITEM],
        validUntil: '2026-03-31',
        freeText: 'Merci de votre confiance',
      })
      // V2 : customer_id est un number (parseInt)
      expect(result.customer_id).toBe(parseInt('cust-456', 10))
      expect(result.deadline).toBe('2026-03-31')
      expect(result.pdf_invoice_free_text).toBe('Merci de votre confiance')
      // V2 : invoice_lines (pas line_items)
      expect(result.invoice_lines).toHaveLength(1)
      expect(result.date).toBeDefined() // date obligatoire V2
    })

    it('defaults freeText to null when not provided', () => {
      const result = toPennylaneQuote({
        clientId: 'cust-456',
        lineItems: [],
        validUntil: '2026-03-31',
      })
      expect(result.pdf_invoice_free_text).toBeNull()
    })
  })

  describe('fromPennylaneInvoice', () => {
    it('maps all invoice fields correctly', () => {
      const result = fromPennylaneInvoice(PENNYLANE_INVOICE)
      expect(result.id).toBe('inv-789')
      expect(result.clientId).toBe('cust-456')
      expect(result.number).toBe('FA-2026-001')
      expect(result.status).toBe('paid')
      expect(result.totalHt).toBe(400)
      expect(result.totalTtc).toBe(480)
      expect(result.remainingAmount).toBe(0)
      expect(result.amountPaid).toBe(480)
      expect(result.pdfUrl).toBe('https://app.pennylane.com/invoices/fa-2026-001.pdf')
    })

    it('computes amountPaid as totalTtc - remainingAmount', () => {
      const partiallyPaid = { ...PENNYLANE_INVOICE, remaining_amount: 200 }
      const result = fromPennylaneInvoice(partiallyPaid)
      expect(result.amountPaid).toBe(280)
      expect(result.remainingAmount).toBe(200)
    })

    it('handles null file_url', () => {
      const noFile = { ...PENNYLANE_INVOICE, file_url: null }
      const result = fromPennylaneInvoice(noFile)
      expect(result.pdfUrl).toBeNull()
    })
  })

  describe('toPennylaneInvoice', () => {
    it('maps MonprojetPro invoice to Pennylane format', () => {
      const result = toPennylaneInvoice({
        clientId: 'cust-456',
        lineItems: [FOXEO_LINE_ITEM],
        dueDate: '2026-03-15',
        freeText: null,
      })
      expect(result.customer_id).toBe('cust-456')
      expect(result.deadline).toBe('2026-03-15')
      expect(result.pdf_invoice_free_text).toBeNull()
    })
  })

  describe('fromPennylaneSubscription', () => {
    it('maps all subscription fields correctly', () => {
      const result = fromPennylaneSubscription(PENNYLANE_SUBSCRIPTION, 'essentiel')
      expect(result.id).toBe('sub-999')
      expect(result.clientId).toBe('cust-456')
      expect(result.status).toBe('active')
      expect(result.frequency).toBe('monthly')
      expect(result.amount).toBe(480)
      expect(result.plan).toBe('essentiel')
      expect(result.extras).toEqual([])
    })

    it('defaults plan to essentiel when not provided', () => {
      const result = fromPennylaneSubscription(PENNYLANE_SUBSCRIPTION)
      expect(result.plan).toBe('essentiel')
    })
  })
})
