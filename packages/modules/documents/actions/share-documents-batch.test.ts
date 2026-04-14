import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()

const mockUpdateSelect = vi.fn()
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdateIn = vi.fn(() => ({ eq: mockUpdateEq }))
const mockUpdate = vi.fn(() => ({ in: mockUpdateIn }))

const mockOperatorSingle = vi.fn()
const mockOperatorEq = vi.fn(() => ({ single: mockOperatorSingle }))
const mockOperatorSelect = vi.fn(() => ({ eq: mockOperatorEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOperatorSelect }
  return { update: mockUpdate }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const DOC_ID_1 = '00000000-0000-0000-0000-000000000001'
const DOC_ID_2 = '00000000-0000-0000-0000-000000000002'
const CLIENT_ID = '00000000-0000-0000-0000-000000000003'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000004'

describe('shareDocumentsBatch Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockOperatorSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    mockUpdateSelect.mockResolvedValue({
      data: [{ id: DOC_ID_1 }, { id: DOC_ID_2 }],
      error: null,
    })
  })

  it('returns VALIDATION_ERROR for empty documentIds array', async () => {
    const { shareDocumentsBatch } = await import('./share-documents-batch')
    const result = await shareDocumentsBatch({ documentIds: [], clientId: CLIENT_ID })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const { shareDocumentsBatch } = await import('./share-documents-batch')
    const result = await shareDocumentsBatch({ documentIds: [DOC_ID_1], clientId: CLIENT_ID })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when user is not an operator', async () => {
    mockOperatorSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const { shareDocumentsBatch } = await import('./share-documents-batch')
    const result = await shareDocumentsBatch({ documentIds: [DOC_ID_1], clientId: CLIENT_ID })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('returns count and documentIds on success', async () => {
    const { shareDocumentsBatch } = await import('./share-documents-batch')
    const result = await shareDocumentsBatch({ documentIds: [DOC_ID_1, DOC_ID_2], clientId: CLIENT_ID })
    expect(result.error).toBeNull()
    expect(result.data?.count).toBe(2)
    expect(result.data?.documentIds).toContain(DOC_ID_1)
    expect(result.data?.documentIds).toContain(DOC_ID_2)
  })

  it('returns DB_ERROR on update failure', async () => {
    mockUpdateSelect.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const { shareDocumentsBatch } = await import('./share-documents-batch')
    const result = await shareDocumentsBatch({ documentIds: [DOC_ID_1], clientId: CLIENT_ID })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
