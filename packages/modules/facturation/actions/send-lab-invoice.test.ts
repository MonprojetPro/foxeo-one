import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./assert-operator', () => ({
  assertOperator: vi.fn(),
}))

vi.mock('../utils/billing-sync-logic', () => ({
  LAB_INVOICE_TAG: '[FOXEO_LAB]',
}))

vi.mock('../config/pennylane', () => ({
  pennylaneClient: {
    post: vi.fn(),
  },
}))

vi.mock('./trigger-billing-sync', () => ({
  triggerBillingSync: vi.fn().mockResolvedValue({ data: { synced: 1 }, error: null }),
}))

vi.mock('./billing-proxy', () => ({
  createPennylaneCustomer: vi.fn(),
}))

// T-039 — la resolution des destinataires (carnet de contacts) a sa propre suite
// de tests : ici on la neutralise pour que ces tests restent sur leur sujet,
// l'emission. Les tests qui verifient le carnet surchargent ce mock.
vi.mock('./resolve-billing-recipients', () => ({
  resolveBillingRecipients: vi.fn(async () => ({
    data: { emails: ['client@exemple.fr'], attentionNames: [], usedFallback: true, pennylaneSynced: false },
    error: null,
  })),
}))


import { assertOperator } from './assert-operator'
import { pennylaneClient } from '../config/pennylane'
import { triggerBillingSync } from './trigger-billing-sync'
import { createPennylaneCustomer } from './billing-proxy'
import { sendLabInvoice } from './send-lab-invoice'

import { resolveBillingRecipients } from './resolve-billing-recipients'

const mockAssertOperator = vi.mocked(assertOperator)
const mockPennylane = vi.mocked(pennylaneClient)
const mockTriggerBillingSync = vi.mocked(triggerBillingSync)
const mockCreatePennylaneCustomer = vi.mocked(createPennylaneCustomer)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUpsertChain() {
  return { error: null }
}

function makeSupabaseMock(opts: {
  clientData?: Record<string, unknown> | null
  clientError?: { message: string } | null
} = {}) {
  const {
    clientData = { id: 'client-1', name: 'ACME', company: 'ACME Corp', email: 'acme@example.com', auth_user_id: 'auth-1', pennylane_customer_id: '275890907', lab_paid: false },
    clientError = null,
  } = opts

  return {
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: clientData, error: clientError }),
            }),
          }),
          // V2 : send-lab-invoice met à jour lab_invoice_sent_at après la création
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      // billing_sync or activity_logs
      const chainMock = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        upsert: vi.fn().mockResolvedValue(makeUpsertChain()),
        select: vi.fn().mockReturnThis(),
      }
      return chainMock
    }),
  }
}

