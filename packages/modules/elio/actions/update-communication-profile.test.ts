import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { CommunicationProfile } from '../types/communication-profile.types'

// ─── Mock chains ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

// clients query
const mockClientSingle = vi.fn()
const mockClientEq = vi.fn(() => ({ single: mockClientSingle }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq }))

// communication_profiles update chain
const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockProfileUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

// communication_profiles select chain (empty payload path)
const mockProfileSelectSingle = vi.fn()
const mockProfileSelectEq = vi.fn(() => ({ single: mockProfileSelectSingle }))
const mockProfileSelect = vi.fn(() => ({ eq: mockProfileSelectEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'clients') return { select: mockClientSelect }
  if (table === 'communication_profiles') return { update: mockProfileUpdate, select: mockProfileSelect }
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
  preferred_tone: 'formal',
  preferred_length: 'concise',
  interaction_style: 'directive',
  context_preferences: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('updateCommunicationProfile Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })
    mockClientSingle.mockResolvedValue({ data: mockClient, error: null })
    mockUpdateSingle.mockResolvedValue({ data: mockProfileDB, error: null })
    mockProfileSelectSingle.mockResolvedValue({ data: mockProfileDB, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result: ActionResponse<CommunicationProfile> = await updateCommunicationProfile({
      clientId: CLIENT_ID,
      preferredTone: 'formal',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result = await updateCommunicationProfile({ clientId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when client does not exist', async () => {
    mockClientSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result = await updateCommunicationProfile({ clientId: CLIENT_ID, preferredTone: 'casual' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns DATABASE_ERROR when update fails', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result = await updateCommunicationProfile({ clientId: CLIENT_ID, preferredTone: 'formal' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('updates profile and returns updated data on success', async () => {
    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result = await updateCommunicationProfile({
      clientId: CLIENT_ID,
      preferredTone: 'formal',
      preferredLength: 'concise',
    })

    expect(result.error).toBeNull()
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.data?.preferredTone).toBe('formal')
  })

  it('succeeds with no fields to update (empty patch)', async () => {
    mockProfileSelectSingle.mockResolvedValue({
      data: { ...mockProfileDB, preferred_tone: 'friendly' },
      error: null,
    })

    const { updateCommunicationProfile } = await import('./update-communication-profile')
    const result = await updateCommunicationProfile({ clientId: CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data?.preferredTone).toBe('friendly')
  })
})
