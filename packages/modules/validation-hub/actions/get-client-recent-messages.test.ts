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
            eq: vi.fn(() => ({
              single: mockOperatorSingle,
            })),
          })),
        }
      }
      // messages table
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: mockLimit,
            })),
          })),
        })),
      }
    },
  })),
}))

describe('getClientRecentMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })
    const { getClientRecentMessages } = await import(
      './get-client-recent-messages'
    )
    const result = await getClientRecentMessages('c-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when operator not found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockOperatorSingle.mockResolvedValue({
      data: null,
      error: { message: 'No rows' },
    })

    const { getClientRecentMessages } = await import(
      './get-client-recent-messages'
    )
    const result = await getClientRecentMessages('c-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return empty array when no messages', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockOperatorSingle.mockResolvedValue({
      data: { id: 'op-1' },
      error: null,
    })
    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getClientRecentMessages } = await import(
      './get-client-recent-messages'
    )
    const result = await getClientRecentMessages('c-1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('should transform rows to MessageSummary', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockOperatorSingle.mockResolvedValue({
      data: { id: 'op-1' },
      error: null,
    })
    mockLimit.mockResolvedValue({
      data: [
        {
          id: 'msg-1',
          sender_type: 'client',
          content: 'Bonjour, voici mon brief',
          created_at: '2026-02-22T09:00:00Z',
        },
        {
          id: 'msg-2',
          sender_type: 'operator',
          content: 'Reçu, je regarde',
          created_at: '2026-02-22T10:00:00Z',
        },
      ],
      error: null,
    })

    const { getClientRecentMessages } = await import(
      './get-client-recent-messages'
    )
    const result = await getClientRecentMessages('c-1')

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(2)
    expect(result.data![0].id).toBe('msg-1')
    expect(result.data![0].senderType).toBe('client')
    expect(result.data![0].content).toBe('Bonjour, voici mon brief')
    expect(result.data![0].createdAt).toBe('2026-02-22T09:00:00Z')
    expect(result.data![1].senderType).toBe('operator')
  })

  it('should return DATABASE_ERROR on query failure', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockOperatorSingle.mockResolvedValue({
      data: { id: 'op-1' },
      error: null,
    })
    mockLimit.mockResolvedValue({ data: null, error: { message: 'DB fail' } })

    const { getClientRecentMessages } = await import(
      './get-client-recent-messages'
    )
    const result = await getClientRecentMessages('c-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })
    const { getClientRecentMessages } = await import(
      './get-client-recent-messages'
    )
    const result = await getClientRecentMessages('c-1')
    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