// V2 : réponse directe (pas de wrapper { customer_invoice: ... }), id est un number
const mockInvoiceResponse = {
  id: 4807770487,
  invoice_number: 'FAC-LAB-001',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('sendLabInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTriggerBillingSync.mockResolvedValue({ data: { synced: 1 }, error: null })
  })

  it('returns UNAUTHORIZED when assertOperator fails', async () => {
    mockAssertOperator.mockResolvedValue({
      supabase: null,
      userId: null,
      error: { message: 'Non authentifié', code: 'UNAUTHORIZED' },
    })

    const result = await sendLabInvoice('client-1')
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns CLIENT_NOT_FOUND when client does not exist', async () => {
    const supabase = makeSupabaseMock({ clientData: null, clientError: { message: 'Not found' } })
    mockAssertOperator.mockResolvedValue({ supabase: supabase as never, userId: 'op-1', error: null })

    const result = await sendLabInvoice('client-1')
    expect(result.error?.code).toBe('CLIENT_NOT_FOUND')
  })

  it('returns LAB_ALREADY_PAID when client.lab_paid is true', async () => {
    const supabase = makeSupabaseMock({
      clientData: { id: 'client-1', name: 'ACME', company: 'ACME Corp', email: 'acme@example.com', auth_user_id: 'auth-1', pennylane_customer_id: '275890907', lab_paid: true },
    })
    mockAssertOperator.mockResolvedValue({ supabase: supabase as never, userId: 'op-1', error: null })

    const result = await sendLabInvoice('client-1')
    expect(result.error?.code).toBe('LAB_ALREADY_PAID')
  })

  it('auto-creates Pennylane customer when absent and email exists', async () => {
    const supabase = makeSupabaseMock({
      clientData: { id: 'client-1', name: 'ACME', company: 'ACME Corp', email: 'acme@example.com', auth_user_id: 'auth-1', pennylane_customer_id: null, lab_paid: false },
    })
    mockAssertOperator.mockResolvedValue({ supabase: supabase as never, userId: 'op-1', error: null })
    mockCreatePennylaneCustomer.mockResolvedValue({ data: 'pl-new-cust', error: null })
    mockPennylane.post.mockResolvedValue({ data: mockInvoiceResponse, error: null })

    const result = await sendLabInvoice('client-1')
    // T-039 — le compte nait avec les destinataires du carnet (tableau).
    expect(mockCreatePennylaneCustomer).toHaveBeenCalledWith('client-1', 'ACME Corp', ['client@exemple.fr'])
    expect(result.error).toBeNull()
    expect(result.data).toBe('4807770487')
  })

  // T-039 — la mention « A l attention de » ne doit PAS faire disparaitre le
  // marqueur [FOXEO_LAB] : `isLabInvoice()` et l Edge Function billing-sync le
  // cherchent dans ce meme champ. Une facture Lab qui cesse d etre reconnue comme
  // telle casserait tout le suivi du forfait.
  it('garde le marqueur Lab quand un nom est imprime sur la facture', async () => {
    const supabase = makeSupabaseMock({
      clientData: { id: 'client-1', name: 'ACME', company: 'ACME Corp', email: 'acme@example.com', auth_user_id: 'auth-1', pennylane_customer_id: '275890907', lab_paid: false },
    })
    mockAssertOperator.mockResolvedValue({ supabase: supabase as never, userId: 'op-1', error: null })
    mockPennylane.post.mockResolvedValue({ data: mockInvoiceResponse, error: null })
    vi.mocked(resolveBillingRecipients).mockResolvedValue({
      data: { emails: ['compta@habitat77.fr'], attentionNames: ['Marie Dupont'], usedFallback: false, pennylaneSynced: true },
      error: null,
    })

    await sendLabInvoice('client-1')

    const [, body] = mockPennylane.post.mock.calls[0] as [string, Record<string, unknown>]
    expect(body.pdf_invoice_free_text).toContain('[FOXEO_LAB]')
    expect(body.pdf_invoice_free_text).toContain("À l'attention de Marie Dupont")
  })

  it('returns MISSING_EMAIL when client has no pennylane_customer_id and no email', async () => {
    const supabase = makeSupabaseMock({
      clientData: { id: 'client-1', name: 'ACME', company: null, email: null, auth_user_id: 'auth-1', pennylane_customer_id: null, lab_paid: false },
    })
    mockAssertOperator.mockResolvedValue({ supabase: supabase as never, userId: 'op-1', error: null })
    // T-039 — carnet vide ET pas d'adresse client : seul cas ou l'emission refuse.
    vi.mocked(resolveBillingRecipients).mockResolvedValue({
      data: { emails: [], attentionNames: [], usedFallback: true, pennylaneSynced: false },
      error: null,
    })

    const result = await sendLabInvoice('client-1')
    expect(result.error?.code).toBe('MISSING_EMAIL')
    expect(mockCreatePennylaneCustomer).not.toHaveBeenCalled()
  })

  it('creates a customer invoice with correct Pennylane payload', async () => {
    const supabase = makeSupabaseMock()
    mockAssertOperator.mockResolvedValue({ supabase: supabase as never, userId: 'op-1', error: null })
    mockPennylane.post.mockResolvedValue({ data: mockInvoiceResponse, error: null })

    const result = await sendLabInvoice('client-1')

    expect(result.error).toBeNull()
    // String(4807770487)
    expect(result.data).toBe('4807770487')
    // V2 : line_items (pas invoice_lines), customer_id = integer
    expect(mockPennylane.post).toHaveBeenCalledWith(
      '/customer_invoices',
      expect.objectContaining({
        customer_id: 275890907,
        invoice_lines: expect.arrayContaining([
          expect.objectContaining({
            label: 'Forfait Lab MonprojetPro',
            quantity: 1,
            raw_currency_unit_price: '199.00',
            vat_rate: 'FR_200',
            unit: 'service',
          }),
        ]),
        pdf_invoice_free_text: '[FOXEO_LAB]',
      })
    )
  })

  it('logs activity_log with lab_invoice_sent action after success', async () => {
    const supabase = makeSupabaseMock()
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    supabase.from = vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'client-1', name: 'ACME', company: 'ACME Corp', email: 'acme@example.com', auth_user_id: 'auth-1', pennylane_customer_id: '275890907', lab_paid: false },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      const chainMock = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: insertMock,
        upsert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
      }
      return chainMock
    })
    mockAssertOperator.mockResolvedValue({ supabase: supabase as never, userId: 'op-1', error: null })
    mockPennylane.post.mockResolvedValue({ data: mockInvoiceResponse, error: null })

    await sendLabInvoice('client-1')

    const activityCall = insertMock.mock.calls.find((call) => {
      const arg = call[0]
      return arg?.action === 'lab_invoice_sent'
    })
    expect(activityCall).toBeDefined()
  })
})
