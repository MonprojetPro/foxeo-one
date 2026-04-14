import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockLimit = vi.fn()
const mockOrder = vi.fn(() => ({ limit: mockLimit }))
const mockEqType = vi.fn(() => ({ order: mockOrder }))
const mockEqStatus = vi.fn(() => ({ eq: mockEqType, order: mockOrder }))
const mockEqOperator = vi.fn(() => ({ eq: mockEqStatus, order: mockOrder }))
const mockSelect = vi.fn(() => ({ eq: mockEqOperator }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockSingle = vi.fn()
const mockEqOperatorLookup = vi.fn(() => ({ single: mockSingle }))
const mockSelectOperator = vi.fn(() => ({ eq: mockEqOperatorLookup }))
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'operators') {
        return { select: mockSelectOperator }
      }
      return { select: mockSelect }
    },
    auth: { getUser: mockGetUser },
  })),
}))

describe('getValidationRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  const mockUserId = '550e8400-e29b-41d4-a716-446655440001'
  const mockOperatorId = 'op-123'

  function setupAuth(authenticated = true) {
    if (authenticated) {
      mockGetUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      })
      mockSingle.mockResolvedValue({
        data: { id: mockOperatorId },
        error: null,
      })
    } else {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })
    }
  }

  it('should return UNAUTHORIZED when not authenticated', async () => {
    setupAuth(false)

    const { getValidationRequests } = await import('./get-validation-requests')
    const result = await getValidationRequests()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when operator not found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })

    const { getValidationRequests } = await import('./get-validation-requests')
    const result = await getValidationRequests()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return DATABASE_ERROR on Supabase query failure', async () => {
    setupAuth()
    mockLimit.mockResolvedValue({
      data: null,
      error: { message: 'Query failed' },
    })

    const { getValidationRequests } = await import('./get-validation-requests')
    const result = await getValidationRequests()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should return empty array when no data', async () => {
    setupAuth()
    mockLimit.mockResolvedValue({ data: null, error: null })

    const { getValidationRequests } = await import('./get-validation-requests')
    const result = await getValidationRequests()

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('should transform rows to camelCase', async () => {
    setupAuth()
    mockLimit.mockResolvedValue({
      data: [
        {
          id: 'req-1',
          client_id: 'c-1',
          operator_id: mockOperatorId,
          parcours_id: null,
          step_id: null,
          type: 'brief_lab',
          title: 'Mon brief',
          content: 'Contenu',
          document_ids: ['doc-1'],
          status: 'pending',
          reviewer_comment: null,
          submitted_at: '2026-02-20T10:00:00Z',
          reviewed_at: null,
          created_at: '2026-02-20T10:00:00Z',
          updated_at: '2026-02-20T10:00:00Z',
          clients: {
            id: 'c-1',
            name: 'Jean Dupont',
            company: 'Acme',
            client_type: 'complet',
            avatar_url: null,
          },
        },
      ],
      error: null,
    })

    const { getValidationRequests } = await import('./get-validation-requests')
    const result = await getValidationRequests()

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    const req = result.data![0]
    expect(req.clientId).toBe('c-1')
    expect(req.operatorId).toBe(mockOperatorId)
    expect(req.type).toBe('brief_lab')
    expect(req.status).toBe('pending')
    expect(req.submittedAt).toBe('2026-02-20T10:00:00Z')
    expect(req.documentIds).toEqual(['doc-1'])
    expect(req.client?.name).toBe('Jean Dupont')
    expect(req.client?.company).toBe('Acme')
    expect(req.client?.clientType).toBe('complet')
    expect(req.client?.avatarUrl).toBeNull()
  })

  it('should handle row without client join data', async () => {
    setupAuth()
    mockLimit.mockResolvedValue({
      data: [
        {
          id: 'req-2',
          client_id: 'c-2',
          operator_id: mockOperatorId,
          parcours_id: null,
          step_id: null,
          type: 'evolution_one',
          title: 'Évolution',
          content: 'Contenu',
          document_ids: [],
          status: 'approved',
          reviewer_comment: 'OK',
          submitted_at: '2026-02-21T10:00:00Z',
          reviewed_at: '2026-02-21T12:00:00Z',
          created_at: '2026-02-21T10:00:00Z',
          updated_at: '2026-02-21T12:00:00Z',
          clients: null,
        },
      ],
      error: null,
    })

    const { getValidationRequests } = await import('./get-validation-requests')
    const result = await getValidationRequests()

    expect(result.error).toBeNull()
    expect(result.data![0].client).toBeUndefined()
  })

  it('should always return { data, error } format', async () => {
    setupAuth(false)

    const { getValidationRequests } = await import('./get-validation-requests')
    const result = await getValidationRequests()

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
