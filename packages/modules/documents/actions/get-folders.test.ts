import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockOrder = vi.fn()
const mockEq = vi.fn(() => ({ order: mockOrder }))
const mockSelectAll = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelectAll }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

describe('getFolders Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })
    const { getFolders } = await import('./get-folders')
    const result = await getFolders({ clientId: CLIENT_ID })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const { getFolders } = await import('./get-folders')
    const result = await getFolders({ clientId: 'bad-uuid' })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns folders in camelCase on success', async () => {
    const fixedDate = '2026-02-20T10:00:00.000Z'
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'folder-1',
          client_id: CLIENT_ID,
          operator_id: 'op-id',
          name: 'Contrats',
          parent_id: null,
          created_at: fixedDate,
        },
      ],
      error: null,
    })
    const { getFolders } = await import('./get-folders')
    const result = await getFolders({ clientId: CLIENT_ID })
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].name).toBe('Contrats')
    expect(result.data?.[0].clientId).toBe(CLIENT_ID)
    expect(result.data?.[0].parentId).toBeNull()
  })

  it('returns empty array when no folders', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    const { getFolders } = await import('./get-folders')
    const result = await getFolders({ clientId: CLIENT_ID })
    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('returns DB_ERROR when query fails', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB fail' } })
    const { getFolders } = await import('./get-folders')
    const result = await getFolders({ clientId: CLIENT_ID })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
