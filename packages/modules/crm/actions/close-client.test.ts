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

describe('closeClient Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
  })

  it('should return INVALID_INPUT for non-UUID clientId', async () => {
    const { closeClient } = await import('./close-client')
    const result = await closeClient({
      clientId: 'not-a-uuid',
      confirmName: 'Test Client',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('should return INVALID_INPUT when confirmName is empty', async () => {
    const { closeClient } = await import('./close-client')
    const result = await closeClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      confirmName: '',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { closeClient } = await import('./close-client')
    const result = await closeClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      confirmName: 'Test Client',
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

    const { closeClient } = await import('./close-client')
    const result = await closeClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      confirmName: 'Test Client',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
    expect(result.error?.message).toContain('introuvable')
  })

  it('should return VALIDATION_ERROR when confirmName does not match client name', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Client',
        status: 'active',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    const { closeClient } = await import('./close-client')
    const result = await closeClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      confirmName: 'Wrong Name',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('ne correspond pas')
  })

  it('should match confirmName case-insensitively', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Client',
        status: 'active',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { closeClient } = await import('./close-client')
    const result = await closeClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      confirmName: 'test client', // Different case
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
  })

  it('should trim whitespace from confirmName', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Client',
        status: 'active',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { closeClient } = await import('./close-client')
    const result = await closeClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      confirmName: '  Test Client  ', // With whitespace
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
  })

  it('should return INVALID_STATUS if client is already archived', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Client',
        status: 'archived',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    const { closeClient } = await import('./close-client')
    const result = await closeClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      confirmName: 'Test Client',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_STATUS')
    expect(result.error?.message).toContain('déjà clôturé')
  })

  it('should successfully close an active client', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Client',
        status: 'active',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { closeClient } = await import('./close-client')
    const result: ActionResponse<{ success: true }> = await closeClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      confirmName: 'Test Client',
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalled()
  })

  it('should successfully close a suspended client', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Client',
        status: 'suspended',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { closeClient } = await import('./close-client')
    const result: ActionResponse<{ success: true }> = await closeClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      confirmName: 'Test Client',
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
  })

  it('should log activity with client_closed action', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Client',
        status: 'active',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { closeClient } = await import('./close-client')
    await closeClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      confirmName: 'Test Client',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client_closed',
      })
    )
  })

  it('should set archived_at timestamp and status to archived', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: validAuthUuid } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Client',
        status: 'active',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { closeClient } = await import('./close-client')
    await closeClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      confirmName: 'Test Client',
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'archived',
        archived_at: expect.any(String),
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
        name: 'Test Client',
        status: 'active',
        operator_id: validOperatorUuid,
      },
      error: null,
    })

    mockUpdateEqSecond.mockReturnValue({
      error: { message: 'Database error', code: '500' },
    })

    const { closeClient } = await import('./close-client')
    const result = await closeClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      confirmName: 'Test Client',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
