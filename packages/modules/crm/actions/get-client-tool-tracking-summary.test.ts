import { describe, it, expect, vi, beforeEach } from 'vitest'

const validClientId = '550e8400-e29b-41d4-a716-446655440000'
const validAuthUserId = '550e8400-e29b-41d4-a716-446655440099'

// ── Chains Supabase ──────────────────────────────────────────────────────────
// clients: select('id').eq('id', clientId).single()
const mockClientSingle = vi.fn()
const mockClientEq = vi.fn(() => ({ single: mockClientSingle }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq }))

// tool_posts: select('id, created_at').eq('client_id', clientId).order(...)
const mockPostsOrder = vi.fn()
const mockPostsEq = vi.fn(() => ({ order: mockPostsOrder }))
const mockPostsSelect = vi.fn(() => ({ eq: mockPostsEq }))

// tool_post_comments: select('id, created_at').in('post_id', postIds).eq('author_type', 'client').order(...)
const mockCommentsOrder = vi.fn()
const mockCommentsAuthorEq = vi.fn(() => ({ order: mockCommentsOrder }))
const mockCommentsIn = vi.fn(() => ({ eq: mockCommentsAuthorEq }))
const mockCommentsSelect = vi.fn(() => ({ in: mockCommentsIn }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'clients') return { select: mockClientSelect }
  if (table === 'tool_posts') return { select: mockPostsSelect }
  if (table === 'tool_post_comments') return { select: mockCommentsSelect }
  return {}
})

const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupAuthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUserId } }, error: null })
}

function setupClientFound() {
  mockClientSingle.mockResolvedValue({ data: { id: validClientId }, error: null })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getClientToolTrackingSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })
    const { getClientToolTrackingSummary } = await import('./get-client-tool-tracking-summary')
    const result = await getClientToolTrackingSummary(validClientId)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when client does not exist or does not belong to operator', async () => {
    setupAuthenticated()
    mockClientSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const { getClientToolTrackingSummary } = await import('./get-client-tool-tracking-summary')
    const result = await getClientToolTrackingSummary(validClientId)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return DATABASE_ERROR when posts query fails', async () => {
    setupAuthenticated()
    setupClientFound()
    mockPostsOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const { getClientToolTrackingSummary } = await import('./get-client-tool-tracking-summary')
    const result = await getClientToolTrackingSummary(validClientId)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should return zeros and null lastActivityAt when client has no posts', async () => {
    setupAuthenticated()
    setupClientFound()
    mockPostsOrder.mockResolvedValue({ data: [], error: null })
    const { getClientToolTrackingSummary } = await import('./get-client-tool-tracking-summary')
    const result = await getClientToolTrackingSummary(validClientId)
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ postCount: 0, clientCommentCount: 0, lastActivityAt: null })
    // tool_post_comments ne doit pas être requêté si aucun post.
    expect(mockCommentsSelect).not.toHaveBeenCalled()
  })

  it('should return correct counts when client has posts but no client comments', async () => {
    setupAuthenticated()
    setupClientFound()
    const posts = [
      { id: 'post-1', created_at: '2026-06-20T10:00:00Z' },
      { id: 'post-2', created_at: '2026-06-19T09:00:00Z' },
    ]
    mockPostsOrder.mockResolvedValue({ data: posts, error: null })
    mockCommentsOrder.mockResolvedValue({ data: [], error: null })
    const { getClientToolTrackingSummary } = await import('./get-client-tool-tracking-summary')
    const result = await getClientToolTrackingSummary(validClientId)
    expect(result.error).toBeNull()
    expect(result.data?.postCount).toBe(2)
    expect(result.data?.clientCommentCount).toBe(0)
    expect(result.data?.lastActivityAt).toBe('2026-06-20T10:00:00Z')
  })

  it('should return correct counts when client has posts and client comments', async () => {
    setupAuthenticated()
    setupClientFound()
    const posts = [{ id: 'post-1', created_at: '2026-06-20T10:00:00Z' }]
    const comments = [
      { id: 'comment-1', created_at: '2026-06-21T08:00:00Z' },
      { id: 'comment-2', created_at: '2026-06-20T11:00:00Z' },
    ]
    mockPostsOrder.mockResolvedValue({ data: posts, error: null })
    mockCommentsOrder.mockResolvedValue({ data: comments, error: null })
    const { getClientToolTrackingSummary } = await import('./get-client-tool-tracking-summary')
    const result = await getClientToolTrackingSummary(validClientId)
    expect(result.error).toBeNull()
    expect(result.data?.postCount).toBe(1)
    expect(result.data?.clientCommentCount).toBe(2)
    // Le commentaire (2026-06-21) est plus récent que le post (2026-06-20).
    expect(result.data?.lastActivityAt).toBe('2026-06-21T08:00:00Z')
  })

  it('should return DATABASE_ERROR when comments query fails', async () => {
    setupAuthenticated()
    setupClientFound()
    const posts = [{ id: 'post-1', created_at: '2026-06-20T10:00:00Z' }]
    mockPostsOrder.mockResolvedValue({ data: posts, error: null })
    mockCommentsOrder.mockResolvedValue({ data: null, error: { message: 'DB error on comments' } })
    const { getClientToolTrackingSummary } = await import('./get-client-tool-tracking-summary')
    const result = await getClientToolTrackingSummary(validClientId)
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
