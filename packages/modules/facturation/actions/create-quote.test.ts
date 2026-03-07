import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('../config/pennylane', () => ({
  pennylaneClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('./trigger-billing-sync', () => ({
  triggerBillingSync: vi.fn().mockResolvedValue({ data: { synced: 1 }, error: null }),
}))

import { createServerSupabaseClient } from '@foxeo/supabase'
import { pennylaneClient } from '../config/pennylane'
import { triggerBillingSync } from './trigger-billing-sync'
import { createAndSendQuote } from './create-quote'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockPennylane = vi.mocked(pennylaneClient)
const mockTriggerBillingSync = vi.mocked(triggerBillingSync)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEqChain(overrides: Record<string, unknown> = {}): unknown {
  const chain: Record<string, unknown> = {
    eq: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }
  return chain
}

function makeInsertChain(): unknown {
  return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }
}

function makeSupabaseMock(opts: {
  isOperator?: boolean
  clientData?: Record<string, unknown> | null
  clientError?: { message: string } | null
} = {}) {
  const { isOperator = true, clientData = { id: 'client-1', name: 'ACME', auth_user_id: 'auth-user-1', pennylane_customer_id: 'pl-cust-1' }, clientError = null } = opts

  const singleMock = vi.fn().mockResolvedValue({ data: clientData, error: clientError })
  const eqChain = { eq: vi.fn().mockReturnThis(), single: singleMock }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator-1' } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isOperator }),
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return { select: vi.fn().mockReturnValue(eqChain) }
      }
      return {
        insert: vi.fn().mockReturnValue(makeInsertChain()),
      }
    }),
  }
}

const mockLineItems = [
  { label: 'Conseil stratégique', description: null, quantity: 2, unitPrice: 500, vatRate: 'FR_200', unit: 'h', total: 1000 },
]

const mockPennylaneQuote = {
  id: 'pl-quote-1',
  customer_id: 'pl-cust-1',
  quote_number: 'DEV-001',
  status: 'draft',
  date: '2026-03-07',
  deadline: '2026-04-06',
  line_items: [],
  currency: 'EUR',
  amount: 1200,
  currency_amount_before_tax: 1000,
  currency_tax: 200,
  pdf_invoice_free_text: null,
  created_at: '2026-03-07T00:00:00Z',
  updated_at: '2026-03-07T00:00:00Z',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createAndSendQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTriggerBillingSync.mockResolvedValue({ data: { synced: 1 }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    const supabase = makeSupabaseMock()
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

    const result = await createAndSendQuote('client-1', mockLineItems, {})
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when user is not an operator', async () => {
    const supabase = makeSupabaseMock({ isOperator: false })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

    const result = await createAndSendQuote('client-1', mockLineItems, {})
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('returns CLIENT_NOT_FOUND when client does not exist in DB', async () => {
    const supabase = makeSupabaseMock({ clientData: null, clientError: { message: 'Not found' } })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

    const result = await createAndSendQuote('client-1', mockLineItems, {})
    expect(result.error?.code).toBe('CLIENT_NOT_FOUND')
  })

  it('returns NO_PENNYLANE_ID when client has no pennylane_customer_id', async () => {
    const supabase = makeSupabaseMock({ clientData: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-1', pennylane_customer_id: null } })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

    const result = await createAndSendQuote('client-1', mockLineItems, {})
    expect(result.error?.code).toBe('NO_PENNYLANE_ID')
  })

  it('returns error when Pennylane POST fails', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: null, error: { message: 'API error', code: 'PENNYLANE_500' } })

    const result = await createAndSendQuote('client-1', mockLineItems, {})
    expect(result.error?.code).toBe('PENNYLANE_500')
  })

  it('creates a draft quote (sendNow=false) with correct Pennylane mapping', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: { quote: mockPennylaneQuote }, error: null })

    const result = await createAndSendQuote('client-1', mockLineItems, { sendNow: false })

    expect(result.error).toBeNull()
    expect(mockPennylane.post).toHaveBeenCalledWith('/quotes', expect.objectContaining({
      quote: expect.objectContaining({
        customer_id: 'pl-cust-1',
        line_items: expect.arrayContaining([
          expect.objectContaining({
            label: 'Conseil stratégique',
            quantity: 2,
            currency_amount: 500,
            vat_rate: 'FR_200',
          }),
        ]),
      }),
    }))
  })

  it('finalizes quote in Pennylane when sendNow=true', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post
      .mockResolvedValueOnce({ data: { quote: mockPennylaneQuote }, error: null })
      .mockResolvedValueOnce({ data: { quote: { ...mockPennylaneQuote, status: 'pending' } }, error: null })

    await createAndSendQuote('client-1', mockLineItems, { sendNow: true })

    expect(mockPennylane.post).toHaveBeenCalledWith('/quotes/pl-quote-1/finalize', {})
  })

  it('inserts a payment notification for the client after quote creation', async () => {
    const supabase = makeSupabaseMock()
    const insertMock = vi.fn().mockReturnValue(makeInsertChain())
    supabase.from = vi.fn((table: string) => {
      if (table === 'clients') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-user-1', pennylane_customer_id: 'pl-cust-1' }, error: null }) }) }
      }
      return { insert: insertMock }
    })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: { quote: mockPennylaneQuote }, error: null })

    await createAndSendQuote('client-1', mockLineItems, { sendNow: true })

    const notifCall = insertMock.mock.calls.find((call) => {
      const arg = call[0]
      return arg?.type === 'payment' || (Array.isArray(arg) && arg[0]?.type === 'payment')
    })
    expect(notifCall).toBeDefined()
  })

  it('calls triggerBillingSync with clientId after successful quote creation', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: { quote: mockPennylaneQuote }, error: null })

    await createAndSendQuote('client-1', mockLineItems, {})

    expect(mockTriggerBillingSync).toHaveBeenCalledWith('client-1')
  })

  it('logs activity_log with quote_created action', async () => {
    const supabase = makeSupabaseMock()
    const insertMock = vi.fn().mockReturnValue(makeInsertChain())
    supabase.from = vi.fn((table: string) => {
      if (table === 'clients') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-user-1', pennylane_customer_id: 'pl-cust-1' }, error: null }) }) }
      }
      return { insert: insertMock }
    })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: { quote: mockPennylaneQuote }, error: null })

    await createAndSendQuote('client-1', mockLineItems, {})

    const activityCall = insertMock.mock.calls.find((call) => {
      const arg = call[0]
      return arg?.action === 'quote_created' || (Array.isArray(arg) && arg[0]?.action === 'quote_created')
    })
    expect(activityCall).toBeDefined()
  })
})
