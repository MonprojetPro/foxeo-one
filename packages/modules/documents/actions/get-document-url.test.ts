import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockCreateSignedUrl = vi.fn()

const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelectAll = vi.fn(() => ({ eq: mockEq }))

const mockFrom = vi.fn(() => ({
  select: mockSelectAll,
}))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
    storage: { from: vi.fn(() => ({ createSignedUrl: mockCreateSignedUrl })) },
  })),
}))

const DOC_ID = '00000000-0000-0000-0000-000000000001'
const FIXED_DATE = '2026-02-18T10:00:00.000Z'
const DOC_ROW = {
  id: DOC_ID,
  client_id: '00000000-0000-0000-0000-000000000002',
  operator_id: 'op-id',
  name: 'rapport.md',
  file_path: 'op-id/client-id/uuid-rapport.md',
  file_type: 'md',
  file_size: 2048,
  folder_id: null,
  tags: [],
  visibility: 'private',
  uploaded_by: 'operator',
  created_at: FIXED_DATE,
  updated_at: FIXED_DATE,
}

describe('getDocumentUrl Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { getDocumentUrl } = await import('./get-document-url')
    const result = await getDocumentUrl({ documentId: DOC_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid documentId', async () => {
    const { getDocumentUrl } = await import('./get-document-url')
    const result = await getDocumentUrl({ documentId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when document does not exist', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { getDocumentUrl } = await import('./get-document-url')
    const result = await getDocumentUrl({ documentId: DOC_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns STORAGE_ERROR when signed URL generation fails', async () => {
    mockSingle.mockResolvedValue({ data: DOC_ROW, error: null })
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'Storage error' } })

    const { getDocumentUrl } = await import('./get-document-url')
    const result = await getDocumentUrl({ documentId: DOC_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('STORAGE_ERROR')
  })

  it('returns signed URL and document on success', async () => {
    mockSingle.mockResolvedValue({ data: DOC_ROW, error: null })
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed/rapport.md?token=abc' },
      error: null,
    })

    const { getDocumentUrl } = await import('./get-document-url')
    const result = await getDocumentUrl({ documentId: DOC_ID })

    expect(result.error).toBeNull()
    expect(result.data?.url).toContain('signed')
    expect(result.data?.document.name).toBe('rapport.md')
    expect(result.data?.document.fileType).toBe('md')
    expect(result.data?.document.id).toBe(DOC_ID)
  })

  it('calls createSignedUrl with correct path and 1h expiration', async () => {
    mockSingle.mockResolvedValue({ data: DOC_ROW, error: null })
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.url' },
      error: null,
    })

    const { getDocumentUrl } = await import('./get-document-url')
    await getDocumentUrl({ documentId: DOC_ID })

    expect(mockCreateSignedUrl).toHaveBeenCalledWith(DOC_ROW.file_path, 3600)
  })
})
