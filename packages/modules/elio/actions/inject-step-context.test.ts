import { describe, it, expect, vi, beforeEach } from 'vitest'
import { injectStepContext } from './inject-step-context'

const PARCOURS_AGENT_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const USER_ID = '00000000-0000-0000-0000-000000000099'
const CONTEXT_ID = '00000000-0000-0000-0000-000000000010'

vi.mock('mammoth', () => ({
  extractRawText: vi.fn(),
}))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

function makeMockSupabase(overrides: {
  user?: { id: string } | null
  insertResult?: { data: unknown; error: unknown }
  uploadError?: unknown
  agentFound?: boolean
} = {}) {
  const { user = { id: USER_ID }, insertResult, uploadError = null, agentFound = true } = overrides

  const chain: Record<string, unknown> = {}
  for (const fn of ['insert', 'select', 'delete', 'update', 'eq', 'is', 'order', 'limit']) {
    chain[fn] = vi.fn(() => chain)
  }
  // maybeSingle: utilisé pour l'ownership check (client_parcours_agents)
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue(
    agentFound
      ? { data: { id: PARCOURS_AGENT_ID }, error: null }
      : { data: null, error: null }
  )
  // single: utilisé pour l'insert (client_step_contexts)
  ;(chain.single as ReturnType<typeof vi.fn>) = vi.fn().mockResolvedValue(
    insertResult ?? { data: { id: CONTEXT_ID }, error: null }
  )

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : new Error('Not authenticated'),
      }),
    },
    from: vi.fn(() => chain),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: uploadError }),
        remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
      })),
    },
  }
}

describe('injectStepContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne une erreur si parcoursAgentId est invalide', async () => {
    const fd = new FormData()
    fd.set('text', 'Contexte test')
    const result = await injectStepContext('not-a-uuid', CLIENT_ID, fd)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne une erreur si clientId est invalide', async () => {
    const fd = new FormData()
    fd.set('text', 'Contexte test')
    const result = await injectStepContext(PARCOURS_AGENT_ID, 'bad-id', fd)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne une erreur si ni texte ni fichier n\'est fourni', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeMockSupabase() as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    const fd = new FormData()
    const result = await injectStepContext(PARCOURS_AGENT_ID, CLIENT_ID, fd)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne une erreur si l\'utilisateur n\'est pas authentifié', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeMockSupabase({ user: null }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    const fd = new FormData()
    fd.set('text', 'Contexte test')
    const result = await injectStepContext(PARCOURS_AGENT_ID, CLIENT_ID, fd)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('crée un contexte texte avec succès', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeMockSupabase() as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    const fd = new FormData()
    fd.set('text', 'Quelle est ta proposition de valeur ?')
    const result = await injectStepContext(PARCOURS_AGENT_ID, CLIENT_ID, fd)
    expect(result.error).toBeNull()
    expect(result.data?.id).toBe(CONTEXT_ID)
  })

  it('retourne une erreur si le texte dépasse 5000 caractères', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeMockSupabase() as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    const fd = new FormData()
    fd.set('text', 'x'.repeat(5001))
    const result = await injectStepContext(PARCOURS_AGENT_ID, CLIENT_ID, fd)
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('5000')
  })

  it('retourne NOT_FOUND si le parcoursAgentId n\'appartient pas au clientId', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeMockSupabase({ agentFound: false }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    const fd = new FormData()
    fd.set('text', 'Contexte test')
    const result = await injectStepContext(PARCOURS_AGENT_ID, CLIENT_ID, fd)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne une erreur si le format de fichier n\'est pas supporté', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeMockSupabase() as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    const fd = new FormData()
    const blob = new Blob(['content'], { type: 'image/png' })
    fd.set('file', new File([blob], 'image.png', { type: 'image/png' }))
    const result = await injectStepContext(PARCOURS_AGENT_ID, CLIENT_ID, fd)
    expect(result.error?.code).toBe('INVALID_FILE_TYPE')
  })

  it('crée un contexte fichier TXT avec succès', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeMockSupabase() as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    const fd = new FormData()
    const blob = new Blob(['Contenu du fichier texte'], { type: 'text/plain' })
    fd.set('file', new File([blob], 'note.txt', { type: 'text/plain' }))
    const result = await injectStepContext(PARCOURS_AGENT_ID, CLIENT_ID, fd)
    expect(result.error).toBeNull()
    expect(result.data?.id).toBe(CONTEXT_ID)
  })

  it('retourne une erreur DB si l\'insert échoue', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeMockSupabase({
        insertResult: { data: null, error: { message: 'Violation contrainte', code: '23503' } },
      }) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
    )
    const fd = new FormData()
    fd.set('text', 'Test contexte')
    const result = await injectStepContext(PARCOURS_AGENT_ID, CLIENT_ID, fd)
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
