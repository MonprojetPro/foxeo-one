import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'

const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440000'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'

// Mock Supabase server client
const mockFetchSingle = vi.fn()
const mockUpdateEqSecond = vi.fn()
const mockUpdateEq = vi.fn(() => ({ eq: mockUpdateEqSecond }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockInsert = vi.fn().mockResolvedValue({ error: null })

// Operator lookup mock chain
const mockOpSingle = vi.fn()
const mockOpEq = vi.fn(() => ({ single: mockOpSingle }))
const mockOpSelect = vi.fn(() => ({ eq: mockOpEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return { select: mockOpSelect }
  }
  if (table === 'clients') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: mockFetchSingle })) })),
      })),
      update: mockUpdate,
    }
  }
  if (table === 'activity_logs') {
    return { insert: mockInsert }
  }
  if (table === 'notifications') {
    return { insert: mockInsert }
  }
  return {}
})

const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('reactivateClient Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
  })

  it('should return INVALID_INPUT for non-UUID clientId', async () => {
    const { reactivateClient } = await import('./reactivate-client')
    const result = await reactivateClient({ clientId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { reactivateClient } = await import('./reactivate-client')
    const result = await reactivateClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when client does not exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    })

    const { reactivateClient } = await import('./reactivate-client')
    const result = await reactivateClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
    expect(result.error?.message).toContain('introuvable')
  })

  it('should return INVALID_STATUS if client is not suspended', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'active',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    const { reactivateClient } = await import('./reactivate-client')
    const result = await reactivateClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_STATUS')
  })

  it('should successfully reactivate a suspended client', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'suspended',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { reactivateClient } = await import('./reactivate-client')
    const result: ActionResponse<{ success: true }> = await reactivateClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalled()
  })

  it('should log activity for reactivation', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'suspended',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { reactivateClient } = await import('./reactivate-client')
    await reactivateClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client_reactivated',
      })
    )
  })

  it('should clear suspended_at timestamp', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'suspended',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { reactivateClient } = await import('./reactivate-client')
    await reactivateClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        suspended_at: null,
      })
    )
  })

  it('should return DATABASE_ERROR when update fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'suspended',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({
      error: { message: 'Database error', code: '500' },
    })

    const { reactivateClient } = await import('./reactivate-client')
    const result = await reactivateClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should successfully reactivate an archived client', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'archived',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { reactivateClient } = await import('./reactivate-client')
    const result: ActionResponse<{ success: true }> = await reactivateClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
  })

  it('should clear both suspended_at and archived_at timestamps', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'suspended',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { reactivateClient } = await import('./reactivate-client')
    await reactivateClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        suspended_at: null,
        archived_at: null,
      })
    )
  })

  // Story 9.5c — Archived-specific tests

  it('should restore previous_status when reactivating an archived client', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'archived',
        operator_id: validOperatorUuid,
        retention_until: futureDate,
        previous_status: 'active',
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { reactivateClient } = await import('./reactivate-client')
    await reactivateClient({ clientId: '550e8400-e29b-41d4-a716-446655440001' })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        archived_at: null,
        retention_until: null,
        previous_status: null,
      })
    )
  })

  it('should return CLIENT_DATA_PURGED when retention period has expired', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    const pastDate = new Date(Date.now() - 1000).toISOString()
    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'archived',
        operator_id: validOperatorUuid,
        retention_until: pastDate,
        previous_status: 'active',
      },
      error: null,
    })

    const { reactivateClient } = await import('./reactivate-client')
    const result = await reactivateClient({ clientId: '550e8400-e29b-41d4-a716-446655440001' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CLIENT_DATA_PURGED')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('should allow reactivation of archived client when retention_until is null (legacy)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'archived',
        operator_id: validOperatorUuid,
        retention_until: null,
        previous_status: null,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { reactivateClient } = await import('./reactivate-client')
    const result = await reactivateClient({ clientId: '550e8400-e29b-41d4-a716-446655440001' })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
  })

  it('should fallback to active status when previous_status is null', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'archived',
        operator_id: validOperatorUuid,
        retention_until: null,
        previous_status: null,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { reactivateClient } = await import('./reactivate-client')
    await reactivateClient({ clientId: '550e8400-e29b-41d4-a716-446655440001' })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
      })
    )
  })
})
