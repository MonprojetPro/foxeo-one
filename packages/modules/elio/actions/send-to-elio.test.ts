import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendToElio } from './send-to-elio'
import { DEFAULT_ELIO_CONFIG } from '../types/elio-config.types'

const mockInvoke = vi.fn()

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { id: 'client-1' }, error: null })),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
        or: vi.fn(() => ({
          limit: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
    })),
    functions: {
      invoke: mockInvoke,
    },
  })),
}))

vi.mock('./get-elio-config', () => ({
  getElioConfig: vi.fn(async () => ({ data: DEFAULT_ELIO_CONFIG, error: null })),
}))

vi.mock('./search-client-info', () => ({
  searchClientInfo: vi.fn(async (query: string) => {
    if (query === 'InconnuXYZ') {
      return { data: null, error: { message: 'Aucun client trouvé', code: 'NOT_FOUND' } }
    }
    return {
      data: {
        client: { name: 'Sandrine Martin', email: 'sandrine@test.com', client_type: 'lab', status: 'active' },
        parcours: { current_step: 3, total_steps: 6 },
        validationRequests: [],
        recentMessages: [],
      },
      error: null,
    }
  }),
}))

describe('sendToElio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne { data, error: null } en cas de succès', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Bonjour ! Je suis Élio.' },
      error: null,
    })

    const result = await sendToElio('lab', 'Bonjour Élio', 'client-1')

    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    expect(result.data?.role).toBe('assistant')
    expect(result.data?.content).toBe('Bonjour ! Je suis Élio.')
    expect(result.data?.dashboardType).toBe('lab')
  })

  it('retourne une erreur VALIDATION_ERROR si le message est vide', async () => {
    const result = await sendToElio('lab', '   ', 'client-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne une erreur TIMEOUT si l\'Edge Function signale un timeout', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Request timed out'))

    const result = await sendToElio('lab', 'Question test', 'client-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('TIMEOUT')
    expect(result.error?.message).toContain('temporairement indisponible')
  })

  it('retourne une erreur NETWORK_ERROR si problème réseau', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('fetch failed: network error'))

    const result = await sendToElio('lab', 'Question test', 'client-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NETWORK_ERROR')
    expect(result.error?.message).toContain('connexion')
  })

  it('retourne une erreur LLM_ERROR si rate limit', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('rate limit exceeded'))

    const result = await sendToElio('lab', 'Question test', 'client-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('LLM_ERROR')
    expect(result.error?.message).toContain('surchargé')
  })

  it('retourne une erreur UNKNOWN pour les erreurs inattendues', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Something totally unexpected'))

    const result = await sendToElio('lab', 'Question test', 'client-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNKNOWN')
  })

  it('fonctionne pour le dashboard hub (sans clientId)', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Voici les stats clients...' },
      error: null,
    })

    const result = await sendToElio('hub', 'Montre-moi les clients actifs')
    expect(result.error).toBeNull()
    expect(result.data?.dashboardType).toBe('hub')
  })

  it('Task 7.1-7.3 — Hub avec intention search_client : recherche et réinjecte dans LLM (AC3, AC4)', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Sandrine Martin est en étape 3/6 de son parcours Lab.' },
      error: null,
    })

    const result = await sendToElio('hub', 'Où en est Sandrine ?')
    expect(result.error).toBeNull()
    expect(result.data?.content).toContain('Sandrine')
  })

  it('Task 7.1-7.2 — Hub client non trouvé : retourne NOT_FOUND (AC3)', async () => {
    const result = await sendToElio('hub', 'Où en est InconnuXYZ ?')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('Task 7.4 — Hub message général (non search_client) : appelle le LLM normalement', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Pour créer un client, va dans Clients → Nouveau client.' },
      error: null,
    })

    const result = await sendToElio('hub', 'Comment je crée un client ?')
    expect(result.error).toBeNull()
    expect(result.data?.content).toBeTruthy()
  })

  it('retourne une erreur si l\'Edge Function retourne une erreur', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Edge Function error: 500'),
    })

    const result = await sendToElio('lab', 'Question test', 'client-1')
    expect(result.data).toBeNull()
    expect(result.error).toBeDefined()
  })
})
