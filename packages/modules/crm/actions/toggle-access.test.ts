import { describe, it, expect, vi, beforeEach } from 'vitest'

const testOperatorId = '550e8400-e29b-41d4-a716-446655440000'
const testOperatorDbId = '550e8400-e29b-41d4-a716-446655440010'
const testClientId = '550e8400-e29b-41d4-a716-446655440001'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase
const mockOperatorSingle = vi.fn()
const mockConfigSingle = vi.fn()
const mockUpdateEq = vi.fn()
const mockParcoursUpdateSelect = vi.fn()
const mockParcoursUpdateEqStatus = vi.fn(() => ({ select: mockParcoursUpdateSelect }))
const mockParcoursUpdateEqClient = vi.fn(() => ({ eq: mockParcoursUpdateEqStatus }))
const mockParcoursUpdate = vi.fn(() => ({ eq: mockParcoursUpdateEqClient }))
const mockActivityInsert = vi.fn().mockResolvedValue({ error: null })

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockOperatorSingle })),
      })),
    }
  }
  if (table === 'client_configs') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockConfigSingle })),
      })),
      update: vi.fn(() => ({
        eq: mockUpdateEq,
      })),
    }
  }
  if (table === 'parcours') {
    return { update: mockParcoursUpdate }
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

describe('toggleAccess Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not auth' },
    })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'lab',
      enabled: true,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return VALIDATION_ERROR for invalid accessType', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'invalid' as 'lab',
      enabled: true,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return NOT_FOUND when operator not found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockOperatorSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'lab',
      enabled: true,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should toggle lab access and return result', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockOperatorSingle.mockResolvedValue({
      data: { id: testOperatorDbId },
      error: null,
    })

    mockConfigSingle.mockResolvedValue({
      data: { dashboard_type: 'one' },
      error: null,
    })

    mockUpdateEq.mockResolvedValue({ error: null })
    mockParcoursUpdateSelect.mockResolvedValue({ data: [], error: null })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'lab',
      enabled: true,
    })

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.accessType).toBe('lab')
    expect(result.data?.enabled).toBe(true)
    expect(result.data?.dashboardType).toBe('lab')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Error' },
    })

    const { toggleAccess } = await import('./toggle-access')
    const result = await toggleAccess({
      clientId: testClientId,
      accessType: 'lab',
      enabled: true,
    })

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
