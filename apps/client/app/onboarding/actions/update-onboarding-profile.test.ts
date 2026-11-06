import { describe, it, expect, vi, beforeEach } from 'vitest'

const getUser = vi.fn()
const signOut = vi.fn()
const rpcMock = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser, signOut },
      rpc: rpcMock,
    })
  ),
}))

import { updateOnboardingProfile } from './update-onboarding-profile'

const validInput = {
  firstName: 'Jean',
  name: 'ACME SARL',
  contact: '',
  phone: '0600000000',
  sector: 'Santé',
  website: '',
}

describe('updateOnboardingProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    signOut.mockResolvedValue({ error: null })
    // T-078 — même défaut RLS que T-076 (DEP-011) : passe par la RPC SECURITY
    // DEFINER dédiée, pas un .update() direct qui serait filtré en silence.
    rpcMock.mockResolvedValue({ data: true, error: null })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'no' } })
    const result = await updateOnboardingProfile(validInput)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR when name is empty', async () => {
    const result = await updateOnboardingProfile({ ...validInput, name: '  ' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('calls fn_update_onboarding_profile with the right params, then completes onboarding and signs out', async () => {
    const result = await updateOnboardingProfile(validInput)

    expect(result.error).toBeNull()
    expect(rpcMock).toHaveBeenCalledWith('fn_update_onboarding_profile', {
      p_first_name: 'Jean',
      p_name: 'ACME SARL',
      p_contact: '',
      p_phone: '0600000000',
      p_sector: 'Santé',
      p_website: '',
    })
    expect(rpcMock).toHaveBeenCalledWith('fn_complete_client_onboarding')
    expect(signOut).toHaveBeenCalled()
  })

  it('returns DATABASE_ERROR when the profile RPC fails, without completing onboarding', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    const result = await updateOnboardingProfile(validInput)
    expect(result.error?.code).toBe('DATABASE_ERROR')
    expect(signOut).not.toHaveBeenCalled()
  })

  it('returns DATABASE_ERROR when completing onboarding fails, without signing out', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: true, error: null }) // fn_update_onboarding_profile
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } }) // fn_complete_client_onboarding
    const result = await updateOnboardingProfile(validInput)
    expect(result.error?.code).toBe('DATABASE_ERROR')
    expect(signOut).not.toHaveBeenCalled()
  })
})
