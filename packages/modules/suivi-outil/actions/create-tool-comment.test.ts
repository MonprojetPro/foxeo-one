import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createToolComment } from './create-tool-comment'

// ── Mocks ──────────────────────────────────────────────────────────────────────
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockStorageCreateSignedUrls = vi.fn()

vi.mock('@monprojetpro/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: {
      from: () => ({
        createSignedUrls: mockStorageCreateSignedUrls,
      }),
    },
  })),
}))

vi.mock('@monprojetpro/modules-notifications', () => ({
  createNotification: vi.fn().mockResolvedValue({ data: {}, error: null }),
  checkNotificationAllowed: vi.fn().mockResolvedValue({ inapp: true, email: false }),
}))

// ── Helpers ────────────────────────────────────────────────────────────────────
const CLIENT_AUTH_ID = 'aaaa0000-0000-0000-0000-000000000001'
const CLIENT_ID = 'bbbb0000-0000-0000-0000-000000000002'
const OPERATOR_AUTH_ID = 'cccc0000-0000-0000-0000-000000000003'
const OPERATOR_ID = 'dddd0000-0000-0000-0000-000000000004'
const POST_ID = 'eeee0000-0000-0000-0000-000000000005'

function makeClientUser() {
  return { id: CLIENT_AUTH_ID, app_metadata: {} }
}

function makeOperatorUser() {
  return { id: OPERATOR_AUTH_ID, app_metadata: { role: 'operator' } }
}

function makeFakeComment(
  authorType: 'client' | 'operator' = 'client',
  imagePaths: string[] = []
) {
  return {
    id: 'comment-uuid-001',
    post_id: POST_ID,
    client_id: CLIENT_ID,
    author_type: authorType,
    author_id: authorType === 'client' ? CLIENT_AUTH_ID : OPERATOR_AUTH_ID,
    body: 'Super avancement !',
    image_paths: imagePaths,
    created_at: new Date().toISOString(),
  }
}

/**
 * Setup pour un client authentifié
 */
function setupClientMocks() {
  mockGetUser.mockResolvedValue({ data: { user: makeClientUser() }, error: null })

  const insertSingle = vi.fn()
  const insertSelect = vi.fn(() => ({ single: insertSingle }))
  const insert = vi.fn(() => ({ select: insertSelect }))

  // clients : maybeSingle → retourne le client
  const clientMaybeSingle = vi.fn().mockResolvedValue({
    data: { id: CLIENT_ID, auth_user_id: CLIENT_AUTH_ID },
    error: null,
  })
  const clientEq = vi.fn().mockReturnValue({ maybeSingle: clientMaybeSingle })
  const clientSelect = vi.fn().mockReturnValue({ eq: clientEq })

  // tool_posts : pour la notification opérateur après l'insert client
  const postNotifMaybeSingle = vi.fn().mockResolvedValue({
    data: { operator_id: OPERATOR_ID, operators: { auth_user_id: OPERATOR_AUTH_ID } },
    error: null,
  })
  const postNotifEq = vi.fn().mockReturnValue({ maybeSingle: postNotifMaybeSingle })
  const postNotifSelect = vi.fn().mockReturnValue({ eq: postNotifEq })

  // tool_post_comments : insert
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clients') return { select: clientSelect }
    if (table === 'tool_post_comments') return { insert }
    if (table === 'tool_posts') return { select: postNotifSelect }
    return {}
  })

  return { insertSingle }
}

/**
 * Setup pour un opérateur authentifié
 */
