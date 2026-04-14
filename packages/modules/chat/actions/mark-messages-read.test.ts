import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()

// Operator lookup chain: from('operators').select().eq().single()
const mockOperatorSingle = vi.fn()

// Update chain: from('messages').update().eq().eq().is().select()
const mockUpdateSelect = vi.fn()
const mockIsNull = vi.fn(() => ({ select: mockUpdateSelect }))
const mockEqSenderType = vi.fn(() => ({ is: mockIsNull }))
const mockEqClientId = vi.fn(() => ({ eq: mockEqSenderType }))
const mockUpdate = vi.fn(() => ({ eq: mockEqClientId }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockOperatorSingle,
        })),
      })),
    }
  }
  return { update: mockUpdate }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const VALID_CLIENT_ID = '00000000-0000-0000-0000-000000000001'

describe('markMessagesRead Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authenticated operator
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
    mockOperatorSingle.mockResolvedValue({ data: { id: 'op-1' }, error: null })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { markMessagesRead } = await import('./mark-messages-read')
    const result = await markMessagesRead({ clientId: VALID_CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const { markMessagesRead } = await import('./mark-messages-read')
    const result = await markMessagesRead({ clientId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('marks client messages as read when caller is operator', async () => {
    mockUpdateSelect.mockResolvedValue({
      data: [{ id: 'msg-1' }, { id: 'msg-2' }],
      error: null,
    })

    const { markMessagesRead } = await import('./mark-messages-read')
    const result = await markMessagesRead({ clientId: VALID_CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data?.updatedCount).toBe(2)
    // Should mark 'client' messages (operator reads client messages)
    expect(mockEqSenderType).toHaveBeenCalledWith('sender_type', 'client')
  })

  it('marks operator messages as read when caller is client', async () => {
    // Not an operator
    mockOperatorSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockUpdateSelect.mockResolvedValue({
      data: [{ id: 'msg-1' }],
      error: null,
    })

    const { markMessagesRead } = await import('./mark-messages-read')
    const result = await markMessagesRead({ clientId: VALID_CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data?.updatedCount).toBe(1)
    // Should mark 'operator' messages (client reads operator messages)
    expect(mockEqSenderType).toHaveBeenCalledWith('sender_type', 'operator')
  })

  it('returns updatedCount=0 when no unread messages', async () => {
    mockUpdateSelect.mockResolvedValue({ data: [], error: null })

    const { markMessagesRead } = await import('./mark-messages-read')
    const result = await markMessagesRead({ clientId: VALID_CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data?.updatedCount).toBe(0)
  })

  it('returns DB_ERROR on database failure', async () => {
    mockUpdateSelect.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { markMessagesRead } = await import('./mark-messages-read')
    const result = await markMessagesRead({ clientId: VALID_CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
