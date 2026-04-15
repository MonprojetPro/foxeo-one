import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))
vi.mock('../config/pennylane', () => ({
  pennylaneClient: { post: vi.fn(), get: vi.fn(), put: vi.fn(), del: vi.fn() },
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { pennylaneClient } from '../config/pennylane'
import { sendQuoteByEmail } from './send-quote-by-email'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockPost = vi.mocked(pennylaneClient.post)

function makeSupabase(opts: { isOperator?: boolean } = {}) {
  const insertMock = vi.fn().mockResolvedValue({ error: null })
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'op-1' } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: opts.isOperator ?? true }),
    from: vi.fn(() => ({ insert: insertMock })),
  }
}

describe('sendQuoteByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    const supabase = makeSupabase()
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as never)

    const res = await sendQuoteByEmail('quote-1')
    expect(res.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when not operator', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase({ isOperator: false }) as never)
    const res = await sendQuoteByEmail('quote-1')
    expect(res.error?.code).toBe('FORBIDDEN')
  })

  it('returns VALIDATION_ERROR when id is empty', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    const res = await sendQuoteByEmail('')
    expect(res.error?.code).toBe('VALIDATION_ERROR')
  })

  it('calls the right Pennylane endpoint and returns sent: true', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockPost.mockResolvedValue({ data: null, error: null })

    const res = await sendQuoteByEmail('PL-Q-42')

    expect(mockPost).toHaveBeenCalledWith('/quotes/PL-Q-42/send_by_email', {})
    expect(res.error).toBeNull()
    expect(res.data).toEqual({ sent: true })
  })

  it('translates a Pennylane 409 into PDF_NOT_READY', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockPost.mockResolvedValue({
      data: null,
      error: { message: 'PDF not ready', code: 'PENNYLANE_409' },
    })

    const res = await sendQuoteByEmail('PL-Q-42')
    expect(res.data).toBeNull()
    expect(res.error?.code).toBe('PDF_NOT_READY')
  })

  it('passes through other Pennylane errors as-is', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockPost.mockResolvedValue({
      data: null,
      error: { message: 'server error', code: 'PENNYLANE_500' },
    })

    const res = await sendQuoteByEmail('PL-Q-42')
    expect(res.error?.code).toBe('PENNYLANE_500')
  })
})
