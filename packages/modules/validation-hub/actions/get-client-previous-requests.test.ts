import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockOperatorSingle = vi.fn()
const mockLimit = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: mockOperatorSingle })),
          })),
        }
      }
      // validation_requests
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: mockLimit,
                })),
              })),
            })),
          })),
        })),
      }
    },
  })),
}))

function setupAuth(authenticated = true) {
  if (authenticated) {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockOperatorSingle.mockResolvedValue({
      data: { id: 'op-1' },
      error: null,
    })
  } else {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })
  }
}

describe('getClientPreviousRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return UNAUTHORIZED when not authenticated', async () => {
    setupAuth(false)
    const { getClientPreviousRequests } = await import(
      './get-client-previous-requests'
    )
    const result = await getClientPreviousRequests('c-1', 'req-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return empty array when no previous requests', async () => {
    setupAuth()
    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getClientPreviousRequests } = await import(
      './get-client-previous-requests'
    )
    const result = await getClientPreviousRequests('c-1', 'req-1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('should transform rows to ValidationRequestSummary', async () => {
    setupAuth()
    mockLimit.mockResolvedValue({
      data: [
        {
          id: 'req-0',
          title: 'Brief précédent',
          type: 'brief_lab',
          status: 'approved',
          submitted_at: '2026-01-15T10:00:00Z',
        },
      ],
      error: null,
    })

    const { getClientPreviousRequests } = await import(
      './get-client-previous-requests'
    )
    const result = await getClientPreviousRequests('c-1', 'req-1')

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data![0].id).toBe('req-0')
    expect(result.data![0].title).toBe('Brief précédent')
    expect(result.data![0].type).toBe('brief_lab')
    expect(result.data![0].status).toBe('approved')
    expect(result.data![0].submittedAt).toBe('2026-01-15T10:00:00Z')
  })

  it('should return DATABASE_ERROR on query failure', async () => {
    setupAuth()
    mockLimit.mockResolvedValue({
      data: null,
      error: { message: 'Query failed' },
    })

    const { getClientPreviousRequests } = await import(
      './get-client-previous-requests'
    )
    const result = await getClientPreviousRequests('c-1', 'req-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should always return { data, error } format', async () => {
    setupAuth(false)
    const { getClientPreviousRequests } = await import(
      './get-client-previous-requests'
    )
    const result = await getClientPreviousRequests('c-1', 'req-1')
    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
