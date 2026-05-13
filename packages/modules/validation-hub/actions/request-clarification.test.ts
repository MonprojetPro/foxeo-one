import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()
const mockSendMessage = vi.fn()

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@monprojetpro/modules-chat', () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}))

vi.mock('@monprojetpro/types', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/types')>()
  return {
    ...actual,
    errorResponse: (message: string, code: string, details?: unknown) => ({
      data: null,
      error: { message, code, details },
    }),
    successResponse: (data: unknown) => ({ data, error: null }),
  }
})

vi.mock('@monprojetpro/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/utils')>()
  return {
    ...actual,
    toCamelCase: (obj: unknown) => obj,
  }
})

const VALID_REQUEST_ID = '00000000-0000-0000-0000-000000000001'
const VALID_COMMENT = 'Pouvez-vous préciser votre besoin en détail ?'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000010'
const CLIENT_ID = '00000000-0000-0000-0000-000000000020'

function buildRequestRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: VALID_REQUEST_ID,
    client_id: CLIENT_ID,
    operator_id: OPERATOR_ID,
    type: 'step_submission',
    title: 'Soumission étape 2',
    status: 'pending',
    step_id: '00000000-0000-0000-0000-000000000099',
    reviewer_comment: VALID_COMMENT,
    reviewed_at: '2026-05-13T10:00:00Z',
    updated_at: '2026-05-13T10:00:00Z',
    ...overrides,
  }
}

function setupHappyPath(requestRow = buildRequestRow()) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'operators') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }),
          }),
        }),
      }
    }
    if (table === 'validation_requests') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: requestRow, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: requestRow, error: null }),
            }),
          }),
        }),
      }
    }
    return {}
  })
}

describe('requestClarification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-1' } },
      error: null,
    })
    mockSendMessage.mockResolvedValue({ data: { id: 'msg-1' }, error: null })
  })

  it('returns VALIDATION_ERROR when requestId is invalid UUID', async () => {
    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification('not-a-uuid', VALID_COMMENT)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR when comment is less than 10 chars', async () => {
    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification(VALID_REQUEST_ID, 'Court')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })
    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification(VALID_REQUEST_ID, VALID_COMMENT)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns NOT_FOUND when user is not an operator', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }
      }
      return {}
    })

    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification(VALID_REQUEST_ID, VALID_COMMENT)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('keeps the validation request in pending status (does NOT switch to needs_clarification)', async () => {
    const row = buildRequestRow()
    setupHappyPath(row)
    // Capture update payload
    let updatePayload: Record<string, unknown> | undefined
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'validation_requests') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: row, error: null }),
            }),
          }),
          update: vi.fn((payload: Record<string, unknown>) => {
            updatePayload = payload
            return {
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: row, error: null }),
                }),
              }),
            }
          }),
        }
      }
      return {}
    })

    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification(VALID_REQUEST_ID, VALID_COMMENT)

    expect(result.error).toBeNull()
    // Le payload UPDATE ne doit PAS changer le status
    expect(updatePayload).toBeDefined()
    expect(updatePayload).not.toHaveProperty('status')
    expect(updatePayload?.reviewer_comment).toBe(VALID_COMMENT)
  })

  it('sends a chat message from operator to client with the question', async () => {
    const row = buildRequestRow()
    setupHappyPath(row)

    const { requestClarification } = await import('./request-clarification')
    await requestClarification(VALID_REQUEST_ID, VALID_COMMENT)

    expect(mockSendMessage).toHaveBeenCalledTimes(1)
    const arg = mockSendMessage.mock.calls[0][0]
    expect(arg).toMatchObject({
      clientId: CLIENT_ID,
      operatorId: OPERATOR_ID,
      senderType: 'operator',
    })
    expect(arg.content).toContain(VALID_COMMENT)
    expect(arg.content).toContain('Demande de précisions')
  })

  it('still returns success if sendMessage fails (non-blocking)', async () => {
    const row = buildRequestRow()
    setupHappyPath(row)
    mockSendMessage.mockResolvedValue({ data: null, error: { message: 'Chat down', code: 'X' } })

    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification(VALID_REQUEST_ID, VALID_COMMENT)
    expect(result.error).toBeNull()
  })

  it('returns NOT_FOUND when validation_request does not exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'validation_requests') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }
      }
      return {}
    })

    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification(VALID_REQUEST_ID, VALID_COMMENT)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns DB_ERROR when update fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'validation_requests') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: buildRequestRow(), error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification(VALID_REQUEST_ID, VALID_COMMENT)
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
