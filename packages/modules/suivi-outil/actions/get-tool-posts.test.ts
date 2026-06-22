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
  return { id: 'op-uuid', app_metadata: {} }
}

function makeClientUser(clientUserId = 'client-auth-uuid') {
  return { id: clientUserId, app_metadata: {} }
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

/**
 * Mocke les accès tables. La détection opérateur se fait via la table `operators`
 * (le rôle n'est PAS dans app_metadata).
 * - operator : record renvoyé par from('operators') (null = pas opérateur)
 * - client   : record renvoyé par from('clients') (null = accès refusé)
 * - rows     : posts renvoyés par from('tool_posts')
 */
function mockTables({
  operator = null,
  client = null,
  rows = [] as unknown[],
}: { operator?: unknown; client?: unknown; rows?: unknown[] }) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'operators') {
      return {
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: operator, error: null }) }) }),
      }
    }
    if (table === 'clients') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: client, error: null }) }) }) }),
      }
    }
    // tool_posts
    return {
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: rows, error: null }) }) }),
    }
  })
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

  it('refuse un client qui demande un autre clientId (FORBIDDEN)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeClientUser() }, error: null })
    mockTables({ operator: null, client: null }) // ni opérateur, ni propriétaire
    const result = await getToolPosts('autre-client-uuid')
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('retourne les posts transformés en camelCase pour un opérateur', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeOperatorUser() }, error: null })
    mockTables({ operator: { id: 'op-uuid' }, rows: [makeRow()] })

    const result = await getToolPosts('client-uuid')

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].clientId).toBe('client-uuid')
    expect(result.data?.[0].operatorId).toBe('op-uuid')
    expect(result.data?.[0].imageUrls).toEqual([])
  })

  it('autorise un client propriétaire de son clientId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeClientUser() }, error: null })
    mockTables({ operator: null, client: { id: 'client-uuid' }, rows: [makeRow()] })

    const result = await getToolPosts('client-uuid')
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
  })

  it('génère les URLs signées pour les images', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeOperatorUser() }, error: null })
    mockTables({ operator: { id: 'op-uuid' }, rows: [makeRow({ image_paths: ['op-uuid/client-uuid/img.png'] })] })

    const signedData = [{ signedUrl: 'https://storage.example.com/signed-url' }]
    const createSignedUrlsMock = vi.fn().mockResolvedValue({ data: signedData, error: null })
    mockStorage.from.mockReturnValue({ createSignedUrls: createSignedUrlsMock })

    const result = await getToolPosts('client-uuid')

    expect(createSignedUrlsMock).toHaveBeenCalledWith(['op-uuid/client-uuid/img.png'], 3600)
    expect(result.data?.[0].imageUrls).toEqual(['https://storage.example.com/signed-url'])
  })

  it('retourne un tableau vide si aucun post', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeOperatorUser() }, error: null })
    mockTables({ operator: { id: 'op-uuid' }, rows: [] })

    const result = await getToolPosts('client-uuid')
    expect(result.data).toEqual([])
    expect(result.error).toBeNull()
  })
})
