import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { ActivityLog } from '../types/crm.types'

// Mock Supabase server client
const mockRange = vi.fn()
const mockOrder = vi.fn(() => ({ range: mockRange }))
const mockEq2 = vi.fn(() => ({ order: mockOrder }))
const mockEq = vi.fn(() => ({ eq: mockEq2 }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('getActivityLogs Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return INVALID_INPUT for non-UUID clientId', async () => {
    const { getActivityLogs } = await import('./get-activity-logs')
    const result = await getActivityLogs('not-a-uuid')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { getActivityLogs } = await import('./get-activity-logs')
    const result: ActionResponse<ActivityLog[]> = await getActivityLogs('550e8400-e29b-41d4-a716-446655440001')

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return activity logs in correct camelCase format ordered DESC', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
      error: null,
    })

    mockRange.mockResolvedValue({
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          actor_type: 'operator',
          actor_id: '550e8400-e29b-41d4-a716-446655440000',
          action: 'status_changed',
          entity_type: 'client',
          entity_id: '550e8400-e29b-41d4-a716-446655440001',
          metadata: { from: 'lab-actif', to: 'one-actif' },
          created_at: '2024-01-20T10:00:00+00:00',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440011',
          actor_type: 'system',
          actor_id: null,
          action: 'client_created',
          entity_type: 'client',
          entity_id: '550e8400-e29b-41d4-a716-446655440001',
          metadata: null,
          created_at: '2024-01-15T10:00:00+00:00',
        },
      ],
      error: null,
    })

    const { getActivityLogs } = await import('./get-activity-logs')
    const result: ActionResponse<ActivityLog[]> = await getActivityLogs('550e8400-e29b-41d4-a716-446655440001')

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data).toHaveLength(2)

    const firstLog = result.data![0]
    expect(firstLog).toHaveProperty('clientId', '550e8400-e29b-41d4-a716-446655440001')
    expect(firstLog).toHaveProperty('eventType', 'status_changed')
    expect(firstLog).toHaveProperty('eventData')
    expect(firstLog).toHaveProperty('description')
    expect(firstLog).toHaveProperty('createdAt', '2024-01-20T10:00:00+00:00')
    expect(firstLog).toHaveProperty('actorType', 'operator')
    expect(firstLog).toHaveProperty('actorLabel', 'par toi')

    // Verify snake_case fields are NOT present
    expect(firstLog).not.toHaveProperty('client_id')
    expect(firstLog).not.toHaveProperty('event_type')
    expect(firstLog).not.toHaveProperty('created_at')
  })

  it('should return empty array when no logs exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
      error: null,
    })

    mockRange.mockResolvedValue({
      data: [],
      error: null,
    })

    const { getActivityLogs } = await import('./get-activity-logs')
    const result: ActionResponse<ActivityLog[]> = await getActivityLogs('550e8400-e29b-41d4-a716-446655440001')

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('should return DATABASE_ERROR when Supabase query fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
      error: null,
    })

    mockRange.mockResolvedValue({
      data: null,
      error: { message: 'Connection refused', code: 'PGRST301' },
    })

    const { getActivityLogs } = await import('./get-activity-logs')
    const result: ActionResponse<ActivityLog[]> = await getActivityLogs('550e8400-e29b-41d4-a716-446655440001')

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should order by created_at DESC', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
      error: null,
    })

    mockRange.mockResolvedValue({ data: [], error: null })

    const { getActivityLogs } = await import('./get-activity-logs')
    await getActivityLogs('550e8400-e29b-41d4-a716-446655440001')

    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('should use range pagination with default offset 0', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
      error: null,
    })

    mockRange.mockResolvedValue({ data: [], error: null })

    const { getActivityLogs } = await import('./get-activity-logs')
    await getActivityLogs('550e8400-e29b-41d4-a716-446655440001')

    expect(mockRange).toHaveBeenCalledWith(0, 20)
  })

  it('should support custom offset for pagination', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: '550e8400-e29b-41d4-a716-446655440000' } },
      error: null,
    })

    mockRange.mockResolvedValue({ data: [], error: null })

    const { getActivityLogs } = await import('./get-activity-logs')
    await getActivityLogs('550e8400-e29b-41d4-a716-446655440001', 20)

    expect(mockRange).toHaveBeenCalledWith(20, 40)
  })
})
