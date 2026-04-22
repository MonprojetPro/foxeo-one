import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'

// ─── Mock Anthropic SDK ────────────────────────────────────────────────────────

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: { create: mockCreate },
  })),
}))

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

// parcours_steps
const mockStepSingle = vi.fn()
const mockStepEq = vi.fn(() => ({ single: mockStepSingle }))
const mockStepSelect = vi.fn(() => ({ eq: mockStepEq }))

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
  if (table === 'parcours_steps') return { select: mockStepSelect }
  if (table === 'elio_conversations') return { select: mockConvSelect }
  if (table === 'elio_messages') return { select: mockMsgSelect }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_ID = '00000000-0000-0000-0000-000000000010'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const USER_ID = '00000000-0000-0000-0000-000000000003'
const CONV_ID = '00000000-0000-0000-0000-000000000050'

const mockStep = {
  id: STEP_ID,
  step_number: 1,
  title: 'Valider mon concept',
  description: 'Décrire et valider votre concept',
  brief_template: '## Template\n- Point 1\n- Point 2',
  status: 'current',
  parcours: { client_id: CLIENT_ID },
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
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')

    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mockStepSingle.mockResolvedValue({ data: mockStep, error: null })
    mockConvMaybeSingle.mockResolvedValue({ data: { id: CONV_ID }, error: null })
    mockMsgLimit.mockResolvedValue({ data: mockMessages, error: null })
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '## Mon Document\n\nContenu généré.' }],
    })
  })

  it('returns CONFIG_ERROR when ANTHROPIC_API_KEY is missing', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result: ActionResponse<{ document: string }> = await generateDocumentFromConversation({
      stepId: STEP_ID,
      clientId: CLIENT_ID,
    })
    expect(result.error?.code).toBe('CONFIG_ERROR')
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns NOT_FOUND when step does not exist', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    mockStepSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns FORBIDDEN when step does not belong to client', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    mockStepSingle.mockResolvedValue({
      data: { ...mockStep, parcours: { client_id: 'other-client-id' } },
      error: null,
    })
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('generates document when no conversation exists', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    mockConvMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error).toBeNull()
    expect(result.data?.document).toBeDefined()
  })

  it('returns the generated document on success', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error).toBeNull()
    expect(result.data?.document).toBe('## Mon Document\n\nContenu généré.')
  })

  it('returns API_ERROR when Anthropic returns empty content', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: '' }] })
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error?.code).toBe('API_ERROR')
  })

  it('returns API_ERROR when Anthropic throws', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    mockCreate.mockRejectedValue(new Error('Network error'))
    const { generateDocumentFromConversation } = await import('./generate-and-submit-step')
    const result = await generateDocumentFromConversation({ stepId: STEP_ID, clientId: CLIENT_ID })
    expect(result.error?.code).toBe('API_ERROR')
  })
})
