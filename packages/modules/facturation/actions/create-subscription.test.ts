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

vi.mock('./trigger-billing-sync', () => ({
  triggerBillingSync: vi.fn().mockResolvedValue({ data: { synced: 1 }, error: null }),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { pennylaneClient } from '../config/pennylane'
import { triggerBillingSync } from './trigger-billing-sync'
import {
  createSubscription,
  PLAN_MONTHLY_PRICE,
  PLAN_LABEL,
  AVAILABLE_EXTRAS,
  type CreateSubscriptionInput,
} from './create-subscription'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockPennylane = vi.mocked(pennylaneClient)
const mockTriggerBillingSync = vi.mocked(triggerBillingSync)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInsert() {
  return vi.fn().mockResolvedValue({ data: null, error: null })
}

function makeUpdateChain() {
  const chain = { eq: vi.fn(() => chain), data: null, error: null }
  chain.eq = vi.fn().mockResolvedValue({ data: null, error: null })
  return { eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })) }
}

function makeSupabaseMock(opts: {
  isOperator?: boolean
  clientData?: Record<string, unknown> | null
  clientError?: { message: string } | null
} = {}) {
  const {
    isOperator = true,
    clientData = {
      id: 'client-1',
      name: 'ACME',
      auth_user_id: 'auth-user-1',
      pennylane_customer_id: 'pl-cust-1',
    },
    clientError = null,
  } = opts

  const singleMock = vi.fn().mockResolvedValue({ data: clientData, error: clientError })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator-1' } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isOperator }),
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: singleMock }),
          }),
        }
      }
      if (table === 'client_configs') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }
      }
      return { insert: makeInsert() }
    }),
  }
}

const mockPennylaneSub = {
  id: 'pl-sub-1',
  customer_id: 'pl-cust-1',
  status: 'active',
  start_date: '2026-03-07',
  recurring_period: 'monthly',
  line_items: [],
  amount: 49,
  created_at: '2026-03-07T00:00:00Z',
  updated_at: '2026-03-07T00:00:00Z',
}

