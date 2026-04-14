import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { CommunicationProfile } from '@monprojetpro/types'

// ─── Mock chains ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

// operators: .select('id').eq('auth_user_id', ...).single()
const mockOperatorSingle = vi.fn()
const mockOperatorEq = vi.fn(() => ({ single: mockOperatorSingle }))
const mockOperatorSelect = vi.fn(() => ({ eq: mockOperatorEq }))

// client_configs select: .select('elio_config').eq('client_id', ...).eq('operator_id', ...).single()
const mockConfigSingle = vi.fn()
const mockConfigEqOperator = vi.fn(() => ({ single: mockConfigSingle }))
const mockConfigEqClient = vi.fn(() => ({ eq: mockConfigEqOperator }))
const mockConfigSelect = vi.fn(() => ({ eq: mockConfigEqClient }))

// client_configs update: .update({...}).eq('client_id', ...).eq('operator_id', ...)
const mockUpdateEqOperator = vi.fn()
const mockUpdateEqClient = vi.fn(() => ({ eq: mockUpdateEqOperator }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEqClient }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOperatorSelect }
  if (table === 'client_configs') return { select: mockConfigSelect, update: mockUpdate }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock('@monprojetpro/utils', () => ({
  DEFAULT_COMMUNICATION_PROFILE: {
    levelTechnical: 'intermediaire',
    styleExchange: 'conversationnel',
    adaptedTone: 'pro_decontracte',
    messageLength: 'moyen',
    tutoiement: false,
    concreteExamples: true,
    avoid: [],
    privilege: [],
    styleNotes: '',
  },
}))

// ─── Constants ────────────────────────────────────────────────────────────────

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000002'
const USER_ID = '00000000-0000-0000-0000-000000000003'

const existingProfile: CommunicationProfile = {
  levelTechnical: 'intermediaire',
  styleExchange: 'conversationnel',
  adaptedTone: 'pro_decontracte',
  messageLength: 'moyen',
  tutoiement: false,
  concreteExamples: true,
  avoid: ['jargon'],
  privilege: ['listes'],
  styleNotes: 'Note initiale',
}

const mockCurrentConfig = {
  elio_config: {
    tier: 'lab',
    communication_profile: existingProfile,
  },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('integrateObservation Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mockOperatorSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    mockConfigSingle.mockResolvedValue({ data: mockCurrentConfig, error: null })
    mockUpdateEqOperator.mockResolvedValue({ error: null })
  })

  it('returns INVALID_INPUT for invalid clientId', async () => {
    const { integrateObservation } = await import('./integrate-observation')
    const result: ActionResponse<CommunicationProfile> = await integrateObservation({
      clientId: 'not-a-uuid',
      observation: 'Client préfère les listes',
      target: 'privilege',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('returns INVALID_INPUT for empty observation', async () => {
    const { integrateObservation } = await import('./integrate-observation')
    const result = await integrateObservation({
      clientId: CLIENT_ID,
      observation: '   ',
      target: 'avoid',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('returns INVALID_INPUT for invalid target', async () => {
    const { integrateObservation } = await import('./integrate-observation')
    const result = await integrateObservation({
      clientId: CLIENT_ID,
      observation: 'Observation',
      target: 'invalid' as 'avoid',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { integrateObservation } = await import('./integrate-observation')
    const result = await integrateObservation({
      clientId: CLIENT_ID,
      observation: 'Observation',
      target: 'avoid',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns NOT_FOUND when operator does not exist', async () => {
    mockOperatorSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { integrateObservation } = await import('./integrate-observation')
    const result = await integrateObservation({
      clientId: CLIENT_ID,
      observation: 'Observation',
      target: 'avoid',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('appends observation to avoid array', async () => {
    const { integrateObservation } = await import('./integrate-observation')
    const result = await integrateObservation({
      clientId: CLIENT_ID,
      observation: 'questions répétitives',
      target: 'avoid',
    })

    expect(result.error).toBeNull()
    expect(result.data?.avoid).toEqual(['jargon', 'questions répétitives'])
  })

  it('appends observation to privilege array', async () => {
    const { integrateObservation } = await import('./integrate-observation')
    const result = await integrateObservation({
      clientId: CLIENT_ID,
      observation: 'questions fermées',
      target: 'privilege',
    })

    expect(result.error).toBeNull()
    expect(result.data?.privilege).toEqual(['listes', 'questions fermées'])
  })

  it('appends observation to styleNotes with newline', async () => {
    const { integrateObservation } = await import('./integrate-observation')
    const result = await integrateObservation({
      clientId: CLIENT_ID,
      observation: 'Répond mieux le matin',
      target: 'styleNotes',
    })

    expect(result.error).toBeNull()
    expect(result.data?.styleNotes).toBe('Note initiale\nRépond mieux le matin')
  })

  it('sets styleNotes directly when empty', async () => {
    mockConfigSingle.mockResolvedValue({
      data: {
        elio_config: {
          communication_profile: { ...existingProfile, styleNotes: '' },
        },
      },
      error: null,
    })

    const { integrateObservation } = await import('./integrate-observation')
    const result = await integrateObservation({
      clientId: CLIENT_ID,
      observation: 'Nouvelle note',
      target: 'styleNotes',
    })

    expect(result.error).toBeNull()
    expect(result.data?.styleNotes).toBe('Nouvelle note')
  })

  it('uses DEFAULT_COMMUNICATION_PROFILE when no profile exists', async () => {
    mockConfigSingle.mockResolvedValue({
      data: { elio_config: { tier: 'lab' } },
      error: null,
    })

    const { integrateObservation } = await import('./integrate-observation')
    const result = await integrateObservation({
      clientId: CLIENT_ID,
      observation: 'jargon technique',
      target: 'avoid',
    })

    expect(result.error).toBeNull()
    expect(result.data?.avoid).toEqual(['jargon technique'])
  })

  it('returns DATABASE_ERROR when update fails', async () => {
    mockUpdateEqOperator.mockResolvedValue({ error: { message: 'DB error' } })

    const { integrateObservation } = await import('./integrate-observation')
    const result = await integrateObservation({
      clientId: CLIENT_ID,
      observation: 'Test',
      target: 'avoid',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
