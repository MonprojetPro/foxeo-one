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

describe('suspendClient Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
  })

  it('should return INVALID_INPUT for non-UUID clientId', async () => {
    const { suspendClient } = await import('./suspend-client')
    const result = await suspendClient({ clientId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { suspendClient } = await import('./suspend-client')
    const result = await suspendClient({
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

    const { suspendClient } = await import('./suspend-client')
    const result = await suspendClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should return ALREADY_SUSPENDED if client is already suspended', async () => {
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

    const { suspendClient } = await import('./suspend-client')
    const result = await suspendClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('ALREADY_SUSPENDED')
  })

  it('should return INVALID_STATUS if client is not active', async () => {
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

    const { suspendClient } = await import('./suspend-client')
    const result = await suspendClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_STATUS')
  })

  it('should successfully suspend an active client', async () => {
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

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { suspendClient } = await import('./suspend-client')
    const result: ActionResponse<{ success: true }> = await suspendClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      reason: 'Client requested pause',
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalled()
  })

  it('should log activity with reason metadata', async () => {
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

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { suspendClient } = await import('./suspend-client')
    await suspendClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      reason: 'Non-payment',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client_suspended',
        metadata: { reason: 'Non-payment' },
      })
    )
  })

  it('should handle optional reason field', async () => {
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

    mockUpdateEqSecond.mockReturnValue({ error: null })

    const { suspendClient } = await import('./suspend-client')
    const result = await suspendClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
  })

  it('should return DATABASE_ERROR when update fails', async () => {
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

    mockUpdateEqSecond.mockReturnValue({
      error: { message: 'Database error', code: '500' },
    })

    const { suspendClient } = await import('./suspend-client')
    const result = await suspendClient({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
