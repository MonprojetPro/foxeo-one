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
const mockPost = vi.mocked(pennylaneClient.post)
const mockPut = vi.mocked(pennylaneClient.put)

const sampleLineItems: LineItem[] = [
  { label: 'Setup', description: null, quantity: 1, unitPrice: 1500, vatRate: 'FR_200', unit: 'piece', total: 1500 },
]

const newPennylaneQuote: PennylaneQuote = {
  id: 999999,
  customer: { id: 275890907, url: '' },
  quote_number: 'D-2026-999',
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

interface MockOpts {
  isOperator?: boolean
  metadata?: { client_id: string; quote_type: string; sent_at: string | null } | null
  metadataError?: { message: string } | null
  pennylaneCustomerId?: string | null
}

function makeSupabase(opts: MockOpts = {}) {
  const insertMock = vi.fn().mockResolvedValue({ error: null })

  // quote_metadata SELECT
  const metadataSingle = vi.fn().mockResolvedValue({
    data: opts.metadata === undefined
      ? { client_id: 'client-uuid-1', quote_type: 'one_direct_deposit', sent_at: null }
      : opts.metadata,
    error: opts.metadataError ?? null,
  })
  const metadataEq = vi.fn(() => ({ maybeSingle: metadataSingle }))
  const metadataSelect = vi.fn(() => ({ eq: metadataEq }))

  // quote_metadata INSERT/UPDATE/DELETE
  const metadataUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const metadataUpdate = vi.fn(() => ({ eq: metadataUpdateEq }))
  const metadataDeleteEq = vi.fn().mockResolvedValue({ error: null })
  const metadataDelete = vi.fn(() => ({ eq: metadataDeleteEq }))

  // clients SELECT
  const clientsSingle = vi.fn().mockResolvedValue({
    data: { pennylane_customer_id: opts.pennylaneCustomerId ?? '275890907' },
    error: null,
  })
  const clientsEq = vi.fn(() => ({ single: clientsSingle }))
  const clientsSelect = vi.fn(() => ({ eq: clientsEq }))

  // billing_sync SELECT (pour merger old data)
  const billingSelectMaybeSingle = vi.fn().mockResolvedValue({
    data: { data: { quote_number: 'D-2026-001' } },
    error: null,
  })
  const billingSelectEq2 = vi.fn(() => ({ maybeSingle: billingSelectMaybeSingle }))
  const billingSelectEq1 = vi.fn(() => ({ eq: billingSelectEq2 }))
  const billingSelect = vi.fn(() => ({ eq: billingSelectEq1 }))

  // billing_sync UPDATE
  const billingUpdateEq2 = vi.fn().mockResolvedValue({ error: null })
  const billingUpdateEq1 = vi.fn(() => ({ eq: billingUpdateEq2 }))
  const billingUpdate = vi.fn(() => ({ eq: billingUpdateEq1 }))

  // billing_sync UPSERT (nouveau devis)
  const billingUpsert = vi.fn().mockResolvedValue({ error: null })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'op-1' } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: opts.isOperator ?? true }),
    from: vi.fn((table: string) => {
      if (table === 'quote_metadata') {
        return {
          select: metadataSelect,
          update: metadataUpdate,
          delete: metadataDelete,
          insert: insertMock,
        }
      }
      if (table === 'clients') return { select: clientsSelect }
      if (table === 'billing_sync') {
        return { select: billingSelect, update: billingUpdate, upsert: billingUpsert }
      }
      return { insert: insertMock, update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }
    }),
  }
}

describe('updateQuote (cancel + recreate workflow)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
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

  it('returns METADATA_NOT_FOUND when quote_metadata row absent', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase({ metadata: null }) as never)
    const res = await updateQuote('PL-1', { lineItems: sampleLineItems })
    expect(res.error?.code).toBe('METADATA_NOT_FOUND')
  })

  it('cancels old quote and creates new one (unsent quote, no resend)', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockPut.mockResolvedValue({ data: null, error: null }) // cancel OK
    mockPost.mockResolvedValue({ data: newPennylaneQuote, error: null }) // create OK

    const res = await updateQuote('PL-OLD', { lineItems: sampleLineItems })

    expect(mockPut).toHaveBeenCalledWith('/quotes/PL-OLD/update_status', { status: 'denied' })
    expect(mockPost).toHaveBeenCalledTimes(1) // create only, no resend
    expect(mockPost).toHaveBeenCalledWith('/quotes', expect.objectContaining({
      customer_id: 275890907,
      invoice_lines: expect.any(Array),
    }))
    expect(res.data).toMatchObject({
      oldPennylaneQuoteId: 'PL-OLD',
      newPennylaneQuoteId: '999999',
      newQuoteNumber: 'D-2026-999',
      wasOriginallySent: false,
      resent: false,
    })
  })

  it('also calls send_by_email when wasOriginallySent && autoResend=true', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        metadata: { client_id: 'client-uuid-1', quote_type: 'one_direct_deposit', sent_at: '2026-04-15T10:00:00Z' },
      }) as never
    )
    mockPut.mockResolvedValue({ data: null, error: null })
    mockPost
      .mockResolvedValueOnce({ data: newPennylaneQuote, error: null }) // create
      .mockResolvedValueOnce({ data: null, error: null }) // send_by_email

    const res = await updateQuote('PL-OLD', { lineItems: sampleLineItems, autoResend: true })

    expect(mockPost).toHaveBeenCalledTimes(2)
    expect(mockPost).toHaveBeenLastCalledWith('/quotes/999999/send_by_email', {})
    expect(res.data?.wasOriginallySent).toBe(true)
    expect(res.data?.resent).toBe(true)
  })

  it('does NOT call send_by_email when autoResend=false even if originally sent', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(
      makeSupabase({
        metadata: { client_id: 'client-uuid-1', quote_type: 'one_direct_deposit', sent_at: '2026-04-15T10:00:00Z' },
      }) as never
    )
    mockPut.mockResolvedValue({ data: null, error: null })
    mockPost.mockResolvedValue({ data: newPennylaneQuote, error: null })

    const res = await updateQuote('PL-OLD', { lineItems: sampleLineItems, autoResend: false })

    expect(mockPost).toHaveBeenCalledTimes(1)
    expect(res.data?.wasOriginallySent).toBe(true)
    expect(res.data?.resent).toBe(false)
  })

  it('returns error when cancel old quote fails', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockPut.mockResolvedValue({
      data: null,
      error: { message: 'forbidden', code: 'PENNYLANE_403' },
    })

    const res = await updateQuote('PL-OLD', { lineItems: sampleLineItems })
    expect(res.data).toBeNull()
    expect(res.error?.message).toContain('Impossible d annuler')
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('returns error when create new quote fails', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockPut.mockResolvedValue({ data: null, error: null })
    mockPost.mockResolvedValue({
      data: null,
      error: { message: 'bad request', code: 'PENNYLANE_400' },
    })

    const res = await updateQuote('PL-OLD', { lineItems: sampleLineItems })
    expect(res.data).toBeNull()
    expect(res.error?.code).toBe('PENNYLANE_400')
  })
})
