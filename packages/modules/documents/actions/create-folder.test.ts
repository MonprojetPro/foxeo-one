import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelect }))
const mockFrom = vi.fn(() => ({ insert: mockInsert }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const UUID = '00000000-0000-0000-0000-000000000001'

describe('createFolder Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { createFolder } = await import('./create-folder')
    const result = await createFolder({ clientId: UUID, operatorId: UUID, name: 'Test', parentId: null })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for empty name', async () => {
    const { createFolder } = await import('./create-folder')
    const result = await createFolder({ clientId: UUID, operatorId: UUID, name: '', parentId: null })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for invalid UUID', async () => {
    const { createFolder } = await import('./create-folder')
    const result = await createFolder({ clientId: 'bad', operatorId: UUID, name: 'Test', parentId: null })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns folder in camelCase on success', async () => {
    const fixedDate = '2026-02-20T10:00:00.000Z'
    mockSingle.mockResolvedValue({
      data: {
        id: 'folder-new',
        client_id: UUID,
        operator_id: UUID,
        name: 'Contrats',
        parent_id: null,
        created_at: fixedDate,
      },
      error: null,
    })
    const { createFolder } = await import('./create-folder')
    const result = await createFolder({ clientId: UUID, operatorId: UUID, name: 'Contrats', parentId: null })
    expect(result.error).toBeNull()
    expect(result.data?.name).toBe('Contrats')
    expect(result.data?.clientId).toBe(UUID)
  })

  it('returns DB_ERROR on insert failure', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB fail' } })
    const { createFolder } = await import('./create-folder')
    const result = await createFolder({ clientId: UUID, operatorId: UUID, name: 'Test', parentId: null })
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
