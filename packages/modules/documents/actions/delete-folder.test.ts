import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()

// Track which table is being queried
let currentTable = ''

const mockDeleteEq = vi.fn()
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))

const mockCountEq = vi.fn()
const mockCountSelect = vi.fn(() => ({ eq: mockCountEq }))

const mockFetchSingle = vi.fn()
const mockFetchEq = vi.fn(() => ({ single: mockFetchSingle }))
const mockFetchSelect = vi.fn(() => ({ eq: mockFetchEq }))

const mockFrom = vi.fn((table: string) => {
  currentTable = table
  if (table === 'document_folders') {
    return {
      select: mockFetchSelect,
      delete: mockDelete,
    }
  }
  // documents table — for count check
  return {
    select: mockCountSelect,
  }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const UUID = '00000000-0000-0000-0000-000000000001'

describe('deleteFolder Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    // Default: folder exists
    mockFetchSingle.mockResolvedValue({ data: { id: UUID }, error: null })
    // Default: folder is empty
    mockCountEq.mockResolvedValue({ count: 0, error: null })
    // Default: delete succeeds
    mockDeleteEq.mockResolvedValue({ error: null })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { deleteFolder } = await import('./delete-folder')
    const result = await deleteFolder({ folderId: UUID })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid folderId', async () => {
    const { deleteFolder } = await import('./delete-folder')
    const result = await deleteFolder({ folderId: 'bad-id' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when folder does not exist', async () => {
    mockFetchSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    const { deleteFolder } = await import('./delete-folder')
    const result = await deleteFolder({ folderId: UUID })
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns FOLDER_NOT_EMPTY when folder has documents', async () => {
    mockCountEq.mockResolvedValue({ count: 3, error: null })
    const { deleteFolder } = await import('./delete-folder')
    const result = await deleteFolder({ folderId: UUID })
    expect(result.error?.code).toBe('FOLDER_NOT_EMPTY')
  })

  it('returns success when folder is empty and deleted', async () => {
    const { deleteFolder } = await import('./delete-folder')
    const result = await deleteFolder({ folderId: UUID })
    expect(result.error).toBeNull()
    expect(result.data).toBeUndefined()
  })
})
