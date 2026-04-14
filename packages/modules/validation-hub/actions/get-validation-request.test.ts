import { describe, it, expect, vi, beforeEach } from 'vitest'

// We track which table each from() call targets
const mockGetUser = vi.fn()
const mockOperatorSingle = vi.fn()
const mockRequestSingle = vi.fn()
const mockParcoursRowSingle = vi.fn()
const mockStepsResult = vi.fn()
const mockDocsResult = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: mockOperatorSingle })),
          })),
        }
      }
      if (table === 'validation_requests') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ single: mockRequestSingle })),
            })),
          })),
        }
      }
      if (table === 'parcours') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: mockParcoursRowSingle })),
          })),
        }
      }
      if (table === 'parcours_steps') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => mockStepsResult()),
            })),
          })),
        }
      }
      if (table === 'documents') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => mockDocsResult()),
          })),
        }
      }
      return { select: vi.fn() }
    },
  })),
}))

const mockUserId = 'user-1'
const mockOperatorId = 'op-1'

function setupAuth(authenticated = true) {
  if (authenticated) {
    mockGetUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    })
    mockOperatorSingle.mockResolvedValue({
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

const mockRequestRow = {
  id: 'req-1',
  client_id: 'c-1',
  operator_id: mockOperatorId,
  parcours_id: null,
  step_id: null,
  type: 'brief_lab',
  title: 'Mon brief',
  content: 'Contenu du brief',
  document_ids: [],
  status: 'pending',
  reviewer_comment: null,
  submitted_at: '2026-02-20T10:00:00Z',
  reviewed_at: null,
  created_at: '2026-02-20T10:00:00Z',
  updated_at: '2026-02-20T10:00:00Z',
  clients: {
    id: 'c-1',
    name: 'Jean Dupont',
    company: 'Acme Corp',
    client_type: 'complet',
    avatar_url: null,
  },
}

describe('getValidationRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return UNAUTHORIZED when not authenticated', async () => {
    setupAuth(false)
    const { getValidationRequest } = await import('./get-validation-request')
    const result = await getValidationRequest('req-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when operator not found', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    })
    mockOperatorSingle.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })
    const { getValidationRequest } = await import('./get-validation-request')
    const result = await getValidationRequest('req-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return NOT_FOUND when request not found', async () => {
    setupAuth()
    mockRequestSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    })
    const { getValidationRequest } = await import('./get-validation-request')
    const result = await getValidationRequest('req-999')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return request without parcours when parcours_id is null', async () => {
    setupAuth()
    mockRequestSingle.mockResolvedValue({ data: mockRequestRow, error: null })

    const { getValidationRequest } = await import('./get-validation-request')
    const result = await getValidationRequest('req-1')

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.id).toBe('req-1')
    expect(result.data?.parcours).toBeUndefined()
    expect(result.data?.documents).toEqual([])
    expect(result.data?.client.name).toBe('Jean Dupont')
    expect(result.data?.client.clientType).toBe('complet')
  })

  it('should transform snake_case to camelCase', async () => {
    setupAuth()
    mockRequestSingle.mockResolvedValue({ data: mockRequestRow, error: null })

    const { getValidationRequest } = await import('./get-validation-request')
    const result = await getValidationRequest('req-1')

    expect(result.data?.clientId).toBe('c-1')
    expect(result.data?.operatorId).toBe(mockOperatorId)
    expect(result.data?.parcoursId).toBeNull()
    expect(result.data?.submittedAt).toBe('2026-02-20T10:00:00Z')
    expect(result.data?.documentIds).toEqual([])
  })

  it('should fetch documents when document_ids is not empty', async () => {
    setupAuth()
    const rowWithDocs = {
      ...mockRequestRow,
      document_ids: ['doc-1'],
    }
    mockRequestSingle.mockResolvedValue({ data: rowWithDocs, error: null })
    mockDocsResult.mockResolvedValue({
      data: [
        {
          id: 'doc-1',
          name: 'spec.pdf',
          file_type: 'application/pdf',
          file_size: 1024,
          file_path: 'op-1/c-1/spec.pdf',
        },
      ],
      error: null,
    })

    const { getValidationRequest } = await import('./get-validation-request')
    const result = await getValidationRequest('req-1')

    expect(result.error).toBeNull()
    expect(result.data?.documents).toHaveLength(1)
    expect(result.data?.documents[0].name).toBe('spec.pdf')
    expect(result.data?.documents[0].fileType).toBe('application/pdf')
    expect(result.data?.documents[0].fileSize).toBe(1024)
  })

  it('should always return { data, error } format', async () => {
    setupAuth(false)
    const { getValidationRequest } = await import('./get-validation-request')
    const result = await getValidationRequest('req-1')
    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
