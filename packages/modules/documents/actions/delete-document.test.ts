import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()

// Update chain (for soft delete)
const mockUpdateEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockFrom = vi.fn(() => ({
  update: mockUpdate,
}))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const DOC_ID = '00000000-0000-0000-0000-000000000099'

describe('deleteDocument Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockUpdateEq.mockResolvedValue({ error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { deleteDocument } = await import('./delete-document')
    const result = await deleteDocument({ documentId: DOC_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid documentId', async () => {
    const { deleteDocument } = await import('./delete-document')
    const result = await deleteDocument({ documentId: 'not-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('soft deletes document by setting deleted_at timestamp', async () => {
    const { deleteDocument } = await import('./delete-document')
    const result = await deleteDocument({ documentId: DOC_ID })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ id: DOC_ID })
    // Should call update with deleted_at timestamp
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      deleted_at: expect.any(String),
    }))
    expect(mockUpdateEq).toHaveBeenCalledWith('id', DOC_ID)
  })

  it('returns DB_ERROR when soft delete update fails', async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: 'DB error' } })

    const { deleteDocument } = await import('./delete-document')
    const result = await deleteDocument({ documentId: DOC_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
