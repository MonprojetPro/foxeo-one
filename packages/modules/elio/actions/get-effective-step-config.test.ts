import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getEffectiveStepConfig } from './get-effective-step-config'

const STEP_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const STEP_NUMBER = 2
const AGENT_ID = '00000000-0000-0000-0000-000000000003'
const CONTEXT_ID = '00000000-0000-0000-0000-000000000004'

// Mock supabase client
const mockMaybeSingle = vi.fn()
const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockOrder = vi.fn(() => ({ limit: mockLimit }))
const mockIsNull = vi.fn(() => ({ order: mockOrder, limit: mockLimit, maybeSingle: mockMaybeSingle }))
const mockEqChain = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    })
  ),
}))

// Builder de chaîne supabase simplifié
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  const fns = ['select', 'eq', 'is', 'order', 'limit', 'maybeSingle']
  for (const fn of fns) {
    chain[fn] = vi.fn(() => chain)
  }
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(result)
  return chain
}

describe('getEffectiveStepConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMaybeSingle.mockReset()
    mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle })
    mockOrder.mockReturnValue({ limit: mockLimit })
    mockIsNull.mockReturnValue({ order: mockOrder, limit: mockLimit, maybeSingle: mockMaybeSingle })
    mockEqChain.mockReturnValue({ is: mockIsNull, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEqChain })
    mockFrom.mockReturnValue({ select: mockSelect })
  })

  it('retourne une erreur si stepId est invalide', async () => {
    const result = await getEffectiveStepConfig({
      stepId: 'not-a-uuid',
      stepNumber: 1,
      clientId: CLIENT_ID,
    })
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne une erreur si clientId est invalide', async () => {
    const result = await getEffectiveStepConfig({
      stepId: STEP_ID,
      stepNumber: 1,
      clientId: 'bad-id',
    })
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne une erreur si stepNumber < 1', async () => {
    const result = await getEffectiveStepConfig({
      stepId: STEP_ID,
      stepNumber: 0,
      clientId: CLIENT_ID,
    })
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne la config de l\'agent quand un agent est assigné (source: agent)', async () => {
    // 1ère requête : client_parcours_agents → agent trouvé
    const agentChain = makeChain({
      data: {
        id: 'cpa-1',
        elio_lab_agent_id: AGENT_ID,
        elio_lab_agents: {
          id: AGENT_ID,
          name: 'Élio Branding',
          model: 'claude-opus-4-6',
          temperature: 0.8,
          image_path: 'https://example.com/fox.png',
          system_prompt: 'Tu es un expert en branding.',
        },
      },
      error: null,
    })
    // 2ème requête : client_step_contexts → pas de contexte
    const contextChain = makeChain({ data: null, error: null })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      return callCount === 1 ? agentChain : contextChain
    })

    const result = await getEffectiveStepConfig({
      stepId: STEP_ID,
      stepNumber: STEP_NUMBER,
      clientId: CLIENT_ID,
    })

    expect(result.error).toBeNull()
    expect(result.data?.source).toBe('agent')
    expect(result.data?.agentName).toBe('Élio Branding')
    expect(result.data?.model).toBe('claude-opus-4-6')
    expect(result.data?.temperature).toBe(0.8)
    expect(result.data?.agentImagePath).toBe('https://example.com/fox.png')
    expect(result.data?.systemPrompt).toBe('Tu es un expert en branding.')
    expect(result.data?.announcementMessage).toBeNull()
    expect(result.data?.contextId).toBeNull()
  })

  it('retourne le contexte non-consommé quand il existe (announcementMessage composé)', async () => {
    const agentChain = makeChain({
      data: {
        id: 'cpa-1',
        elio_lab_agent_id: AGENT_ID,
        elio_lab_agents: {
          id: AGENT_ID,
          name: 'Élio Vision',
          model: 'claude-sonnet-4-6',
          temperature: 1.0,
          image_path: null,
          system_prompt: 'Tu aides à définir la vision.',
        },
      },
      error: null,
    })
    const contextChain = makeChain({
      data: {
        id: CONTEXT_ID,
        context_message: 'Quelle est ta vision long terme ?',
        content_type: 'text',
        file_name: null,
      },
      error: null,
    })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      return callCount === 1 ? agentChain : contextChain
    })

    const result = await getEffectiveStepConfig({
      stepId: STEP_ID,
      stepNumber: STEP_NUMBER,
      clientId: CLIENT_ID,
    })

    expect(result.error).toBeNull()
    expect(result.data?.announcementMessage).toContain('MiKL a ajouté des précisions')
    expect(result.data?.announcementMessage).toContain('Quelle est ta vision long terme ?')
    expect(result.data?.contextId).toBe(CONTEXT_ID)
  })

  it('retourne la config globale en fallback quand aucun agent n\'est assigné (source: global)', async () => {
    // 1ère requête : client_parcours_agents → pas d'agent
    const noAgentChain = makeChain({ data: null, error: null })
    // 2ème requête : elio_configs → config globale (le contexte n'est PAS chargé en fallback)
    const globalChain = makeChain({
      data: { model: 'claude-haiku-4-5-20251001', temperature: 0.7 },
      error: null,
    })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return noAgentChain
      return globalChain
    })

    const result = await getEffectiveStepConfig({
      stepId: STEP_ID,
      stepNumber: STEP_NUMBER,
      clientId: CLIENT_ID,
    })

    expect(result.error).toBeNull()
    expect(result.data?.source).toBe('global')
    expect(result.data?.agentName).toBe('Élio')
    expect(result.data?.agentImagePath).toBeNull()
    expect(result.data?.systemPrompt).toBeNull()
    expect(result.data?.model).toBe('claude-haiku-4-5-20251001')
    expect(result.data?.temperature).toBe(0.7)
    expect(result.data?.announcementMessage).toBeNull()
    expect(result.data?.contextId).toBeNull()
  })

  it('utilise les valeurs par défaut si elio_configs est vide en fallback', async () => {
    const noAgentChain = makeChain({ data: null, error: null })
    const noGlobalChain = makeChain({ data: null, error: null })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return noAgentChain
      return noGlobalChain
    })

    const result = await getEffectiveStepConfig({
      stepId: STEP_ID,
      stepNumber: STEP_NUMBER,
      clientId: CLIENT_ID,
    })

    expect(result.error).toBeNull()
    expect(result.data?.source).toBe('global')
    expect(result.data?.model).toBe('claude-sonnet-4-6')
    expect(result.data?.temperature).toBe(1.0)
  })

  it('retourne une erreur DB si la requête contexte échoue (pas de fallback silencieux)', async () => {
    const agentChain = makeChain({
      data: {
        id: 'cpa-1',
        elio_lab_agent_id: AGENT_ID,
        elio_lab_agents: {
          id: AGENT_ID,
          name: 'Élio Vision',
          model: 'claude-sonnet-4-6',
          temperature: 1.0,
          image_path: null,
          system_prompt: null,
        },
      },
      error: null,
    })
    // Contexte en erreur — ne doit pas continuer silencieusement
    const contextErrorChain = makeChain({ data: null, error: { message: 'Timeout DB', code: '57014' } })

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      return callCount === 1 ? agentChain : contextErrorChain
    })

    const result = await getEffectiveStepConfig({
      stepId: STEP_ID,
      stepNumber: STEP_NUMBER,
      clientId: CLIENT_ID,
    })

    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('retourne une erreur DB si la requête agent échoue', async () => {
    const errorChain = makeChain({ data: null, error: { message: 'DB error', code: '42P01' } })
    mockFrom.mockReturnValue(errorChain)

    const result = await getEffectiveStepConfig({
      stepId: STEP_ID,
      stepNumber: STEP_NUMBER,
      clientId: CLIENT_ID,
    })

    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
