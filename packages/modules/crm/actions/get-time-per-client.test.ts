import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { ClientTimeEstimate } from '../types/crm.types'
import { TIME_ESTIMATES } from '../utils/time-estimates'

const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440000'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'

// Mock Supabase server client
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

// Helper to build the operators mock chain
const makeOpChain = () => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({ data: { id: validOperatorUuid }, error: null }),
    })),
  })),
})

describe('getTimePerClient Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { getTimePerClient } = await import('./get-time-per-client')
    const result: ActionResponse<ClientTimeEstimate[]> = await getTimePerClient()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should calculate time estimates from activity logs', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    // Mock clients query
    const mockClientsResult = {
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Alice',
          company: 'AliceCorp',
          client_type: 'complet',
          status: 'lab-actif',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Bob',
          company: 'BobInc',
          client_type: 'direct_one',
          status: 'one-actif',
        },
      ],
      error: null,
    }

    // Mock activity_logs query
    const mockLogsResult = {
      data: [
        // Alice: 3 messages, 1 validation, 1 visio (1800s)
        { client_id: '550e8400-e29b-41d4-a716-446655440001', event_type: 'message_sent', event_data: null, created_at: '2024-01-20T10:00:00Z' },
        { client_id: '550e8400-e29b-41d4-a716-446655440001', event_type: 'message_sent', event_data: null, created_at: '2024-01-20T11:00:00Z' },
        { client_id: '550e8400-e29b-41d4-a716-446655440001', event_type: 'message_sent', event_data: null, created_at: '2024-01-20T12:00:00Z' },
        { client_id: '550e8400-e29b-41d4-a716-446655440001', event_type: 'validation_approved', event_data: null, created_at: '2024-01-21T10:00:00Z' },
        { client_id: '550e8400-e29b-41d4-a716-446655440001', event_type: 'visio_completed', event_data: { duration_seconds: 1800 }, created_at: '2024-01-22T10:00:00Z' },
        // Bob: 1 message
        { client_id: '550e8400-e29b-41d4-a716-446655440002', event_type: 'message_sent', event_data: null, created_at: '2024-01-19T10:00:00Z' },
      ],
      error: null,
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return makeOpChain()
      }
      if (table === 'clients') {
        // Chain: select → eq (no limit)
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue(mockClientsResult),
          })),
        }
      }
      // activity_logs — Chain: select → in → in → order → limit
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue(mockLogsResult),
              })),
            })),
          })),
        })),
      }
    })

    const { getTimePerClient } = await import('./get-time-per-client')
    const result: ActionResponse<ClientTimeEstimate[]> = await getTimePerClient()

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data).toHaveLength(2)

    // Should be sorted by total time DESC
    const alice = result.data![0]
    expect(alice.clientName).toBe('Alice')
    expect(alice.messageCount).toBe(3)
    expect(alice.validationCount).toBe(1)
    expect(alice.visioSeconds).toBe(1800)
    // Total: 3*120 + 1*300 + 1800 = 360 + 300 + 1800 = 2460
    expect(alice.totalEstimatedSeconds).toBe(2460)

    const bob = result.data![1]
    expect(bob.clientName).toBe('Bob')
    expect(bob.messageCount).toBe(1)
    expect(bob.totalEstimatedSeconds).toBe(120) // 1*120
  })

  it('should return empty array when no clients exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return makeOpChain()
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      }
    })

    const { getTimePerClient } = await import('./get-time-per-client')
    const result: ActionResponse<ClientTimeEstimate[]> = await getTimePerClient()

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('should handle clients with no activity logs', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return makeOpChain()
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Alice', company: 'AliceCorp', client_type: 'complet', status: 'lab-actif' },
              ],
              error: null,
            }),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
        })),
      }
    })

    const { getTimePerClient } = await import('./get-time-per-client')
    const result: ActionResponse<ClientTimeEstimate[]> = await getTimePerClient()

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)

    const alice = result.data![0]
    expect(alice.messageCount).toBe(0)
    expect(alice.validationCount).toBe(0)
    expect(alice.visioSeconds).toBe(0)
    expect(alice.totalEstimatedSeconds).toBe(0)
    expect(alice.lastActivity).toBeNull()
  })

  it('should return DATABASE_ERROR when clients query fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return makeOpChain()
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Connection refused' },
          }),
        })),
      }
    })

    const { getTimePerClient } = await import('./get-time-per-client')
    const result: ActionResponse<ClientTimeEstimate[]> = await getTimePerClient()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should use correct time estimate constants', () => {
    expect(TIME_ESTIMATES.message).toBe(120)
    expect(TIME_ESTIMATES.validation).toBe(300)
    expect(TIME_ESTIMATES.visio).toBe('real')
  })

  it('should handle visio without duration_seconds in event_data', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return makeOpChain()
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: '550e8400-e29b-41d4-a716-446655440001', name: 'Alice', company: 'AliceCorp', client_type: 'complet', status: 'lab-actif' }],
              error: null,
            }),
          })),
        }
      }
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: [
                    { client_id: '550e8400-e29b-41d4-a716-446655440001', event_type: 'visio_completed', event_data: null, created_at: '2024-01-20T10:00:00Z' },
                  ],
                  error: null,
                }),
              })),
            })),
          })),
        })),
      }
    })

    const { getTimePerClient } = await import('./get-time-per-client')
    const result: ActionResponse<ClientTimeEstimate[]> = await getTimePerClient()

    expect(result.error).toBeNull()
    const alice = result.data![0]
    // Visio without duration should count as 0 seconds
    expect(alice.visioSeconds).toBe(0)
    expect(alice.totalEstimatedSeconds).toBe(0)
  })
})
