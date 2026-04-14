import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { Conversation } from '../types/chat.types'

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockOrder = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()
const mockIs = vi.fn()
const mockLimit = vi.fn()
const mockSelect = vi.fn()

// Track chained queries per table
function buildChain() {
  return {
    select: vi.fn((..._args: unknown[]) => ({
      eq: mockEq,
      in: mockIn,
      order: mockOrder,
      single: mockSingle,
      count: 'exact',
    })),
  }
}

const mockFrom = vi.fn(() => buildChain())

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('getConversations Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-1' } },
      error: null,
    })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })

    const { getConversations } = await import('./get-conversations')
    const result: ActionResponse<Conversation[]> = await getConversations()

    expect(result.error?.code).toBe('UNAUTHORIZED')
    expect(result.data).toBeNull()
  })

  it('returns NOT_FOUND when operator record missing', async () => {
    // operators.select().eq().single() returns null
    const operatorChain = {
      eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }) })),
    }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') return { select: vi.fn(() => operatorChain) }
      return buildChain()
    })

    const { getConversations } = await import('./get-conversations')
    const result = await getConversations()

    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns empty array when operator has no clients', async () => {
    const operatorSingle = vi.fn().mockResolvedValue({ data: { id: 'op-1' }, error: null })
    const clientsOrder = vi.fn().mockResolvedValue({ data: [], error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: operatorSingle })) })) }
      }
      if (table === 'clients') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: clientsOrder })) })) }
      }
      return buildChain()
    })

    const { getConversations } = await import('./get-conversations')
    const result = await getConversations()

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('builds conversation list with last message and unread count', async () => {
    const operatorSingle = vi.fn().mockResolvedValue({ data: { id: 'op-1' }, error: null })
    const clientsOrder = vi.fn().mockResolvedValue({
      data: [
        { id: 'client-a', name: 'Alice', email: 'alice@test.com' },
        { id: 'client-b', name: 'Bob', email: 'bob@test.com' },
      ],
      error: null,
    })
    const lastMsgLimit = vi.fn().mockResolvedValue({
      data: [
        { client_id: 'client-a', content: 'Salut', created_at: '2026-02-17T10:00:00Z' },
      ],
      error: null,
    })
    const unreadIs = vi.fn().mockResolvedValue({
      data: [{ client_id: 'client-a' }, { client_id: 'client-a' }],
      error: null,
    })

    let messageCallIndex = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: operatorSingle })) })) }
      }
      if (table === 'clients') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: clientsOrder })) })) }
      }
      if (table === 'messages') {
        messageCallIndex++
        if (messageCallIndex === 1) {
          // last messages query
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: lastMsgLimit,
                })),
              })),
            })),
          }
        } else {
          // unread count query
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: unreadIs,
                })),
              })),
            })),
          }
        }
      }
      return buildChain()
    })

    const { getConversations } = await import('./get-conversations')
    const result = await getConversations()

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(2)

    // Alice has last message + 2 unread, sorted first
    const alice = result.data?.find((c) => c.clientName === 'Alice')
    expect(alice?.lastMessage).toBe('Salut')
    expect(alice?.unreadCount).toBe(2)

    // Bob has no messages
    const bob = result.data?.find((c) => c.clientName === 'Bob')
    expect(bob?.lastMessage).toBeNull()
    expect(bob?.unreadCount).toBe(0)
  })
})
