import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteToolPost } from './delete-tool-post'

// ── Mocks ──────────────────────────────────────────────────────────────────────
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockStorage = { from: vi.fn() }

vi.mock('@monprojetpro/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: mockStorage,
  })),
}))

// ── Helpers ────────────────────────────────────────────────────────────────────
const AUTH_USER_ID = 'auth-op-uuid'
const OPERATOR_ID = 'op-uuid-db'

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('deleteToolPost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne MISSING_POST_ID si postId absent', async () => {
    const result = await deleteToolPost('')
    expect(result.error?.code).toBe('MISSING_POST_ID')
  })

  it('retourne AUTH_REQUIRED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const result = await deleteToolPost('p-uuid')
    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('retourne FORBIDDEN si l\'utilisateur n\'est pas dans la table operators', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })

    const opSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const opEq = vi.fn().mockReturnValue({ single: opSingle })
    const opSelect = vi.fn().mockReturnValue({ eq: opEq })
    mockFrom.mockReturnValue({ select: opSelect })

    const result = await deleteToolPost('p-uuid')
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('retourne NOT_FOUND si le post n\'existe pas', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })

    const opSingle = vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    const opEq = vi.fn().mockReturnValue({ single: opSingle })
    const opSelect = vi.fn().mockReturnValue({ eq: opEq })

    const postSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const postEq = vi.fn().mockReturnValue({ single: postSingle })
    const postSelect = vi.fn().mockReturnValue({ eq: postEq })

    mockFrom
      .mockImplementationOnce(() => ({ select: opSelect }))
      .mockImplementationOnce(() => ({ select: postSelect }))

    const result = await deleteToolPost('p-uuid')
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne FORBIDDEN si ownership mismatch', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })

    const opSingle = vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    const opEq = vi.fn().mockReturnValue({ single: opSingle })
    const opSelect = vi.fn().mockReturnValue({ eq: opEq })

    const postSingle = vi.fn().mockResolvedValue({
      data: { operator_id: 'autre-operateur', image_paths: [] },
      error: null,
    })
    const postEq = vi.fn().mockReturnValue({ single: postSingle })
    const postSelect = vi.fn().mockReturnValue({ eq: postEq })

    mockFrom
      .mockImplementationOnce(() => ({ select: opSelect }))
      .mockImplementationOnce(() => ({ select: postSelect }))

    const result = await deleteToolPost('p-uuid')
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('supprime le post et nettoie le storage si images présentes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })

    const imagePaths = [`${OPERATOR_ID}/client-uuid/img1.png`, `${OPERATOR_ID}/client-uuid/img2.png`]

    // 1. operators
    const opSingle = vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    const opEq = vi.fn().mockReturnValue({ single: opSingle })
    const opSelect = vi.fn().mockReturnValue({ eq: opEq })

    // 2. SELECT post
    const postSingle = vi.fn().mockResolvedValue({
      data: { operator_id: OPERATOR_ID, image_paths: imagePaths },
      error: null,
    })
    const postEq = vi.fn().mockReturnValue({ single: postSingle })
    const postSelect = vi.fn().mockReturnValue({ eq: postEq })

    // 3. DELETE
    const deleteEq = vi.fn().mockResolvedValue({ error: null })
    const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq })

    mockFrom
      .mockImplementationOnce(() => ({ select: opSelect }))
      .mockImplementationOnce(() => ({ select: postSelect }))
      .mockImplementationOnce(() => ({ delete: deleteFn }))

    const removeMock = vi.fn().mockResolvedValue({ error: null })
    mockStorage.from.mockReturnValue({ remove: removeMock })

    const result = await deleteToolPost('p-uuid')

    expect(result.error).toBeNull()
    expect(result.data?.deleted).toBe(true)
    expect(deleteFn).toHaveBeenCalledOnce()
    expect(removeMock).toHaveBeenCalledWith(imagePaths)
  })

  it('supprime le post sans appeler storage si aucune image', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })

    // 1. operators
    const opSingle = vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    const opEq = vi.fn().mockReturnValue({ single: opSingle })
    const opSelect = vi.fn().mockReturnValue({ eq: opEq })

    // 2. SELECT post (sans images)
    const postSingle = vi.fn().mockResolvedValue({
      data: { operator_id: OPERATOR_ID, image_paths: [] },
      error: null,
    })
    const postEq = vi.fn().mockReturnValue({ single: postSingle })
    const postSelect = vi.fn().mockReturnValue({ eq: postEq })

    // 3. DELETE
    const deleteEq = vi.fn().mockResolvedValue({ error: null })
    const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq })

    mockFrom
      .mockImplementationOnce(() => ({ select: opSelect }))
      .mockImplementationOnce(() => ({ select: postSelect }))
      .mockImplementationOnce(() => ({ delete: deleteFn }))

    const result = await deleteToolPost('p-uuid')

    expect(result.data?.deleted).toBe(true)
    expect(mockStorage.from).not.toHaveBeenCalled()
  })
})
