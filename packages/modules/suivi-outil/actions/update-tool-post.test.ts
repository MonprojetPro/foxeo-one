import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateToolPost } from './update-tool-post'

// ── Mocks ──────────────────────────────────────────────────────────────────────
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

// ── Helpers ────────────────────────────────────────────────────────────────────
const AUTH_USER_ID = 'auth-op-uuid'
const OPERATOR_ID = 'op-uuid-db'
const POST_ID = 'a0000000-0000-0000-0000-000000000001'

function setupOperatorLookup(operatorId: string | null = OPERATOR_ID) {
  const single = vi.fn().mockResolvedValue({
    data: operatorId ? { id: operatorId } : null,
    error: null,
  })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  return { select, eq, single }
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('updateToolPost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne AUTH_REQUIRED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const result = await updateToolPost({ postId: POST_ID, body: 'text' })
    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('retourne FORBIDDEN si l\'utilisateur n\'est pas dans la table operators', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })
    const { select } = setupOperatorLookup(null)
    mockFrom.mockReturnValue({ select })

    const result = await updateToolPost({ postId: POST_ID, body: 'text' })
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('retourne VALIDATION_ERROR si postId n\'est pas un UUID valide', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })
    const { select } = setupOperatorLookup()
    mockFrom.mockReturnValue({ select })

    const result = await updateToolPost({ postId: 'not-a-uuid', body: 'text' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne NOT_FOUND si le post n\'existe pas', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })

    // 1er from() → operators
    const opSingle = vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    const opEq = vi.fn().mockReturnValue({ single: opSingle })
    const opSelect = vi.fn().mockReturnValue({ eq: opEq })

    // 2e from() → tool_posts SELECT (post introuvable)
    const postSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const postEq = vi.fn().mockReturnValue({ single: postSingle })
    const postSelect = vi.fn().mockReturnValue({ eq: postEq })

    mockFrom
      .mockImplementationOnce(() => ({ select: opSelect }))
      .mockImplementationOnce(() => ({ select: postSelect }))

    const result = await updateToolPost({ postId: POST_ID, body: 'txt' })
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne FORBIDDEN si le post appartient à un autre opérateur', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })

    const opSingle = vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    const opEq = vi.fn().mockReturnValue({ single: opSingle })
    const opSelect = vi.fn().mockReturnValue({ eq: opEq })

    const postSingle = vi.fn().mockResolvedValue({
      data: { operator_id: 'autre-op-uuid' },
      error: null,
    })
    const postEq = vi.fn().mockReturnValue({ single: postSingle })
    const postSelect = vi.fn().mockReturnValue({ eq: postEq })

    mockFrom
      .mockImplementationOnce(() => ({ select: opSelect }))
      .mockImplementationOnce(() => ({ select: postSelect }))

    const result = await updateToolPost({ postId: POST_ID, body: 'txt' })
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('met à jour le post et retourne les données en camelCase', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } }, error: null })

    const updatedRow = {
      id: POST_ID,
      client_id: 'client-uuid',
      operator_id: OPERATOR_ID,
      title: 'Nouveau titre',
      body: 'Nouveau contenu',
      image_paths: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 1. operators
    const opSingle = vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    const opEq = vi.fn().mockReturnValue({ single: opSingle })
    const opSelect = vi.fn().mockReturnValue({ eq: opEq })

    // 2. SELECT ownership
    const postSingle = vi.fn().mockResolvedValue({ data: { operator_id: OPERATOR_ID }, error: null })
    const postEq = vi.fn().mockReturnValue({ single: postSingle })
    const postSelect = vi.fn().mockReturnValue({ eq: postEq })

    // 3. UPDATE
    const updateSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null })
    const updateSelectFn = vi.fn().mockReturnValue({ single: updateSingle })
    const updateEq = vi.fn().mockReturnValue({ select: updateSelectFn })
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq })

    mockFrom
      .mockImplementationOnce(() => ({ select: opSelect }))
      .mockImplementationOnce(() => ({ select: postSelect }))
      .mockImplementationOnce(() => ({ update: updateFn }))

    const result = await updateToolPost({
      postId: POST_ID,
      title: 'Nouveau titre',
      body: 'Nouveau contenu',
    })

    expect(result.error).toBeNull()
    expect(result.data?.title).toBe('Nouveau titre')
    expect(result.data?.body).toBe('Nouveau contenu')
    expect(result.data?.clientId).toBe('client-uuid')
  })
})
