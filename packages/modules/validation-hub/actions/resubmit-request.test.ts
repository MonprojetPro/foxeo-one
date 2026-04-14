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

describe('resubmitRequest', () => {
  const validRequestId = '00000000-0000-0000-0000-000000000001'
  const validContent = 'Voici le nouveau contenu avec plus de détails sur le besoin.'

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-client-1' } },
      error: null,
    })
  })

  it('should return error when requestId is invalid UUID', async () => {
    const { resubmitRequest } = await import('./resubmit-request')
    const result = await resubmitRequest('not-a-uuid', validContent)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return error when content is empty', async () => {
    const { resubmitRequest } = await import('./resubmit-request')
    const result = await resubmitRequest(validRequestId, '')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })

    const { resubmitRequest } = await import('./resubmit-request')
    const result = await resubmitRequest(validRequestId, validContent)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should update validation_request and create operator notification on success', async () => {
    const requestData = {
      id: validRequestId,
      client_id: 'client-1',
      operator_id: 'operator-1',
      type: 'brief_lab',
      title: 'Brief test',
      status: 'pending',
      content: validContent,
      updated_at: '2026-02-26T10:00:00Z',
    }

    mockFrom.mockImplementation((table: string) => {
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
              single: vi.fn().mockResolvedValue({
                data: { name: 'Alice Dupont' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { auth_user_id: 'auth-user-operator-1' },
                error: null,
              }),
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

    const { resubmitRequest } = await import('./resubmit-request')
    const result = await resubmitRequest(validRequestId, validContent)

    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
  })

  it('should return DB_ERROR when update fails', async () => {
    mockFrom.mockImplementation((table: string) => {
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

    const { resubmitRequest } = await import('./resubmit-request')
    const result = await resubmitRequest(validRequestId, validContent)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should log error with VALIDATION-HUB:RESUBMIT prefix on DB error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockFrom.mockImplementation((table: string) => {
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

    const { resubmitRequest } = await import('./resubmit-request')
    await resubmitRequest(validRequestId, validContent)

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[VALIDATION-HUB:RESUBMIT]'),
      expect.anything()
    )

    consoleSpy.mockRestore()
  })

  it('should set status back to pending on resubmission', async () => {
    const requestData = {
      id: validRequestId,
      client_id: 'client-1',
      operator_id: 'operator-1',
      type: 'brief_lab',
      title: 'Brief test',
      status: 'pending',
      content: validContent,
      updated_at: '2026-02-26T12:00:00Z',
    }

    mockFrom.mockImplementation((table: string) => {
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
              single: vi.fn().mockResolvedValue({
                data: { name: 'Bob' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'operators') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { auth_user_id: 'auth-op-1' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'notifications') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'notif-2' },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { resubmitRequest } = await import('./resubmit-request')
    const result = await resubmitRequest(validRequestId, validContent)

    expect(result.error).toBeNull()
    expect((result.data as { status: string })?.status).toBe('pending')
  })
})