const baseInput: CreateSubscriptionInput = {
  clientId: 'client-1',
  plan: 'essentiel',
  frequency: 'monthly',
  startDate: '2026-03-07',
  extras: [],
  paymentMethod: 'cb',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTriggerBillingSync.mockResolvedValue({ data: { synced: 1 }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    const supabase = makeSupabaseMock()
    supabase.auth.getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') })
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )

    const result = await createSubscription(baseInput)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when user is not an operator', async () => {
    const supabase = makeSupabaseMock({ isOperator: false })
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )

    const result = await createSubscription(baseInput)
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('returns CLIENT_NOT_FOUND when client does not exist', async () => {
    const supabase = makeSupabaseMock({ clientData: null, clientError: { message: 'Not found' } })
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )

    const result = await createSubscription(baseInput)
    expect(result.error?.code).toBe('CLIENT_NOT_FOUND')
  })

  it('returns MISSING_EMAIL when client has no pennylane_customer_id and no email (auto-création impossible)', async () => {
    // Story G : sans pennylane_customer_id, on tente l'auto-création — mais sans email c'est impossible
    const supabase = makeSupabaseMock({
      clientData: {
        id: 'client-1',
        name: 'ACME',
        auth_user_id: 'auth-1',
        pennylane_customer_id: null,
        email: null,
      },
    })
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )

    const result = await createSubscription(baseInput)
    expect(result.error?.code).toBe('MISSING_EMAIL')
  })

  it('returns error when Pennylane POST fails', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )
    mockPennylane.post.mockResolvedValue({
      data: null,
      error: { message: 'API error', code: 'PENNYLANE_500' },
    })

    const result = await createSubscription(baseInput)
    expect(result.error?.code).toBe('PENNYLANE_500')
  })

  it('sends correct line_items for essentiel plan (base + no extras)', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )
    mockPennylane.post.mockResolvedValue({
      data: { billing_subscription: mockPennylaneSub },
      error: null,
    })

    await createSubscription(baseInput)

    expect(mockPennylane.post).toHaveBeenCalledWith(
      '/billing_subscriptions',
      expect.objectContaining({
        billing_subscription: expect.objectContaining({
          customer_id: 'pl-cust-1',
          recurring_period: 'monthly',
          line_items: expect.arrayContaining([
            expect.objectContaining({
              label: PLAN_LABEL.essentiel,
              // toPennylaneLineItem produit raw_currency_unit_price (string) en V2
              raw_currency_unit_price: String(PLAN_MONTHLY_PRICE.essentiel) + '.00',
            }),
          ]),
        }),
      })
    )
  })

  it('includes extra module line items when extras are selected', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )
    mockPennylane.post.mockResolvedValue({
      data: { billing_subscription: mockPennylaneSub },
      error: null,
    })

    const visioExtra = AVAILABLE_EXTRAS.find((e) => e.id === 'visio')!

    await createSubscription({ ...baseInput, extras: ['visio'] })

    const postCall = mockPennylane.post.mock.calls[0]
    const lineItems = (postCall[1] as { billing_subscription: { line_items: unknown[] } })
      .billing_subscription.line_items
    expect(lineItems).toHaveLength(2)
    expect(lineItems[1]).toMatchObject({
      label: visioExtra.label,
      // toPennylaneLineItem produit raw_currency_unit_price (string) en V2
      raw_currency_unit_price: visioExtra.monthlyPrice.toFixed(2),
    })
  })

  it('updates client_configs.subscription_tier and pending_billing_update after creation', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    const supabase = makeSupabaseMock()
    supabase.from = vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'client-1',
                  name: 'ACME',
                  auth_user_id: 'auth-user-1',
                  pennylane_customer_id: 'pl-cust-1',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'client_configs') {
        return { update: updateMock }
      }
      return { insert: makeInsert() }
    })
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )
    mockPennylane.post.mockResolvedValue({
      data: { billing_subscription: mockPennylaneSub },
      error: null,
    })

    await createSubscription(baseInput)

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_tier: 'essentiel',
        pending_billing_update: false,
      })
    )
  })

  it('calls triggerBillingSync with clientId after successful creation', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )
    mockPennylane.post.mockResolvedValue({
      data: { billing_subscription: mockPennylaneSub },
      error: null,
    })

    await createSubscription(baseInput)

    expect(mockTriggerBillingSync).toHaveBeenCalledWith('client-1')
  })

  it('logs activity_log with subscription_created action', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })
    const supabase = makeSupabaseMock()
    supabase.from = vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'client-1',
                  name: 'ACME',
                  auth_user_id: 'auth-user-1',
                  pennylane_customer_id: 'pl-cust-1',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'client_configs') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }
      }
      return { insert: insertMock }
    })
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )
    mockPennylane.post.mockResolvedValue({
      data: { billing_subscription: mockPennylaneSub },
      error: null,
    })

    await createSubscription(baseInput)

    const activityCall = insertMock.mock.calls.find((call) => {
      const arg = call[0]
      return (
        arg?.action === 'subscription_created' ||
        (Array.isArray(arg) && arg[0]?.action === 'subscription_created')
      )
    })
    expect(activityCall).toBeDefined()
  })

  it('returns the Pennylane subscription id on success', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )
    mockPennylane.post.mockResolvedValue({
      data: { billing_subscription: mockPennylaneSub },
      error: null,
    })

    const result = await createSubscription(baseInput)
    expect(result.error).toBeNull()
    expect(result.data).toBe('pl-sub-1')
  })

  it('maps ponctuel plan tier to "base" in client_configs', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    const supabase = makeSupabaseMock()
    supabase.from = vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'client-1',
                  name: 'ACME',
                  auth_user_id: 'auth-user-1',
                  pennylane_customer_id: 'pl-cust-1',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'client_configs') {
        return { update: updateMock }
      }
      return { insert: makeInsert() }
    })
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )
    mockPennylane.post.mockResolvedValue({
      data: { billing_subscription: mockPennylaneSub },
      error: null,
    })

    await createSubscription({ ...baseInput, plan: 'ponctuel', customAmount: 200 })

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_tier: 'base' })
    )
  })

  it('maps agentique plan tier to "agentique" in client_configs', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    const supabase = makeSupabaseMock()
    supabase.from = vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'client-1',
                  name: 'ACME',
                  auth_user_id: 'auth-user-1',
                  pennylane_customer_id: 'pl-cust-1',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'client_configs') {
        return { update: updateMock }
      }
      return { insert: makeInsert() }
    })
    mockCreateServerSupabaseClient.mockResolvedValue(
      supabase as unknown as ReturnType<typeof createServerSupabaseClient>
    )
    mockPennylane.post.mockResolvedValue({
      data: { billing_subscription: mockPennylaneSub },
      error: null,
    })

    await createSubscription({ ...baseInput, plan: 'agentique' })

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_tier: 'agentique' })
    )
  })
})
