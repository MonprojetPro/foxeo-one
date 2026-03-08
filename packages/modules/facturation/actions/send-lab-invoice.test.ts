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

import { assertOperator } from './assert-operator'
import { pennylaneClient } from '../config/pennylane'
import { triggerBillingSync } from './trigger-billing-sync'
import { sendLabInvoice } from './send-lab-invoice'

const mockAssertOperator = vi.mocked(assertOperator)
const mockPennylane = vi.mocked(pennylaneClient)
const mockTriggerBillingSync = vi.mocked(triggerBillingSync)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUpsertChain() {
  return { error: null }
}

function makeSupabaseMock(opts: {
  clientData?: Record<string, unknown> | null
  clientError?: { message: string } | null
} = {}) {
  const {
    clientData = { id: 'client-1', name: 'ACME', auth_user_id: 'auth-1', pennylane_customer_id: 'pl-cust-1', lab_paid: false },
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

const mockInvoiceResponse = {
  customer_invoice: {
    id: 'pl-inv-lab-1',
    invoice_number: 'FAC-LAB-001',
  },
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
      clientData: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-1', pennylane_customer_id: 'pl-cust-1', lab_paid: true },
    })
    mockAssertOperator.mockResolvedValue({ supabase: supabase as never, userId: 'op-1', error: null })

    const result = await sendLabInvoice('client-1')
    expect(result.error?.code).toBe('LAB_ALREADY_PAID')
  })

  it('returns NO_PENNYLANE_ID when client has no pennylane_customer_id', async () => {
    const supabase = makeSupabaseMock({
      clientData: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-1', pennylane_customer_id: null, lab_paid: false },
    })
    mockAssertOperator.mockResolvedValue({ supabase: supabase as never, userId: 'op-1', error: null })

    const result = await sendLabInvoice('client-1')
    expect(result.error?.code).toBe('NO_PENNYLANE_ID')
  })

  it('creates a customer invoice with correct Pennylane payload', async () => {
    const supabase = makeSupabaseMock()
    mockAssertOperator.mockResolvedValue({ supabase: supabase as never, userId: 'op-1', error: null })
    mockPennylane.post.mockResolvedValue({ data: mockInvoiceResponse, error: null })

    const result = await sendLabInvoice('client-1')

    expect(result.error).toBeNull()
    expect(result.data).toBe('pl-inv-lab-1')
    expect(mockPennylane.post).toHaveBeenCalledWith(
      '/customer_invoices',
      expect.objectContaining({
        customer_invoice: expect.objectContaining({
          customer_id: 'pl-cust-1',
          line_items: expect.arrayContaining([
            expect.objectContaining({
              label: 'Forfait Lab Foxeo',
              quantity: 1,
              currency_amount: 199,
              vat_rate: 'FR_200',
              unit: 'piece',
            }),
          ]),
          pdf_invoice_free_text: '[FOXEO_LAB]',
        }),
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
                data: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-1', pennylane_customer_id: 'pl-cust-1', lab_paid: false },
                error: null,
              }),
            }),
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
