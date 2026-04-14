import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendToElio } from './send-to-elio'
import { DEFAULT_ELIO_CONFIG } from '../types/elio-config.types'

const mockInvoke = vi.fn()

// Chaîne eq récursive pour supporter .eq().eq().eq() (validation_requests, etc.)
function makeEqChain(): {
  eq: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  data?: unknown
  error?: unknown
} {
  const chain: ReturnType<typeof makeEqChain> = {
    eq: vi.fn(() => makeEqChain()),
    single: vi.fn(async () => ({ data: { id: 'client-1' }, error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  }
  return chain
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        ...makeEqChain(),
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

vi.mock('./correct-and-adapt-text', () => ({
  correctAndAdaptText: vi.fn(async (clientName: string, _originalText: string) => {
    if (clientName.toLowerCase().includes('inconnu')) {
      return { data: null, error: { message: 'Client non trouvé', code: 'CLIENT_NOT_FOUND' } }
    }
    return { data: '---\nTexte corrigé.\n---\nOrtho OK.', error: null }
  }),
}))

vi.mock('./generate-draft', () => ({
  generateDraft: vi.fn(async (input: { clientName: string; draftType: string; subject: string }) => {
    if (input.clientName.toLowerCase().includes('inconnu')) {
      return { data: null, error: { message: 'Client non trouvé', code: 'CLIENT_NOT_FOUND' } }
    }
    return {
      data: {
        content: `---\nBrouillon ${input.draftType}.\n---\nProfil appliqué.`,
        draftType: input.draftType,
        clientName: input.clientName,
      },
      error: null,
    }
  }),
}))

vi.mock('./adjust-draft', () => ({
  adjustDraft: vi.fn(async (_input: unknown) => ({
    data: {
      content: '---\nVersion ajustée.\n---\nModif appliquée.',
      draftType: 'email',
      clientName: 'Thomas',
      version: 2,
    },
    error: null,
  })),
}))

vi.mock('./generate-document', () => ({
  generateDocument: vi.fn(async () => ({
    data: 'ATTESTATION DE PRÉSENCE\n\nJe soussigné certifie...',
    error: null,
  })),
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

  it('retourne ELIO_LAB_DISABLED si elio_lab_enabled=false pour un message Lab', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table === 'client_configs') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { elio_lab_enabled: false },
                  error: null,
                })),
              })),
            })),
          }
        }
        return {
          select: vi.fn(() => ({
            ...makeEqChain(),
            or: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
        }
      }),
      functions: { invoke: mockInvoke },
    } as never)

    const result = await sendToElio('lab', 'Bonjour Élio', 'client-1')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('ELIO_LAB_DISABLED')
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

  // Story 8.6 — Task 7
  it('Task 7.1-7.2 — Hub correct_text : appelle correctAndAdaptText et retourne le texte corrigé', async () => {
    const result = await sendToElio('hub', 'Corrige ça pour Thomas : salu thomas je tenvoi le devis')
    expect(result.error).toBeNull()
    expect(result.data?.content).toBeTruthy()
  })

  it('Task 7.1-7.2 — Hub generate_draft email : appelle generateDraft et retourne le brouillon', async () => {
    const result = await sendToElio('hub', 'Génère un email pour Sandrine pour lui dire que son devis est prêt')
    expect(result.error).toBeNull()
    expect(result.data?.content).toBeTruthy()
    expect(result.data?.metadata?.draftType).toBe('email')
  })

  it('Task 7.1-7.2 — Hub generate_draft chat : draftType=chat dans metadata', async () => {
    const result = await sendToElio('hub', 'Écris une réponse pour Marie')
    expect(result.error).toBeNull()
    expect(result.data?.metadata?.draftType).toBe('chat')
  })

  it('Task 7.3 — Hub adjust_draft avec draftContext : appelle adjustDraft', async () => {
    const result = await sendToElio('hub', 'Plus court', undefined, {
      previousDraft: 'Bonjour Thomas, voici le devis...',
      clientName: 'Thomas',
      draftType: 'email',
      currentVersion: 1,
    })
    expect(result.error).toBeNull()
    expect(result.data?.content).toBeTruthy()
    expect(result.data?.metadata?.draftType).toBe('email')
  })

  it('Task 7.3 — Hub adjust_draft sans draftContext : traité comme message général', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Réponse générale.' },
      error: null,
    })

    const result = await sendToElio('hub', 'Plus court')
    expect(result.error).toBeNull()
    expect(result.data?.content).toBeTruthy()
  })
})

describe('sendToElio — Story 8.9b — generate_document (One+)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Task 9.1 — client One (non One+) qui demande une attestation reçoit le message upsell', async () => {
    // Default mock: maybeSingle returns { data: null } → tier = 'one'
    const result = await sendToElio('one', 'Génère une attestation de présence pour Marie', 'client-1')
    expect(result.error).toBeNull()
    expect(result.data?.content).toContain('One+')
  })

  it('Task 9.2 — message non reconnu comme generate_document sur One passe au LLM normal', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { content: 'Bien sûr, voici les informations demandées.' },
      error: null,
    })

    const result = await sendToElio('one', 'Bonjour Élio, comment ça va ?', 'client-1')
    expect(result.error).toBeNull()
    expect(result.data?.content).toBeTruthy()
  })

  it('Task 9.3 — détecte bien l\'intention generate_document et bloque tier One', async () => {
    const result = await sendToElio('one', 'Génère un récapitulatif mensuel', 'client-1')
    expect(result.error).toBeNull()
    // Tier='one' → upsell, pas de génération réelle
    expect(result.data?.content).toBeTruthy()
  })
})
