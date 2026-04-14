import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { Message } from '../types/chat.types'

const mockOrder = vi.fn()
const mockEq = vi.fn(() => ({ order: mockOrder }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const VALID_CLIENT_ID = '00000000-0000-0000-0000-000000000001'

describe('getMessages Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { getMessages } = await import('./get-messages')
    const result: ActionResponse<Message[]> = await getMessages({ clientId: VALID_CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })

    const { getMessages } = await import('./get-messages')
    const result = await getMessages({ clientId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns messages in ascending chronological order', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })

    const dbMessages = [
      {
        id: 'msg-1',
        client_id: VALID_CLIENT_ID,
        operator_id: 'op-id',
        sender_type: 'operator',
        content: 'First',
        read_at: null,
        created_at: '2026-02-17T09:00:00Z',
      },
      {
        id: 'msg-2',
        client_id: VALID_CLIENT_ID,
        operator_id: 'op-id',
        sender_type: 'client',
        content: 'Second',
        read_at: '2026-02-17T09:05:00Z',
        created_at: '2026-02-17T09:01:00Z',
      },
    ]
    mockOrder.mockResolvedValue({ data: dbMessages, error: null })

    const { getMessages } = await import('./get-messages')
    const result = await getMessages({ clientId: VALID_CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(2)
    expect(result.data?.[0].content).toBe('First')
    expect(result.data?.[1].content).toBe('Second')
    // Verify camelCase transformation
    expect(result.data?.[0].clientId).toBe(VALID_CLIENT_ID)
    expect(result.data?.[1].readAt).toBe('2026-02-17T09:05:00Z')
  })

  it('returns empty array when no messages', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
    mockOrder.mockResolvedValue({ data: [], error: null })

    const { getMessages } = await import('./get-messages')
    const result = await getMessages({ clientId: VALID_CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('returns DB_ERROR on database failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { getMessages } = await import('./get-messages')
    const result = await getMessages({ clientId: VALID_CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
