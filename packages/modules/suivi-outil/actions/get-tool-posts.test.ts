import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getToolPosts } from './get-tool-posts'

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
function makeOperatorUser() {
  return { id: 'op-uuid', app_metadata: { role: 'operator' } }
}

function makeClientUser(clientUserId = 'client-auth-uuid') {
  return { id: clientUserId, app_metadata: { role: 'client' } }
}

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'post-uuid',
    client_id: 'client-uuid',
    operator_id: 'op-uuid',
    title: 'Étape 1',
    body: 'Contenu du post',
    image_paths: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('getToolPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne MISSING_CLIENT_ID si clientId absent', async () => {
    const result = await getToolPosts('')
    expect(result.error?.code).toBe('MISSING_CLIENT_ID')
  })

  it('retourne AUTH_REQUIRED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const result = await getToolPosts('client-uuid')
    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('retourne les posts transformés en camelCase pour un opérateur', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeOperatorUser() }, error: null })

    const rows = [makeRow()]
    const orderMock = vi.fn().mockResolvedValue({ data: rows, error: null })
    const eqMock = vi.fn().mockReturnValue({ order: orderMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ select: selectMock })

    const result = await getToolPosts('client-uuid')

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].clientId).toBe('client-uuid')
    expect(result.data?.[0].operatorId).toBe('op-uuid')
    expect(result.data?.[0].imageUrls).toEqual([])
  })

  it('génère les URLs signées pour les images', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeOperatorUser() }, error: null })

    const rows = [makeRow({ image_paths: ['op-uuid/client-uuid/img.png'] })]
    const orderMock = vi.fn().mockResolvedValue({ data: rows, error: null })
    const eqMock = vi.fn().mockReturnValue({ order: orderMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ select: selectMock })

    const signedData = [{ signedUrl: 'https://storage.example.com/signed-url' }]
    const createSignedUrlsMock = vi.fn().mockResolvedValue({ data: signedData, error: null })
    mockStorage.from.mockReturnValue({ createSignedUrls: createSignedUrlsMock })

    const result = await getToolPosts('client-uuid')

    expect(createSignedUrlsMock).toHaveBeenCalledWith(
      ['op-uuid/client-uuid/img.png'],
      3600
    )
    expect(result.data?.[0].imageUrls).toEqual(['https://storage.example.com/signed-url'])
  })

  it('retourne un tableau vide si aucun post', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeOperatorUser() }, error: null })

    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const eqMock = vi.fn().mockReturnValue({ order: orderMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ select: selectMock })

    const result = await getToolPosts('client-uuid')
    expect(result.data).toEqual([])
    expect(result.error).toBeNull()
  })
})
