import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))
vi.mock('../config/pennylane', () => ({
  pennylaneClient: { post: vi.fn(), get: vi.fn(), put: vi.fn(), del: vi.fn() },
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { pennylaneClient } from '../config/pennylane'
import { cancelQuote } from './cancel-quote'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockPut = vi.mocked(pennylaneClient.put)

function makeSupabase(opts: { isOperator?: boolean } = {}) {
  const updateChainEq2 = vi.fn().mockResolvedValue({ error: null })
  const updateChainEq1 = vi.fn(() => ({ eq: updateChainEq2 }))
  const updateMock = vi.fn(() => ({ eq: updateChainEq1 }))
  const insertMock = vi.fn().mockResolvedValue({ error: null })

  // Pre-cancel SELECT pour preserver le data JSON existant
  const selectMaybeSingle = vi.fn().mockResolvedValue({ data: { data: { quote_number: 'DEV-001' } }, error: null })
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

describe('cancelQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    const supabase = makeSupabase()
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const res = await cancelQuote('quote-1')
    expect(res.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when not operator', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase({ isOperator: false }) as never)
    const res = await cancelQuote('quote-1')
    expect(res.error?.code).toBe('FORBIDDEN')
  })

  it('returns VALIDATION_ERROR when id is empty', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    const res = await cancelQuote('')
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('calls update_status with denied and returns the new status', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockPut.mockResolvedValue({ data: { id: 42, status: 'denied' }, error: null })

    const res = await cancelQuote('PL-Q-42')

    expect(mockPut).toHaveBeenCalledWith('/quotes/PL-Q-42/update_status', { status: 'denied' })
    expect(res.error).toBeNull()
    expect(res.data).toEqual({ status: 'denied' })
  })

  it('passes through Pennylane errors', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockPut.mockResolvedValue({
      data: null,
      error: { message: 'forbidden', code: 'PENNYLANE_403' },
    })

    const res = await cancelQuote('PL-Q-42')
    expect(res.error?.code).toBe('PENNYLANE_403')
  })
})
