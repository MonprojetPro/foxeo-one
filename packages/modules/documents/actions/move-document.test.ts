import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()

const mockUpdateSingle = vi.fn()
const mockUpdateSelectSingle = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelectSingle }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockDocSingle = vi.fn()
const mockDocSelectEq = vi.fn(() => ({ single: mockDocSingle }))
const mockDocSelect = vi.fn(() => ({ eq: mockDocSelectEq }))

const mockFolderSingle = vi.fn()
const mockFolderSelectEq = vi.fn(() => ({ single: mockFolderSingle }))
const mockFolderSelect = vi.fn(() => ({ eq: mockFolderSelectEq }))

let callCount = 0
const mockFrom = vi.fn((table: string) => {
  if (table === 'documents') {
    callCount++
    // First call = fetch existing doc, subsequent = update
    if (callCount === 1) {
      return { select: mockDocSelect }
    }
    return { update: mockUpdate }
  }
  // document_folders
  return { select: mockFolderSelect }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const UUID = '00000000-0000-0000-0000-000000000001'
const FOLDER_UUID = '00000000-0000-0000-0000-000000000002'

describe('moveDocument Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    callCount = 0
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockDocSingle.mockResolvedValue({ data: { id: UUID }, error: null })
    mockFolderSingle.mockResolvedValue({ data: { id: FOLDER_UUID }, error: null })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { moveDocument } = await import('./move-document')
    const result = await moveDocument({ documentId: UUID, folderId: FOLDER_UUID })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid documentId', async () => {
    const { moveDocument } = await import('./move-document')
    const result = await moveDocument({ documentId: 'bad', folderId: null })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when document does not exist', async () => {
    mockDocSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    const { moveDocument } = await import('./move-document')
    const result = await moveDocument({ documentId: UUID, folderId: null })
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns NOT_FOUND when target folder does not exist', async () => {
    mockFolderSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    const { moveDocument } = await import('./move-document')
    const result = await moveDocument({ documentId: UUID, folderId: FOLDER_UUID })
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('moves document to null (Non classes) without folder check', async () => {
    const fixedDate = '2026-02-20T10:00:00.000Z'
    mockUpdateSingle.mockResolvedValue({
      data: {
        id: UUID,
        client_id: UUID,
        operator_id: UUID,
        name: 'rapport.pdf',
        file_path: 'path',
        file_type: 'pdf',
        file_size: 1024,
        folder_id: null,
        tags: [],
        visibility: 'private',
        uploaded_by: 'client',
        created_at: fixedDate,
        updated_at: fixedDate,
      },
      error: null,
    })
    const { moveDocument } = await import('./move-document')
    const result = await moveDocument({ documentId: UUID, folderId: null })
    expect(result.error).toBeNull()
    expect(result.data?.folderId).toBeNull()
  })
})
