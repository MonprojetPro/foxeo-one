import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { CommunicationProfile } from '@monprojetpro/types'

// ─── Mock chains ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

// operators query
const mockOperatorSingle = vi.fn()
const mockOperatorEq = vi.fn(() => ({ single: mockOperatorSingle }))
const mockOperatorSelect = vi.fn(() => ({ eq: mockOperatorEq }))

// client_configs select chain
const mockConfigSingle = vi.fn()
const mockConfigEqOperator = vi.fn(() => ({ single: mockConfigSingle }))
const mockConfigEqClient = vi.fn(() => ({ eq: mockConfigEqOperator }))
const mockConfigSelect = vi.fn(() => ({ eq: mockConfigEqClient }))

// client_configs update chain
const mockUpdateEqOperator = vi.fn().mockResolvedValue({ error: null })
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

// ─── Constants ────────────────────────────────────────────────────────────────

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const OPERATOR_ID = '00000000-0000-0000-0000-000000000002'
const USER_ID = '00000000-0000-0000-0000-000000000003'

const validProfile: CommunicationProfile = {
  levelTechnical: 'intermediaire',
  styleExchange: 'conversationnel',
  adaptedTone: 'pro_decontracte',
  messageLength: 'moyen',
  tutoiement: false,
  concreteExamples: true,
  avoid: ['jargon technique'],
  privilege: ['listes à puces'],
  styleNotes: 'Client préfère des réponses concises',
}

const mockCurrentConfig = {
  elio_config: { tier: 'lab' },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('updateCommunicationProfile (CRM) Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mockOperatorSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })
    mockConfigSingle.mockResolvedValue({ data: mockCurrentConfig, error: null })
    mockUpdateEqOperator.mockResolvedValue({ error: null })
  })

  it('returns INVALID_INPUT for invalid clientId', async () => {
    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result: ActionResponse<CommunicationProfile> = await updateCommunicationProfile('not-a-uuid', validProfile)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('returns VALIDATION_ERROR for invalid profile data', async () => {
    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const invalidProfile = { ...validProfile, levelTechnical: 'expert' as unknown }
    const result = await updateCommunicationProfile(CLIENT_ID, invalidProfile as CommunicationProfile)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result = await updateCommunicationProfile(CLIENT_ID, validProfile)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns NOT_FOUND when operator does not exist', async () => {
    mockOperatorSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result = await updateCommunicationProfile(CLIENT_ID, validProfile)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns NOT_FOUND when client_config does not exist', async () => {
    mockConfigSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result = await updateCommunicationProfile(CLIENT_ID, validProfile)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns DATABASE_ERROR when update fails', async () => {
    mockUpdateEqOperator.mockResolvedValue({ error: { message: 'DB error' } })

    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result = await updateCommunicationProfile(CLIENT_ID, validProfile)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('returns updated profile on success', async () => {
    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result = await updateCommunicationProfile(CLIENT_ID, validProfile)

    expect(result.error).toBeNull()
    expect(result.data?.levelTechnical).toBe('intermediaire')
    expect(result.data?.avoid).toEqual(['jargon technique'])
    expect(result.data?.privilege).toEqual(['listes à puces'])
  })

  it('preserves existing elio_config fields when updating', async () => {
    const { updateCommunicationProfile } = await import('./update-communication-profile')
    await updateCommunicationProfile(CLIENT_ID, validProfile)

    // Verify update was called with merged config (preserving tier)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        elio_config: expect.objectContaining({
          tier: 'lab',
          communication_profile: expect.objectContaining({ levelTechnical: 'intermediaire' }),
        }),
      })
    )
  })

  it('handles profile with lab_learnings', async () => {
    const profileWithLearnings: CommunicationProfile = {
      ...validProfile,
      lab_learnings: ['Préfère les listes', 'Répond mieux le matin'],
    }

    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result = await updateCommunicationProfile(CLIENT_ID, profileWithLearnings)

    expect(result.error).toBeNull()
    expect(result.data?.lab_learnings).toEqual(['Préfère les listes', 'Répond mieux le matin'])
  })
})
