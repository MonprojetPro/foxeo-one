import { describe, it, expect, vi, beforeEach } from 'vitest'

const testClientId = '550e8400-e29b-41d4-a716-446655440001'
const testOperatorId = '550e8400-e29b-41d4-a716-446655440000'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase
const mockMaybeSingle = vi.fn()
const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockOrder = vi.fn(() => ({ limit: mockLimit }))
const mockIn = vi.fn(() => ({ order: mockOrder }))
const mockEq = vi.fn(() => ({ in: mockIn }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('getClientParcours Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return INVALID_INPUT for invalid clientId', async () => {
    const { getClientParcours } = await import('./get-client-parcours')
    const result = await getClientParcours('not-a-uuid')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('should return INVALID_INPUT for empty clientId', async () => {
    const { getClientParcours } = await import('./get-client-parcours')
    const result = await getClientParcours('')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { getClientParcours } = await import('./get-client-parcours')
    const result = await getClientParcours(testClientId)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return null when no parcours exists', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { getClientParcours } = await import('./get-client-parcours')
    const result = await getClientParcours(testClientId)

    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
  })

  it('should return parcours with camelCase transformation', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    const now = new Date().toISOString()
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440003',
        client_id: testClientId,
        template_id: '550e8400-e29b-41d4-a716-446655440002',
        operator_id: testOperatorId,
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

    const { getClientParcours } = await import('./get-client-parcours')
    const result = await getClientParcours(testClientId)

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.clientId).toBe(testClientId)
    expect(result.data?.status).toBe('en_cours')
    expect(result.data?.activeStages).toHaveLength(1)
    expect(result.data).not.toHaveProperty('client_id')
  })

  it('should return DATABASE_ERROR on Supabase failure', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Query failed', code: 'PGRST301' },
    })

    const { getClientParcours } = await import('./get-client-parcours')
    const result = await getClientParcours(testClientId)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Error' },
    })

    const { getClientParcours } = await import('./get-client-parcours')
    const result = await getClientParcours(testClientId)

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
