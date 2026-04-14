import { describe, it, expect, vi, beforeEach } from 'vitest'

const testOperatorId = '550e8400-e29b-41d4-a716-446655440000'
const testOperatorDbId = '550e8400-e29b-41d4-a716-446655440010'
const testParcoursId = '550e8400-e29b-41d4-a716-446655440003'
const testClientId = '550e8400-e29b-41d4-a716-446655440001'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase
const mockFetchSingle = vi.fn()
const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockOperatorSingle = vi.fn()
const mockActivityInsert = vi.fn().mockResolvedValue({ error: null })

const mockFrom = vi.fn((table: string) => {
  if (table === 'parcours') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockFetchSingle })),
      })),
      update: mockUpdate,
    }
  }
  if (table === 'operators') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockOperatorSingle })),
      })),
    }
  }
  if (table === 'activity_logs') {
    return { insert: mockActivityInsert }
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

describe('suspendParcours Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not auth' },
    })

    const { suspendParcours } = await import('./suspend-parcours')
    const result = await suspendParcours(testParcoursId, 'suspend')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return VALIDATION_ERROR when parcoursId is empty', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    const { suspendParcours } = await import('./suspend-parcours')
    const result = await suspendParcours('', 'suspend')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return VALIDATION_ERROR for invalid action', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    const { suspendParcours } = await import('./suspend-parcours')
    const result = await suspendParcours(testParcoursId, 'invalid' as 'suspend')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return NOT_FOUND when parcours does not exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { suspendParcours } = await import('./suspend-parcours')
    const result = await suspendParcours(testParcoursId, 'suspend')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return INVALID_STATE when suspending non en_cours parcours', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: { id: testParcoursId, status: 'suspendu' },
      error: null,
    })

    const { suspendParcours } = await import('./suspend-parcours')
    const result = await suspendParcours(testParcoursId, 'suspend')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_STATE')
  })

  it('should return INVALID_STATE when reactivating non suspendu parcours', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockFetchSingle.mockResolvedValue({
      data: { id: testParcoursId, status: 'en_cours' },
      error: null,
    })

    const { suspendParcours } = await import('./suspend-parcours')
    const result = await suspendParcours(testParcoursId, 'reactivate')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_STATE')
  })

  it('should suspend an en_cours parcours successfully', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    const now = new Date().toISOString()
    mockFetchSingle.mockResolvedValue({
      data: { id: testParcoursId, status: 'en_cours', client_id: testClientId },
      error: null,
    })

    mockUpdateSingle.mockResolvedValue({
      data: {
        id: testParcoursId,
        client_id: testClientId,
        template_id: null,
        operator_id: testOperatorDbId,
        active_stages: [{ key: 'vision', active: true, status: 'pending' }],
        status: 'suspendu',
        started_at: now,
        suspended_at: now,
        completed_at: null,
        created_at: now,
        updated_at: now,
      },
      error: null,
    })

    mockOperatorSingle.mockResolvedValue({
      data: { id: testOperatorDbId },
      error: null,
    })

    const { suspendParcours } = await import('./suspend-parcours')
    const result = await suspendParcours(testParcoursId, 'suspend')

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('suspendu')
    expect(result.data?.suspendedAt).not.toBeNull()
  })

  it('should reactivate a suspendu parcours successfully', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    const now = new Date().toISOString()
    mockFetchSingle.mockResolvedValue({
      data: { id: testParcoursId, status: 'suspendu', client_id: testClientId },
      error: null,
    })

    mockUpdateSingle.mockResolvedValue({
      data: {
        id: testParcoursId,
        client_id: testClientId,
        template_id: null,
        operator_id: testOperatorDbId,
        active_stages: [{ key: 'vision', active: true, status: 'pending' }],
        status: 'en_cours',
        started_at: now,
        suspended_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      },
      error: null,
    })

    mockOperatorSingle.mockResolvedValue({
      data: { id: testOperatorDbId },
      error: null,
    })

    const { suspendParcours } = await import('./suspend-parcours')
    const result = await suspendParcours(testParcoursId, 'reactivate')

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('en_cours')
    expect(result.data?.suspendedAt).toBeNull()
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Error' },
    })

    const { suspendParcours } = await import('./suspend-parcours')
    const result = await suspendParcours(testParcoursId, 'suspend')

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
