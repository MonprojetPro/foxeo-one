import { describe, it, expect, vi, beforeEach } from 'vitest'

const testOperatorId = '550e8400-e29b-41d4-a716-446655440000'
const testOperatorDbId = '550e8400-e29b-41d4-a716-446655440010'
const testClientId = '550e8400-e29b-41d4-a716-446655440001'
const testTemplateId = '550e8400-e29b-41d4-a716-446655440002'
const testParcoursId = '550e8400-e29b-41d4-a716-446655440003'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase
const mockInsertSingle = vi.fn()
const mockSelectAfterInsert = vi.fn(() => ({ single: mockInsertSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelectAfterInsert }))
const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
const mockOperatorSingle = vi.fn()
const mockOperatorEq = vi.fn(() => ({ single: mockOperatorSingle }))
const mockOperatorSelect = vi.fn(() => ({ eq: mockOperatorEq }))
const mockActivityInsert = vi.fn().mockResolvedValue({ error: null })

// Duplicate check mock chain: parcours select → eq(client_id) → eq(status) → limit → maybeSingle
const mockDuplicateMaybeSingle = vi.fn()
const mockDuplicateLimit = vi.fn(() => ({ maybeSingle: mockDuplicateMaybeSingle }))
const mockDuplicateEqStatus = vi.fn(() => ({ limit: mockDuplicateLimit }))
const mockDuplicateEqClient = vi.fn(() => ({ eq: mockDuplicateEqStatus }))
const mockDuplicateSelect = vi.fn(() => ({ eq: mockDuplicateEqClient }))

// Template name fetch mock chain: parcours_templates select → eq(id) → single
const mockTemplateSingle = vi.fn()
const mockTemplateEq = vi.fn(() => ({ single: mockTemplateSingle }))
const mockTemplateSelect = vi.fn(() => ({ eq: mockTemplateEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return { select: mockOperatorSelect }
  }
  if (table === 'parcours') {
    // First call is duplicate check (select), subsequent might be insert
    return { select: mockDuplicateSelect, insert: mockInsert }
  }
  if (table === 'parcours_templates') {
    return { select: mockTemplateSelect }
  }
  if (table === 'client_configs') {
    return { update: mockUpdate }
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

describe('assignParcours Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Default: no duplicate parcours, template found
    mockDuplicateMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockTemplateSingle.mockResolvedValue({ data: { name: 'Parcours Complet' }, error: null })
  })

  it('should return UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not auth' },
    })

    const { assignParcours } = await import('./assign-parcours')
    const result = await assignParcours({
      clientId: testClientId,
      templateId: testTemplateId,
      activeStages: [{ key: 'vision', active: true }],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return VALIDATION_ERROR for invalid input', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    const { assignParcours } = await import('./assign-parcours')
    const result = await assignParcours({
      clientId: 'not-a-uuid',
      templateId: testTemplateId,
      activeStages: [],
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

    const { assignParcours } = await import('./assign-parcours')
    const result = await assignParcours({
      clientId: testClientId,
      templateId: testTemplateId,
      activeStages: [{ key: 'vision', active: true }],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return DUPLICATE_PARCOURS when client already has an active parcours', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockOperatorSingle.mockResolvedValue({
      data: { id: testOperatorDbId },
      error: null,
    })

    // Simulate existing active parcours
    mockDuplicateMaybeSingle.mockResolvedValue({
      data: { id: 'existing-parcours-id' },
      error: null,
    })

    const { assignParcours } = await import('./assign-parcours')
    const result = await assignParcours({
      clientId: testClientId,
      templateId: testTemplateId,
      activeStages: [{ key: 'vision', active: true }],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DUPLICATE_PARCOURS')
  })

  it('should create parcours and update client config on valid input', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockOperatorSingle.mockResolvedValue({
      data: { id: testOperatorDbId },
      error: null,
    })

    const now = new Date().toISOString()
    mockInsertSingle.mockResolvedValue({
      data: {
        id: testParcoursId,
        client_id: testClientId,
        template_id: testTemplateId,
        operator_id: testOperatorDbId,
        active_stages: [
          { key: 'vision', active: true, status: 'pending' },
          { key: 'offre', active: false, status: 'skipped' },
        ],
        status: 'en_cours',
        started_at: now,
        suspended_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      },
      error: null,
    })

    const { assignParcours } = await import('./assign-parcours')
    const result = await assignParcours({
      clientId: testClientId,
      templateId: testTemplateId,
      activeStages: [
        { key: 'vision', active: true },
        { key: 'offre', active: false },
      ],
    })

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.id).toBe(testParcoursId)
    expect(result.data?.status).toBe('en_cours')
    expect(result.data?.activeStages).toHaveLength(2)
    // Verify camelCase
    expect(result.data).toHaveProperty('clientId')
    expect(result.data).toHaveProperty('templateId')
    expect(result.data).not.toHaveProperty('client_id')
  })

  it('should return DATABASE_ERROR when insert fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockOperatorSingle.mockResolvedValue({
      data: { id: testOperatorDbId },
      error: null,
    })

    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    })

    const { assignParcours } = await import('./assign-parcours')
    const result = await assignParcours({
      clientId: testClientId,
      templateId: testTemplateId,
      activeStages: [{ key: 'vision', active: true }],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Error' },
    })

    const { assignParcours } = await import('./assign-parcours')
    const result = await assignParcours({
      clientId: testClientId,
      templateId: testTemplateId,
      activeStages: [],
    })

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
