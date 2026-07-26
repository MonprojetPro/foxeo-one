import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'

// ─── Mock get-effective-elio-config ──────────────────────────────────────────

vi.mock('./get-effective-elio-config', () => ({
  getEffectiveElioConfig: vi.fn().mockResolvedValue({
    data: {
      model: 'claude-sonnet-4-6',
      temperature: 1.0,
      maxTokens: 2000,
      customInstructions: null,
      personaName: 'Élio',
      source: 'global',
    },
    error: null,
  }),
}))

// ─── Mock Supabase chains ─────────────────────────────────────────────────────

const mockGetUser = vi.fn()
const mockFunctionsInvoke = vi.fn()

// client_parcours_agents
const mockStepSingle = vi.fn()
const mockStepEq = vi.fn(() => ({ single: mockStepSingle }))
const mockStepSelect = vi.fn(() => ({ eq: mockStepEq }))

// clients
const mockClientSingle = vi.fn()
const mockClientEq = vi.fn(() => ({ single: mockClientSingle }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq }))

// elio_conversations
const mockConvMaybeSingle = vi.fn()
const mockConvEq2 = vi.fn(() => ({ maybeSingle: mockConvMaybeSingle }))
const mockConvEq1 = vi.fn(() => ({ eq: mockConvEq2 }))
const mockConvSelect = vi.fn(() => ({ eq: mockConvEq1 }))

// elio_messages
const mockMsgLimit = vi.fn()
const mockMsgOrder = vi.fn(() => ({ limit: mockMsgLimit }))
const mockMsgEq = vi.fn(() => ({ order: mockMsgOrder }))
const mockMsgSelect = vi.fn(() => ({ eq: mockMsgEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'client_parcours_agents') return { select: mockStepSelect }
  if (table === 'clients') return { select: mockClientSelect }
  if (table === 'elio_conversations') return { select: mockConvSelect }
  if (table === 'elio_messages') return { select: mockMsgSelect }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  // Espace figé : par défaut le client est autorisé à écrire (client actif).
  checkClientWriteAllowed: vi.fn(async () => null),
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    functions: { invoke: mockFunctionsInvoke },
  })),
}))

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_ID = '00000000-0000-0000-0000-000000000010'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const USER_ID = '00000000-0000-0000-0000-000000000003'
const CONV_ID = '00000000-0000-0000-0000-000000000050'

const mockStep = {
  id: STEP_ID,
  step_order: 1,
  step_label: 'Valider mon concept',
  client_id: CLIENT_ID,
  elio_lab_agents: { name: 'Agent Concept', description: 'Valider et affiner votre concept' },
}

const mockMessages = [
  { role: 'assistant', content: 'Bonjour !' },
  { role: 'user', content: 'Mon concept est...' },
  { role: 'assistant', content: 'Très intéressant.' },
]

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateDocumentFromConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mockStepSingle.mockResolvedValue({ data: mockStep, error: null })
    mockClientSingle.mockResolvedValue({ data: { first_name: 'Alice', name: 'Alice Martin' }, error: null })
    mockConvMaybeSingle.mockResolvedValue({ data: { id: CONV_ID }, error: null })
    mockMsgLimit.mockResolvedValue({ data: mockMessages, error: null })
    mockFunctionsInvoke.mockResolvedValue({
      data: { content: '## Mon Document\n\nContenu généré.' },
      error: null,
    })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns NOT_FOUND when step does not exist', async () => {
    mockStepSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns FORBIDDEN when step does not belong to client', async () => {
    mockStepSingle.mockResolvedValue({
      data: { ...mockStep, client_id: 'other-client-id' },
      error: null,
    })
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('generates document when no conversation exists', async () => {
    mockConvMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error).toBeNull()
    expect(result.data?.document).toBeDefined()
  })

  it('returns the generated document on success', async () => {
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result: ActionResponse<{ document: string }> = await generateDocumentFromConversation({
      stepId: STEP_ID,
      clientId: CLIENT_ID,
    })
    expect(result.error).toBeNull()
    expect(result.data?.document).toBe('## Mon Document\n\nContenu généré.')
  })

  it('returns API_ERROR when edge function fails', async () => {
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: { message: 'Function error' } })
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error?.code).toBe('API_ERROR')
  })

  it('returns API_ERROR when edge function returns empty content', async () => {
    mockFunctionsInvoke.mockResolvedValue({ data: { content: '' }, error: null })
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error?.code).toBe('API_ERROR')
  })
})
