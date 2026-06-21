import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createToolPost } from './create-tool-post'

// ── Mocks ──────────────────────────────────────────────────────────────────────
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockStorage = {
  from: vi.fn(() => ({
    upload: vi.fn().mockResolvedValue({ error: null }),
    remove: vi.fn().mockResolvedValue({ error: null }),
  })),
}
const mockFunctions = { invoke: vi.fn().mockResolvedValue({ error: null }) }

vi.mock('@monprojetpro/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: mockStorage,
    functions: mockFunctions,
  })),
}))

vi.mock('@monprojetpro/modules-notifications', () => ({
  createNotification: vi.fn().mockResolvedValue({ data: {}, error: null }),
  checkNotificationAllowed: vi.fn().mockResolvedValue({ inapp: true, email: false }),
}))

// ── Helpers ────────────────────────────────────────────────────────────────────
const OPERATOR_AUTH_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const OPERATOR_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
const CLIENT_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
const CLIENT_AUTH_ID = 'd4e5f6a7-b8c9-0123-defa-234567890123'

function makeUser(id = OPERATOR_AUTH_ID) {
  return { id, app_metadata: {} }
}

function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.append('clientId', overrides.clientId ?? CLIENT_ID)
  fd.append('body', overrides.body ?? 'Avancement : maquettes validées.')
  if (overrides.title) fd.append('title', overrides.title)
  return fd
}

/** Setup de base : user authentifié + opérateur trouvé */
function setupOperatorMocks() {
  mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null })

  const insertSingle = vi.fn()
  const insertSelect = vi.fn(() => ({ single: insertSingle }))
  const insert = vi.fn(() => ({ select: insertSelect }))

  const clientSingle = vi.fn().mockResolvedValue({
    data: { auth_user_id: CLIENT_AUTH_ID, email: 'client@test.com', first_name: 'Alice' },
    error: null,
  })
  const clientEqChain = vi.fn().mockReturnValue({ single: clientSingle })
  const clientSelect = vi.fn().mockReturnValue({ eq: clientEqChain })

  // operators : .select('id').eq('auth_user_id', user.id).single()
  const operatorSingle = vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
  const operatorEq = vi.fn().mockReturnValue({ single: operatorSingle })
  const operatorSelect = vi.fn().mockReturnValue({ eq: operatorEq })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'operators') return { select: operatorSelect }
    if (table === 'tool_posts') return { insert }
    if (table === 'clients') return { select: clientSelect }
    return {}
  })

  return { insertSingle, insertSelect, insert }
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('createToolPost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne AUTH_REQUIRED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const result = await createToolPost(makeFormData())
    expect(result.error?.code).toBe('AUTH_REQUIRED')
    expect(result.data).toBeNull()
  })

  it('retourne FORBIDDEN si l\'utilisateur n\'est pas dans la table operators', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null })
    // operators retourne null → pas un opérateur
    const singleNull = vi.fn().mockResolvedValue({ data: null, error: null })
    const eqNull = vi.fn().mockReturnValue({ single: singleNull })
    const selectNull = vi.fn().mockReturnValue({ eq: eqNull })
    mockFrom.mockReturnValue({ select: selectNull })
    const result = await createToolPost(makeFormData())
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('retourne VALIDATION_ERROR si body vide', async () => {
    mockGetUser.mockResolvedValue({ data: { user: makeUser() }, error: null })
    const singleOp = vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    const eqOp = vi.fn().mockReturnValue({ single: singleOp })
    const selectOp = vi.fn().mockReturnValue({ eq: eqOp })
    mockFrom.mockReturnValue({ select: selectOp })

    const result = await createToolPost(makeFormData({ body: '' }))
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('insère le post avec les bons champs et retourne successResponse', async () => {
    const { insertSingle } = setupOperatorMocks()

    const fakeRow = {
      id: 'post-uuid-789',
      client_id: CLIENT_ID,
      operator_id: OPERATOR_ID,
      title: 'Maquettes terminées',
      body: 'Avancement : maquettes validées.',
      image_paths: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    insertSingle.mockResolvedValue({ data: fakeRow, error: null })

    const fd = makeFormData({ title: 'Maquettes terminées' })
    const result = await createToolPost(fd)

    expect(result.error).toBeNull()
    expect(result.data?.id).toBe('post-uuid-789')
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.data?.operatorId).toBe(OPERATOR_ID)
    expect(result.data?.body).toBe('Avancement : maquettes validées.')
    expect(result.data?.title).toBe('Maquettes terminées')
  })

  it('retourne TOO_MANY_IMAGES si plus de 5 images', async () => {
    const { insertSingle } = setupOperatorMocks()
    insertSingle.mockResolvedValue({ data: null, error: null }) // ne sera pas appelé

    const fd = makeFormData()
    for (let i = 0; i < 6; i++) {
      fd.append('images', new File(['x'], `img${i}.png`, { type: 'image/png' }))
    }
    const result = await createToolPost(fd)
    expect(result.error?.code).toBe('TOO_MANY_IMAGES')
  })
})
