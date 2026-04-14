import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()

const mockOrder = vi.fn()
const mockIs = vi.fn(() => ({ order: mockOrder }))
const mockEq = vi.fn(() => ({ is: mockIs }))
const mockSelectAll = vi.fn(() => ({ eq: mockEq }))

const mockFrom = vi.fn(() => ({
  select: mockSelectAll,
}))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

describe('getDocuments Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { getDocuments } = await import('./get-documents')
    const result = await getDocuments({ clientId: CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const { getDocuments } = await import('./get-documents')
    const result = await getDocuments({ clientId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns documents in camelCase on success', async () => {
    const fixedDate = '2026-02-18T10:00:00.000Z'
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'doc-1',
          client_id: CLIENT_ID,
          operator_id: 'op-id',
          name: 'rapport.pdf',
          file_path: 'op-id/client-id/uuid-rapport.pdf',
          file_type: 'pdf',
          file_size: 1024,
          folder_id: null,
          tags: [],
          visibility: 'private',
          uploaded_by: 'operator',
          created_at: fixedDate,
          updated_at: fixedDate,
          last_synced_at: null,
          deleted_at: null,
        },
      ],
      error: null,
    })

    const { getDocuments } = await import('./get-documents')
    const result = await getDocuments({ clientId: CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].name).toBe('rapport.pdf')
    expect(result.data?.[0].clientId).toBe(CLIENT_ID)
    expect(result.data?.[0].fileType).toBe('pdf')
  })

  it('returns empty array when no documents', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    const { getDocuments } = await import('./get-documents')
    const result = await getDocuments({ clientId: CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('returns DB_ERROR when query fails', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { getDocuments } = await import('./get-documents')
    const result = await getDocuments({ clientId: CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
