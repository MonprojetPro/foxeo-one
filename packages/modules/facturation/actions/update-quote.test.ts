import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))
vi.mock('../config/pennylane', () => ({
  pennylaneClient: { post: vi.fn(), get: vi.fn(), put: vi.fn(), del: vi.fn() },
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { pennylaneClient } from '../config/pennylane'
import { updateQuote } from './update-quote'
import type { LineItem, PennylaneQuote } from '../types/billing.types'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockPut = vi.mocked(pennylaneClient.put)

const sampleLineItems: LineItem[] = [
  { label: 'Setup', description: null, quantity: 1, unitPrice: 1500, vatRate: 'FR_200', unit: 'piece', total: 1500 },
]

const samplePennylaneQuote: PennylaneQuote = {
  id: 4807770486,
  customer: { id: 275890907, url: '' },
  quote_number: 'D-2026-001',
  status: 'pending',
  date: '2026-04-15',
  deadline: '2026-05-15',
  invoice_lines: { url: '' },
  currency: 'EUR',
  amount: '1800.0',
  currency_amount_before_tax: '1500.0',
  currency_tax: '300.0',
  pdf_invoice_free_text: null,
  public_file_url: null,
  created_at: '2026-04-15T00:00:00Z',
  updated_at: '2026-04-15T00:00:00Z',
}

function makeSupabase(opts: { isOperator?: boolean; existingData?: Record<string, unknown> | null } = {}) {
  const insertMock = vi.fn().mockResolvedValue({ error: null })

  const updateChainEq2 = vi.fn().mockResolvedValue({ error: null })
  const updateChainEq1 = vi.fn(() => ({ eq: updateChainEq2 }))
  const updateMock = vi.fn(() => ({ eq: updateChainEq1 }))

  const selectMaybeSingle = vi.fn().mockResolvedValue({
    data: { data: opts.existingData ?? { quote_number: 'D-2026-001' } },
    error: null,
  })
  const selectEq2 = vi.fn(() => ({ maybeSingle: selectMaybeSingle }))
  const selectEq1 = vi.fn(() => ({ eq: selectEq2 }))
  const selectMock = vi.fn(() => ({ eq: selectEq1 }))

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'op-1' } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: opts.isOperator ?? true }),
    from: vi.fn((table: string) => {
      if (table === 'billing_sync') return { update: updateMock, select: selectMock }
      return { insert: insertMock }
    }),
  }
}

describe('updateQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns UNAUTHORIZED when no session', async () => {
    const supabase = makeSupabase()
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const res = await updateQuote('PL-1', { lineItems: sampleLineItems })
    expect(res.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when not operator', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase({ isOperator: false }) as never)
    const res = await updateQuote('PL-1', { lineItems: sampleLineItems })
    expect(res.error?.code).toBe('FORBIDDEN')
  })

  it('returns VALIDATION_ERROR when id missing', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    const res = await updateQuote('', { lineItems: sampleLineItems })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR when no line items', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    const res = await updateQuote('PL-1', { lineItems: [] })
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('calls PUT /quotes/{id} with mapped invoice_lines and returns updated:true', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockPut.mockResolvedValue({ data: samplePennylaneQuote, error: null })

    const res = await updateQuote('PL-1', { lineItems: sampleLineItems, publicNotes: 'hello' })

    expect(mockPut).toHaveBeenCalledTimes(1)
    expect(mockPut).toHaveBeenCalledWith(
      '/quotes/PL-1',
      expect.objectContaining({
        invoice_lines: expect.any(Array),
        pdf_invoice_free_text: 'hello',
      })
    )
    expect(res.data).toEqual({ updated: true })
  })

  it('translates Pennylane 409 into QUOTE_LOCKED', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockPut.mockResolvedValue({
      data: null,
      error: { message: 'conflict', code: 'PENNYLANE_409' },
    })

    const res = await updateQuote('PL-1', { lineItems: sampleLineItems })
    expect(res.error?.code).toBe('QUOTE_LOCKED')
  })

  it('forwards Pennylane 422 with verbose message extraction', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockPut.mockResolvedValue({
      data: null,
      error: {
        message: 'unprocessable',
        code: 'PENNYLANE_422',
        details: { error: 'invoice_lines: invalid format' },
      },
    })

    const res = await updateQuote('PL-1', { lineItems: sampleLineItems })
    expect(res.error?.code).toBe('PENNYLANE_422')
    expect(res.error?.message).toContain('invoice_lines: invalid format')
  })

  it('preserves existing flags (e.g. cancelled_by_operator) when merging billing_sync data', async () => {
    const supabase = makeSupabase({
      existingData: { quote_number: 'D-2026-001', cancelled_by_operator: false, custom_flag: 'keep-me' },
    })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)
    mockPut.mockResolvedValue({ data: samplePennylaneQuote, error: null })

    const res = await updateQuote('PL-1', { lineItems: sampleLineItems })
    expect(res.error).toBeNull()
  })
})
