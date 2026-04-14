import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockInsert = vi.fn()

// Chained mock for update().eq().select().single()
const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

// Chained mock for from('operators').select().eq('auth_user_id', ...).single()
const mockOperatorSingle = vi.fn()
const mockOperatorEq = vi.fn(() => ({ single: mockOperatorSingle }))
const mockOperatorSelect = vi.fn(() => ({ eq: mockOperatorEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOperatorSelect }
  if (table === 'notifications') return { insert: mockInsert }
  return { update: mockUpdate }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const DOC_ID = '00000000-0000-0000-0000-000000000001'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000002'
const CLIENT_ID = '00000000-0000-0000-0000-000000000003'
const FIXED_DATE = '2026-02-19T10:00:00.000Z'

const MOCK_DOC_DB = {
  id: DOC_ID,
  client_id: CLIENT_ID,
  operator_id: OPERATOR_ID,
  name: 'rapport.pdf',
  file_path: 'op/client/rapport.pdf',
  file_type: 'pdf',
  file_size: 1024,
  folder_id: null,
  tags: [],
  visibility: 'shared',
  uploaded_by: 'operator',
  created_at: FIXED_DATE,
  updated_at: FIXED_DATE,
}

describe('shareDocument Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockOperatorSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    mockUpdateSingle.mockResolvedValue({ data: MOCK_DOC_DB, error: null })
    mockInsert.mockResolvedValue({ data: null, error: null })
  })

  it('returns VALIDATION_ERROR for invalid documentId (not UUID)', async () => {
    const { shareDocument } = await import('./share-document')
    const result = await shareDocument('not-a-uuid')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const { shareDocument } = await import('./share-document')
    const result = await shareDocument(DOC_ID)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when user is not an operator', async () => {
    mockOperatorSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const { shareDocument } = await import('./share-document')
    const result = await shareDocument(DOC_ID)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('returns NOT_FOUND when document does not exist or update fails', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const { shareDocument } = await import('./share-document')
    const result = await shareDocument(DOC_ID)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns success and document when share succeeds', async () => {
    const { shareDocument } = await import('./share-document')
    const result = await shareDocument(DOC_ID)
    expect(result.error).toBeNull()
    expect(result.data?.id).toBe(DOC_ID)
    expect(result.data?.visibility).toBe('shared')
  })

  it('inserts notification on success', async () => {
    const { shareDocument } = await import('./share-document')
    await shareDocument(DOC_ID)
    // Allow async notification insert to be called
    await new Promise(r => setTimeout(r, 0))
    expect(mockInsert).toHaveBeenCalled()
  })

  it('succeeds even if notification insert fails (fire-and-forget)', async () => {
    mockInsert.mockRejectedValue(new Error('notification error'))
    const { shareDocument } = await import('./share-document')
    const result = await shareDocument(DOC_ID)
    // Should still return success
    expect(result.error).toBeNull()
    expect(result.data?.id).toBe(DOC_ID)
  })
})
