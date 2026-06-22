import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getToolComments } from './get-tool-comments'

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
const POST_ID = 'post-uuid-0000-0000-0000-000000000001'
const CLIENT_ID = 'client-uuid-0000-0000-0000-000000000002'
const AUTHOR_ID = 'author-uuid-0000-0000-0000-000000000003'

function makeUser() {
  return { id: 'user-auth-uuid', app_metadata: {} }
}

function makeCommentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'comment-uuid-001',
    post_id: POST_ID,
    client_id: CLIENT_ID,
    author_type: 'client',
    author_id: AUTHOR_ID,
    body: 'Très belle mise à jour !',
    created_at: new Date(2026, 5, 20, 10, 0, 0).toISOString(),
    ...overrides,
  }
}

function setupQueryChain(rows: unknown[]) {
  const orderMock = vi.fn().mockResolvedValue({ data: rows, error: null })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  mockFrom.mockReturnValue({ select: selectMock })
  return { orderMock, eqMock, selectMock }
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('getToolComments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne MISSING_POST_ID si postId absent', async () => {
    const result = await getToolComments('')
    expect(result.error?.code).toBe('MISSING_POST_ID')
    expect(result.data).toBeNull()
  })

  it('retourne AUTH_REQUIRED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const result = await getToolComments(POST_ID)
    expect(result.error?.code).toBe('AUTH_REQUIRED')
    expect(result.data).toBeNull()
  })

  it('retourne un tableau vide pour un post sans commentaires', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null })
    setupQueryChain([])

    const result = await getToolComments(POST_ID)

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('retourne les commentaires transformés en camelCase', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null })

    const rows = [makeCommentRow()]
    setupQueryChain(rows)

    const result = await getToolComments(POST_ID)

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].postId).toBe(POST_ID)
    expect(result.data?.[0].clientId).toBe(CLIENT_ID)
    expect(result.data?.[0].authorType).toBe('client')
    expect(result.data?.[0].authorId).toBe(AUTHOR_ID)
    expect(result.data?.[0].body).toBe('Très belle mise à jour !')
  })

  it('retourne les commentaires dans le bon ordre created_at ASC (oldest first)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null })

    const earlier = makeCommentRow({
      id: 'comment-uuid-001',
      body: 'Premier commentaire',
      created_at: new Date(2026, 5, 20, 9, 0, 0).toISOString(),
    })
    const later = makeCommentRow({
      id: 'comment-uuid-002',
      body: 'Deuxième commentaire',
      created_at: new Date(2026, 5, 20, 10, 0, 0).toISOString(),
    })

    // La BDD retourne dans l'ordre ASC (order: ascending: true)
    setupQueryChain([earlier, later])

    const result = await getToolComments(POST_ID)

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(2)
    expect(result.data?.[0].body).toBe('Premier commentaire')
    expect(result.data?.[1].body).toBe('Deuxième commentaire')
  })
})
