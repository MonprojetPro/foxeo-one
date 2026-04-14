import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
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

describe('requestClarification', () => {
  const validRequestId = '00000000-0000-0000-0000-000000000001'
  const validComment = 'Pouvez-vous préciser votre besoin en détail ?'

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-1' } },
      error: null,
    })
  })

  it('should return error when requestId is invalid UUID', async () => {
    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification('not-a-uuid', validComment)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return error when comment is less than 10 chars', async () => {
    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification(validRequestId, 'Court')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })

    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification(validRequestId, validComment)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when user is not an operator', async () => {
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
    const result = await requestClarification(validRequestId, validComment)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should update validation_request and create notification on success', async () => {
    const requestData = {
      id: validRequestId,
      client_id: 'client-1',
      operator_id: 'operator-1',
      type: 'brief_lab',
      title: 'Brief test',
      status: 'needs_clarification',
      reviewer_comment: validComment,
      reviewed_at: '2026-02-26T10:00:00Z',
      updated_at: '2026-02-26T10:00:00Z',
      content: 'content',
      document_ids: [],
      submitted_at: '2026-02-25T10:00:00Z',
      created_at: '2026-02-25T10:00:00Z',
      parcours_id: null,
      step_id: null,
    }

    const clientData = {
      auth_user_id: 'auth-user-client-1',
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'operator-1' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'validation_requests') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: requestData, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: clientData, error: null }),
            }),
          }),
        }
      }
      if (table === 'notifications') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'notif-1' },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification(validRequestId, validComment)

    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
  })

  it('should return DB_ERROR when update fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'operator-1' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'validation_requests') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'DB error' },
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { requestClarification } = await import('./request-clarification')
    const result = await requestClarification(validRequestId, validComment)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should log error with VALIDATION-HUB:CLARIFICATION prefix on DB error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'operator-1' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'validation_requests') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'DB error' },
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { requestClarification } = await import('./request-clarification')
    await requestClarification(validRequestId, validComment)

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[VALIDATION-HUB:CLARIFICATION]'),
      expect.anything()
    )

    consoleSpy.mockRestore()
  })
})
