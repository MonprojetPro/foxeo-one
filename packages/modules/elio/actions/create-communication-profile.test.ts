import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { CommunicationProfile } from '../types/communication-profile.types'

// ─── Mock chains ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

// clients query
const mockClientSingle = vi.fn()
const mockClientEq = vi.fn(() => ({ single: mockClientSingle }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq }))

// communication_profiles insert
const mockInsertSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
const mockProfileInsert = vi.fn(() => ({ select: mockInsertSelect }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'clients') return { select: mockClientSelect }
  if (table === 'communication_profiles') return { insert: mockProfileInsert }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

// ─── Constants ────────────────────────────────────────────────────────────────

const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const PROFILE_ID = '00000000-0000-0000-0000-000000000099'
const USER_ID = '00000000-0000-0000-0000-000000000003'

const mockClient = { id: CLIENT_ID, auth_user_id: USER_ID }
const mockProfileDB = {
  id: PROFILE_ID,
  client_id: CLIENT_ID,
  preferred_tone: 'friendly',
  preferred_length: 'balanced',
  interaction_style: 'collaborative',
  context_preferences: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('createCommunicationProfile Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mockClientSingle.mockResolvedValue({ data: mockClient, error: null })
    mockInsertSingle.mockResolvedValue({ data: mockProfileDB, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { createCommunicationProfile } = await import('./create-communication-profile')
    const result: ActionResponse<CommunicationProfile> = await createCommunicationProfile({
      clientId: CLIENT_ID,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const { createCommunicationProfile } = await import('./create-communication-profile')
    const result = await createCommunicationProfile({ clientId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when client does not exist', async () => {
    mockClientSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { createCommunicationProfile } = await import('./create-communication-profile')
    const result = await createCommunicationProfile({ clientId: CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns DATABASE_ERROR when insert fails', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { createCommunicationProfile } = await import('./create-communication-profile')
    const result = await createCommunicationProfile({ clientId: CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('creates profile with default values when no preferences provided', async () => {
    const { createCommunicationProfile } = await import('./create-communication-profile')
    const result = await createCommunicationProfile({ clientId: CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.data?.preferredTone).toBe('friendly')
    expect(result.data?.preferredLength).toBe('balanced')
    expect(result.data?.interactionStyle).toBe('collaborative')
  })

  it('creates profile with provided custom values', async () => {
    mockInsertSingle.mockResolvedValue({
      data: { ...mockProfileDB, preferred_tone: 'formal', preferred_length: 'concise', interaction_style: 'directive' },
      error: null,
    })

    const { createCommunicationProfile } = await import('./create-communication-profile')
    const result = await createCommunicationProfile({
      clientId: CLIENT_ID,
      preferredTone: 'formal',
      preferredLength: 'concise',
      interactionStyle: 'directive',
    })

    expect(result.error).toBeNull()
    expect(result.data?.preferredTone).toBe('formal')
    expect(result.data?.preferredLength).toBe('concise')
    expect(result.data?.interactionStyle).toBe('directive')
  })
})
