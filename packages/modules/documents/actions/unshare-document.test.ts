import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()

const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

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
  visibility: 'private',
  uploaded_by: 'operator',
  created_at: FIXED_DATE,
  updated_at: FIXED_DATE,
}

describe('unshareDocument Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockOperatorSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    mockUpdateSingle.mockResolvedValue({ data: MOCK_DOC_DB, error: null })
  })

  it('returns VALIDATION_ERROR for invalid documentId (not UUID)', async () => {
    const { unshareDocument } = await import('./unshare-document')
    const result = await unshareDocument('not-a-uuid')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const { unshareDocument } = await import('./unshare-document')
    const result = await unshareDocument(DOC_ID)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when user is not an operator', async () => {
    mockOperatorSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const { unshareDocument } = await import('./unshare-document')
    const result = await unshareDocument(DOC_ID)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('returns NOT_FOUND when document update fails', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const { unshareDocument } = await import('./unshare-document')
    const result = await unshareDocument(DOC_ID)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns success with private document', async () => {
    const { unshareDocument } = await import('./unshare-document')
    const result = await unshareDocument(DOC_ID)
    expect(result.error).toBeNull()
    expect(result.data?.id).toBe(DOC_ID)
    expect(result.data?.visibility).toBe('private')
  })

  it('is idempotent — succeeds even if already private', async () => {
    mockUpdateSingle.mockResolvedValue({ data: { ...MOCK_DOC_DB, visibility: 'private' }, error: null })
    const { unshareDocument } = await import('./unshare-document')
    const result = await unshareDocument(DOC_ID)
    expect(result.error).toBeNull()
    expect(result.data?.visibility).toBe('private')
  })

  it('returns NOT_FOUND on DB error', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const { unshareDocument } = await import('./unshare-document')
    const result = await unshareDocument(DOC_ID)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
