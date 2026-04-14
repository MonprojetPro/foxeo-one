import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'

const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440000'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'
const validClientUuid = '550e8400-e29b-41d4-a716-446655440001'

// Mock Supabase server client
const mockUpdateEqSecond = vi.fn()
const mockUpdateEq = vi.fn(() => ({ eq: mockUpdateEqSecond }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockFetchSingle = vi.fn()

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

describe('archiveClient Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
  })

  it('should return INVALID_INPUT for non-UUID clientId', async () => {
    const { archiveClient } = await import('./archive-client')
    const result = await archiveClient({ clientId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('should return INVALID_INPUT for retentionDays below 30', async () => {
    const { archiveClient } = await import('./archive-client')
    const result = await archiveClient({ clientId: validClientUuid, retentionDays: 10 })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('should return INVALID_INPUT for retentionDays above 365', async () => {
    const { archiveClient } = await import('./archive-client')
    const result = await archiveClient({ clientId: validClientUuid, retentionDays: 400 })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { archiveClient } = await import('./archive-client')
    const result = await archiveClient({ clientId: validClientUuid })

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

    const { archiveClient } = await import('./archive-client')
    const result = await archiveClient({ clientId: validClientUuid })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return CLIENT_ALREADY_ARCHIVED if client is already archived', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'archived', operator_id: validOperatorUuid },
      error: null,
    })

    const { archiveClient } = await import('./archive-client')
    const result = await archiveClient({ clientId: validClientUuid })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CLIENT_ALREADY_ARCHIVED')
  })

  it('should return CLIENT_DELETED if client has been deleted', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'deleted', operator_id: validOperatorUuid },
      error: null,
    })

    const { archiveClient } = await import('./archive-client')
    const result = await archiveClient({ clientId: validClientUuid })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CLIENT_DELETED')
  })

  it('should successfully archive an active client with default 90 days retention', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'active', operator_id: validOperatorUuid },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { archiveClient } = await import('./archive-client')
    const result: ActionResponse<{ success: true }> = await archiveClient({ clientId: validClientUuid })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
  })

  it('should set status=archived, archived_at, retention_until, and previous_status', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'active', operator_id: validOperatorUuid },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { archiveClient } = await import('./archive-client')
    await archiveClient({ clientId: validClientUuid, retentionDays: 90 })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'archived',
        archived_at: expect.any(String),
        retention_until: expect.any(String),
        previous_status: 'active',
      })
    )
  })

  it('should use custom retentionDays (30) for retention_until calculation', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'active', operator_id: validOperatorUuid },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const before = new Date()
    const { archiveClient } = await import('./archive-client')
    await archiveClient({ clientId: validClientUuid, retentionDays: 30 })

    const updateCall = mockUpdate.mock.calls[0][0]
    const retentionUntil = new Date(updateCall.retention_until)
    const diffDays = Math.round((retentionUntil.getTime() - before.getTime()) / (1000 * 60 * 60 * 24))

    expect(diffDays).toBeGreaterThanOrEqual(29)
    expect(diffDays).toBeLessThanOrEqual(31)
  })

  it('should log activity_logs with type client_archived', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'active', operator_id: validOperatorUuid },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { archiveClient } = await import('./archive-client')
    await archiveClient({ clientId: validClientUuid })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client_archived',
        entity_id: validClientUuid,
      })
    )
  })

  it('should store retentionDays and retentionUntil in activity log metadata', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'active', operator_id: validOperatorUuid },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { archiveClient } = await import('./archive-client')
    await archiveClient({ clientId: validClientUuid, retentionDays: 45 })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          retentionDays: 45,
          retentionUntil: expect.any(String),
        }),
      })
    )
  })

  it('should return DATABASE_ERROR when update fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'active', operator_id: validOperatorUuid },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({
      error: { message: 'Database error', code: '500' },
    })

    const { archiveClient } = await import('./archive-client')
    const result = await archiveClient({ clientId: validClientUuid })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should also work for suspended clients', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'suspended', operator_id: validOperatorUuid },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { archiveClient } = await import('./archive-client')
    const result = await archiveClient({ clientId: validClientUuid })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        previous_status: 'suspended',
      })
    )
  })
})
