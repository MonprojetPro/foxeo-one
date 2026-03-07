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

const PENNYLANE_LINE_ITEM: PennylaneLineItem = {
  label: 'Accompagnement Foxeo One',
  description: 'Forfait mensuel',
  quantity: 1,
  unit: 'piece',
  vat_rate: 'FR_200',
  currency_amount: 400,
  plan_item_number: null,
}

const FOXEO_LINE_ITEM: LineItem = {
  label: 'Accompagnement Foxeo One',
  description: 'Forfait mensuel',
  quantity: 1,
  unit: 'piece',
  unitPrice: 400,
  vatRate: 'FR_200',
  total: 400,
}

const PENNYLANE_QUOTE: PennylaneQuote = {
  id: 'quote-123',
  customer_id: 'cust-456',
  quote_number: 'DEV-2026-001',
  status: 'pending',
  date: '2026-03-01',
  deadline: '2026-03-31',
  line_items: [PENNYLANE_LINE_ITEM],
  currency: 'EUR',
  amount: 480,
  currency_amount_before_tax: 400,
  currency_tax: 80,
  pdf_invoice_free_text: null,
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
      expect(result.label).toBe('Accompagnement Foxeo One')
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
      const item = { ...PENNYLANE_LINE_ITEM, quantity: 3, currency_amount: 100 }
      const result = fromPennylaneLineItem(item)
      expect(result.total).toBe(300)
    })
  })

  describe('toPennylaneLineItem', () => {
    it('maps camelCase fields to snake_case correctly', () => {
      const result = toPennylaneLineItem(FOXEO_LINE_ITEM)
      expect(result.currency_amount).toBe(400)
      expect(result.vat_rate).toBe('FR_200')
      expect(result.unit).toBe('piece')
      expect(result.plan_item_number).toBeNull()
    })
  })

  describe('fromPennylaneQuote', () => {
    it('maps all quote fields correctly', () => {
      const result = fromPennylaneQuote(PENNYLANE_QUOTE)
      expect(result.id).toBe('quote-123')
      expect(result.clientId).toBe('cust-456')
      expect(result.number).toBe('DEV-2026-001')
      expect(result.status).toBe('pending')
      expect(result.totalHt).toBe(400)
      expect(result.totalTtc).toBe(480)
      expect(result.tax).toBe(80)
      expect(result.validUntil).toBe('2026-03-31')
      expect(result.lineItems).toHaveLength(1)
    })

    it('maps line items via fromPennylaneLineItem', () => {
      const result = fromPennylaneQuote(PENNYLANE_QUOTE)
      expect(result.lineItems[0].unitPrice).toBe(400)
    })
  })

  describe('toPennylaneQuote', () => {
    it('maps Foxeo quote to Pennylane format', () => {
      const result = toPennylaneQuote({
        clientId: 'cust-456',
        lineItems: [FOXEO_LINE_ITEM],
        validUntil: '2026-03-31',
        freeText: 'Merci de votre confiance',
      })
      expect(result.customer_id).toBe('cust-456')
      expect(result.deadline).toBe('2026-03-31')
      expect(result.pdf_invoice_free_text).toBe('Merci de votre confiance')
      expect(result.line_items).toHaveLength(1)
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
    it('maps Foxeo invoice to Pennylane format', () => {
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