function setupOperatorMocks() {
  mockGetUser.mockResolvedValue({ data: { user: makeOperatorUser() }, error: null })

  const insertSingle = vi.fn()
  const insertSelect = vi.fn(() => ({ single: insertSingle }))
  const insert = vi.fn(() => ({ select: insertSelect }))

  // clients : maybeSingle → null (pas un client)
  const clientMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
  const clientEqA = vi.fn().mockReturnValue({ maybeSingle: clientMaybeSingle })
  const clientSelectA = vi.fn().mockReturnValue({ eq: clientEqA })

  // operators : maybeSingle → opérateur trouvé
  const operatorMaybeSingle = vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
  const operatorEq = vi.fn().mockReturnValue({ maybeSingle: operatorMaybeSingle })
  const operatorSelect = vi.fn().mockReturnValue({ eq: operatorEq })

  // tool_posts : maybeSingle → post trouvé
  const postMaybeSingle = vi.fn().mockResolvedValue({ data: { client_id: CLIENT_ID }, error: null })
  const postEq = vi.fn().mockReturnValue({ maybeSingle: postMaybeSingle })
  const postSelect = vi.fn().mockReturnValue({ eq: postEq })

  // clients (pour notification) : maybeSingle → auth_user_id
  const clientNotifMaybeSingle = vi.fn().mockResolvedValue({
    data: { auth_user_id: CLIENT_AUTH_ID },
    error: null,
  })
  const clientNotifEq = vi.fn().mockReturnValue({ maybeSingle: clientNotifMaybeSingle })
  const clientNotifSelect = vi.fn().mockReturnValue({ eq: clientNotifEq })

  let clientCallCount = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clients') {
      clientCallCount++
      // Premier appel = vérification si c'est un client ; second = notification
      return clientCallCount === 1
        ? { select: clientSelectA }
        : { select: clientNotifSelect }
    }
    if (table === 'operators') return { select: operatorSelect }
    if (table === 'tool_posts') return { select: postSelect }
    if (table === 'tool_post_comments') return { insert }
    return {}
  })

  return { insertSingle }
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('createToolComment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageCreateSignedUrls.mockResolvedValue({ data: [], error: null })
  })

  it('retourne AUTH_REQUIRED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const result = await createToolComment({ postId: POST_ID, body: 'Test' })
    expect(result.error?.code).toBe('AUTH_REQUIRED')
    expect(result.data).toBeNull()
  })

  it('insère un commentaire valide pour un client (sans images)', async () => {
    const { insertSingle } = setupClientMocks()
    insertSingle.mockResolvedValue({ data: makeFakeComment('client'), error: null })

    const result = await createToolComment({ postId: POST_ID, body: 'Super avancement !' })

    expect(result.error).toBeNull()
    expect(result.data?.authorType).toBe('client')
    expect(result.data?.postId).toBe(POST_ID)
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.data?.body).toBe('Super avancement !')
    expect(result.data?.imagePaths).toEqual([])
    expect(result.data?.imageUrls).toEqual([])
  })

  it('insère un commentaire avec images et retourne les signed URLs', async () => {
    const { insertSingle } = setupClientMocks()
    const imagePaths = [
      `comments/${CLIENT_ID}/img1.png`,
      `comments/${CLIENT_ID}/img2.png`,
    ]
    insertSingle.mockResolvedValue({
      data: makeFakeComment('client', imagePaths),
      error: null,
    })
    mockStorageCreateSignedUrls.mockResolvedValue({
      data: [
        { signedUrl: 'https://cdn.example.com/img1.png' },
        { signedUrl: 'https://cdn.example.com/img2.png' },
      ],
      error: null,
    })

    const result = await createToolComment({
      postId: POST_ID,
      body: 'Voici mes screenshots',
      imagePaths,
    })

    expect(result.error).toBeNull()
    expect(result.data?.imagePaths).toEqual(imagePaths)
    expect(result.data?.imageUrls).toEqual([
      'https://cdn.example.com/img1.png',
      'https://cdn.example.com/img2.png',
    ])
    expect(mockStorageCreateSignedUrls).toHaveBeenCalledWith(imagePaths, 3600)
  })

  it('retourne TOO_MANY_IMAGES si plus de 3 images fournies', async () => {
    setupClientMocks()

    const result = await createToolComment({
      postId: POST_ID,
      body: 'Test',
      imagePaths: ['img1.png', 'img2.png', 'img3.png', 'img4.png'],
    })

    expect(result.error?.code).toBe('TOO_MANY_IMAGES')
    expect(result.data).toBeNull()
  })

  it('insère un commentaire valide pour un opérateur', async () => {
    const { insertSingle } = setupOperatorMocks()
    insertSingle.mockResolvedValue({ data: makeFakeComment('operator'), error: null })

    const result = await createToolComment({ postId: POST_ID, body: 'Super avancement !' })

    expect(result.error).toBeNull()
    expect(result.data?.authorType).toBe('operator')
  })

  it('retourne VALIDATION_ERROR si body vide et aucune image', async () => {
    setupClientMocks()

    const result = await createToolComment({ postId: POST_ID, body: '' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('retourne VALIDATION_ERROR si body dépasse 2000 caractères', async () => {
    setupClientMocks()

    const longBody = 'x'.repeat(2001)
    const result = await createToolComment({ postId: POST_ID, body: longBody })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })
})
