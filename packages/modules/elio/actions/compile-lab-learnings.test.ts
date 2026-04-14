import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { CommunicationProfile } from '@monprojetpro/types'

// ─── Mock chains ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

// elio_messages query
const mockMessagesOrder = vi.fn()
const mockMessagesNot = vi.fn(() => ({ order: mockMessagesOrder }))
const mockMessagesEqDashboard = vi.fn(() => ({ not: mockMessagesNot }))
const mockMessagesEqClient = vi.fn(() => ({ eq: mockMessagesEqDashboard }))
const mockMessagesSelect = vi.fn(() => ({ eq: mockMessagesEqClient }))

// client_configs select
const mockConfigSingle = vi.fn()
const mockConfigEqClient = vi.fn(() => ({ single: mockConfigSingle }))
const mockConfigSelect = vi.fn(() => ({ eq: mockConfigEqClient }))

// client_configs update
const mockUpdateEqClient = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEqClient }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'elio_messages') return { select: mockMessagesSelect }
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

const mockMessages = [
  { metadata: { profile_observation: 'Client préfère les listes à puces' } },
  { metadata: { profile_observation: 'Client répond mieux le matin' } },
  { metadata: { feedback: { rating: 'useful' } } }, // pas d'observation — filtré
]

const existingProfile: CommunicationProfile = {
  levelTechnical: 'advanced',
  styleExchange: 'direct',
  adaptedTone: 'coach',
  messageLength: 'court',
  tutoiement: true,
  concreteExamples: true,
  avoid: ['jargon'],
  privilege: ['listes'],
  styleNotes: 'Notes existantes',
}

const mockCurrentConfig = {
  elio_config: {
    tier: 'lab',
    communication_profile: existingProfile,
  },
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('compileLabLearnings Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockMessagesOrder.mockResolvedValue({ data: mockMessages, error: null })
    mockConfigSingle.mockResolvedValue({ data: mockCurrentConfig, error: null })
    mockUpdateEqClient.mockResolvedValue({ error: null })
  })

  it('returns INVALID_INPUT for invalid clientId', async () => {
    const { compileLabLearnings } = await import('./compile-lab-learnings')
    const result: ActionResponse<CommunicationProfile> = await compileLabLearnings('not-a-uuid')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('compiles observations into lab_learnings', async () => {
    const { compileLabLearnings } = await import('./compile-lab-learnings')
    const result = await compileLabLearnings(CLIENT_ID)

    expect(result.error).toBeNull()
    expect(result.data?.lab_learnings).toEqual([
      'Client préfère les listes à puces',
      'Client répond mieux le matin',
    ])
  })

  it('filters out messages without profile_observation', async () => {
    const { compileLabLearnings } = await import('./compile-lab-learnings')
    const result = await compileLabLearnings(CLIENT_ID)

    expect(result.data?.lab_learnings).toHaveLength(2)
  })

  it('preserves existing profile fields', async () => {
    const { compileLabLearnings } = await import('./compile-lab-learnings')
    const result = await compileLabLearnings(CLIENT_ID)

    expect(result.data?.levelTechnical).toBe('advanced')
    expect(result.data?.avoid).toEqual(['jargon'])
    expect(result.data?.styleNotes).toBe('Notes existantes')
  })

  it('compiles empty lab_learnings when no observations found', async () => {
    mockMessagesOrder.mockResolvedValue({ data: [], error: null })

    const { compileLabLearnings } = await import('./compile-lab-learnings')
    const result = await compileLabLearnings(CLIENT_ID)

    expect(result.error).toBeNull()
    expect(result.data?.lab_learnings).toEqual([])
  })

  it('uses DEFAULT_COMMUNICATION_PROFILE when no profile exists', async () => {
    mockConfigSingle.mockResolvedValue({
      data: { elio_config: { tier: 'lab' } },
      error: null,
    })

    const { compileLabLearnings } = await import('./compile-lab-learnings')
    const result = await compileLabLearnings(CLIENT_ID)

    expect(result.error).toBeNull()
    expect(result.data?.levelTechnical).toBe('intermediaire')
    expect(result.data?.lab_learnings).toHaveLength(2)
  })

  it('returns NOT_FOUND when client_config does not exist', async () => {
    mockConfigSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { compileLabLearnings } = await import('./compile-lab-learnings')
    const result = await compileLabLearnings(CLIENT_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns DATABASE_ERROR when update fails', async () => {
    mockUpdateEqClient.mockResolvedValue({ error: { message: 'DB error' } })

    const { compileLabLearnings } = await import('./compile-lab-learnings')
    const result = await compileLabLearnings(CLIENT_ID)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
