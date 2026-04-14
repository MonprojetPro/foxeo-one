import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockEq = vi.fn(() => ({ select: mockSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ update: mockUpdate }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const UUID = '00000000-0000-0000-0000-000000000001'

describe('renameFolder Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { renameFolder } = await import('./rename-folder')
    const result = await renameFolder({ folderId: UUID, name: 'Nouveau' })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for empty name', async () => {
    const { renameFolder } = await import('./rename-folder')
    const result = await renameFolder({ folderId: UUID, name: '' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for invalid folderId', async () => {
    const { renameFolder } = await import('./rename-folder')
    const result = await renameFolder({ folderId: 'bad-id', name: 'Nom' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when folder does not exist', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    const { renameFolder } = await import('./rename-folder')
    const result = await renameFolder({ folderId: UUID, name: 'Nouveau' })
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns updated folder in camelCase on success', async () => {
    const fixedDate = '2026-02-20T10:00:00.000Z'
    mockSingle.mockResolvedValue({
      data: {
        id: UUID,
        client_id: UUID,
        operator_id: UUID,
        name: 'Nouveau nom',
        parent_id: null,
        created_at: fixedDate,
      },
      error: null,
    })
    const { renameFolder } = await import('./rename-folder')
    const result = await renameFolder({ folderId: UUID, name: 'Nouveau nom' })
    expect(result.error).toBeNull()
    expect(result.data?.name).toBe('Nouveau nom')
  })
})
