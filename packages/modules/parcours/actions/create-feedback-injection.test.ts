import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFeedbackInjection } from './create-feedback-injection'

const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()
const mockInsertChain = { select: vi.fn(), single: mockSingle }
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
    from: mockFrom,
  })),
}))

const STEP_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const CLIENT_ID = 'bbbbbbbb-0000-0000-0000-000000000002'
const USER_ID = 'cccccccc-0000-0000-0000-000000000003'
const INJECTION_ID = 'dddddddd-0000-0000-0000-000000000004'
const CONV_ID = 'eeeeeeee-0000-0000-0000-000000000005'

function buildSupabaseMock({
  isOperator = true,
  injectionId = INJECTION_ID,
  insertError = null,
  hasConversation = true,
  stepNumber = 3,
}: {
  isOperator?: boolean
  injectionId?: string
  insertError?: { message: string } | null
  hasConversation?: boolean
  stepNumber?: number
} = {}) {
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
  mockRpc.mockResolvedValue({ data: isOperator, error: null })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'step_feedback_injections') {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              insertError
                ? { data: null, error: insertError }
                : { data: { id: injectionId }, error: null }
            ),
          }),
        }),
      }
    }
    if (table === 'elio_conversations') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(
              hasConversation
                ? { data: { id: CONV_ID }, error: null }
                : { data: null, error: null }
            ),
          }),
        }),
      }
    }
    if (table === 'elio_messages') {
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
    }
    if (table === 'parcours_steps') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { step_number: stepNumber }, error: null }),
          }),
        }),
      }
    }
    if (table === 'notifications') {
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
    }
    return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
  })
}

describe('createFeedbackInjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne VALIDATION_ERROR si stepId invalide', async () => {
    const result = await createFeedbackInjection({
      stepId: 'not-a-uuid',
      clientId: CLIENT_ID,
      content: 'Test',
      type: 'text_feedback',
    })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne UNAUTHORIZED si utilisateur non connecté', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('not auth') })
    mockFrom.mockReturnValue({})
    mockRpc.mockResolvedValue({ data: false, error: null })

    const result = await createFeedbackInjection({
      stepId: STEP_ID,
      clientId: CLIENT_ID,
      content: 'Test',
      type: 'text_feedback',
    })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne FORBIDDEN si non-opérateur', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mockRpc.mockResolvedValue({ data: false, error: null })
    mockFrom.mockReturnValue({})

    const result = await createFeedbackInjection({
      stepId: STEP_ID,
      clientId: CLIENT_ID,
      content: 'Questions MiKL',
      type: 'elio_questions',
    })
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('crée une injection text_feedback avec succès', async () => {
    buildSupabaseMock()

    const result = await createFeedbackInjection({
      stepId: STEP_ID,
      clientId: CLIENT_ID,
      content: 'Pensez à détailler votre proposition de valeur',
      type: 'text_feedback',
    })

    expect(result.error).toBeNull()
    expect(result.data?.injectionId).toBe(INJECTION_ID)
  })

  it('crée une injection elio_questions et insère dans elio_messages si conversation existe', async () => {
    buildSupabaseMock({ hasConversation: true })

    const result = await createFeedbackInjection({
      stepId: STEP_ID,
      clientId: CLIENT_ID,
      content: 'Quelle est votre cible principale ?',
      type: 'elio_questions',
    })

    expect(result.error).toBeNull()
    expect(result.data?.injectionId).toBe(INJECTION_ID)
  })

  it("ne tente pas d'injecter dans elio_messages si pas de conversation", async () => {
    buildSupabaseMock({ hasConversation: false })

    const result = await createFeedbackInjection({
      stepId: STEP_ID,
      clientId: CLIENT_ID,
      content: 'Quelle est votre cible ?',
      type: 'elio_questions',
    })

    // L'injection DB est créée mais elio_messages n'est pas inséré (pas de conversation)
    expect(result.error).toBeNull()
    expect(result.data?.injectionId).toBe(INJECTION_ID)
  })

  it('retourne DB_ERROR si l\'insertion échoue', async () => {
    buildSupabaseMock({ insertError: { message: 'constraint violation' } })

    const result = await createFeedbackInjection({
      stepId: STEP_ID,
      clientId: CLIENT_ID,
      content: 'Test',
      type: 'text_feedback',
    })

    expect(result.error?.code).toBe('DB_ERROR')
  })
})
