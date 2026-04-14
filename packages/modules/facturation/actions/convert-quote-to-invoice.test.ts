import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('../config/pennylane', () => ({
  pennylaneClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { pennylaneClient } from '../config/pennylane'
import { convertQuoteToInvoice } from './convert-quote-to-invoice'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockPennylane = vi.mocked(pennylaneClient)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInsertChain() {
  return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }
}

function makeSupabaseMock(isOperator = true) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator-1' } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isOperator }),
    from: vi.fn(() => ({ insert: vi.fn().mockReturnValue(makeInsertChain()) })),
  }
}

const mockPennylaneQuote = {
  id: 'pl-quote-1',
  customer_id: 'pl-cust-1',
  quote_number: 'DEV-001',
  status: 'accepted',
  date: '2026-03-07',
  deadline: '2026-04-06',
  line_items: [
    { label: 'Conseil', description: null, quantity: 1, unit: 'h', vat_rate: 'FR_200', currency_amount: 500, plan_item_number: null },
  ],
  currency: 'EUR',
  amount: 600,
  currency_amount_before_tax: 500,
  currency_tax: 100,
  pdf_invoice_free_text: null,
  created_at: '2026-03-07T00:00:00Z',
  updated_at: '2026-03-07T00:00:00Z',
}

const mockPennylaneInvoice = {
  id: 'pl-inv-1',
  customer_id: 'pl-cust-1',
  invoice_number: 'FA-001',
  status: 'pending',
  date: '2026-03-07',
  deadline: '2026-04-06',
  line_items: mockPennylaneQuote.line_items,
  currency: 'EUR',
  amount: 600,
  currency_amount_before_tax: 500,
  currency_tax: 100,
  remaining_amount: 600,
  pdf_invoice_free_text: null,
  file_url: null,
  created_at: '2026-03-07T00:00:00Z',
  updated_at: '2026-03-07T00:00:00Z',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('convertQuoteToInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    const supabase = makeSupabaseMock()
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

    const result = await convertQuoteToInvoice('pl-quote-1', 'client-1')
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when user is not an operator', async () => {
    const supabase = makeSupabaseMock(false)
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

    const result = await convertQuoteToInvoice('pl-quote-1', 'client-1')
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('converts quote to invoice successfully via GET quote + POST invoice', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.get.mockResolvedValue({ data: { quote: mockPennylaneQuote }, error: null })
    mockPennylane.post.mockResolvedValue({ data: { customer_invoice: mockPennylaneInvoice }, error: null })

    const result = await convertQuoteToInvoice('pl-quote-1', 'client-1')

    expect(result.error).toBeNull()
    expect(result.data?.id).toBe('pl-inv-1')
    expect(mockPennylane.get).toHaveBeenCalledWith('/quotes/pl-quote-1')
    expect(mockPennylane.post).toHaveBeenCalledWith('/customer_invoices', expect.objectContaining({
      customer_invoice: expect.objectContaining({
        customer_id: 'pl-cust-1',
      }),
    }))
  })

  it('returns error when Pennylane conversion POST fails', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.get.mockResolvedValue({ data: { quote: mockPennylaneQuote }, error: null })
    mockPennylane.post.mockResolvedValue({ data: null, error: { message: 'API error', code: 'PENNYLANE_422' } })

    const result = await convertQuoteToInvoice('pl-quote-1', 'client-1')
    expect(result.error?.code).toBe('PENNYLANE_422')
  })
})
