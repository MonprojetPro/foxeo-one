import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))
vi.mock('../config/pennylane', () => ({
  pennylaneClient: { post: vi.fn(), get: vi.fn(), put: vi.fn(), del: vi.fn() },
}))
// Mock du helper retry pour eviter d attendre 10s en test
vi.mock('../utils/send-by-email-with-retry', () => ({
  sendByEmailWithRetry: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { pennylaneClient } from '../config/pennylane'
import { sendByEmailWithRetry } from '../utils/send-by-email-with-retry'
import { sendQuoteByEmail } from './send-quote-by-email'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockPost = vi.mocked(pennylaneClient.post)
const mockRetry = vi.mocked(sendByEmailWithRetry)

function makeSupabase(opts: { isOperator?: boolean } = {}) {
  const insertMock = vi.fn().mockResolvedValue({ error: null })
  const updateEqMock = vi.fn().mockResolvedValue({ error: null })
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'op-1' } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: opts.isOperator ?? true }),
    from: vi.fn(() => ({ insert: insertMock, update: updateMock })),
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

  it('calls the helper and returns sent: true on success', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockRetry.mockResolvedValue({ sent: true, attempts: 1, lastError: null })

    const res = await sendQuoteByEmail('PL-Q-42')

    expect(mockRetry).toHaveBeenCalledWith('PL-Q-42')
    expect(res.error).toBeNull()
    expect(res.data).toEqual({ sent: true })
  })

  it('translates a 409 (apres retries epuises) into PDF_NOT_READY', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockRetry.mockResolvedValue({
      sent: false,
      attempts: 5,
      lastError: { message: 'PDF not ready', code: 'PENNYLANE_409' },
    })

    const res = await sendQuoteByEmail('PL-Q-42')
    expect(res.data).toBeNull()
    expect(res.error?.code).toBe('PDF_NOT_READY')
  })

  it('passes through other Pennylane errors as-is', async () => {
    mockCreateServerSupabaseClient.mockResolvedValue(makeSupabase() as never)
    mockRetry.mockResolvedValue({
      sent: false,
      attempts: 1,
      lastError: { message: 'server error', code: 'PENNYLANE_500' },
    })

    const res = await sendQuoteByEmail('PL-Q-42')
    expect(res.error?.code).toBe('PENNYLANE_500')
  })
})
