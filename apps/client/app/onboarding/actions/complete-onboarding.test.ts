import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @monprojetpro/supabase
vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

// Mock @monprojetpro/types
vi.mock('@monprojetpro/types', () => ({
  successResponse: vi.fn((data) => ({ data, error: null })),
  errorResponse: vi.fn((message, code, details?) => ({
    data: null,
    error: { message, code, details },
  })),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { completeOnboarding } from './complete-onboarding'

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
}

describe('completeOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })

    const result = await completeOnboarding()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns NOT_FOUND when client record does not exist', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    const fromChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    mockSupabase.from.mockReturnValue(fromChain)

    const result = await completeOnboarding()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns DATABASE_ERROR when the RPC errors', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    const dbError = { message: 'DB error', code: 'PGRST001' }

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'client-456', onboarding_completed: false },
        error: null,
      }),
    })
    mockSupabase.rpc.mockResolvedValue({ data: null, error: dbError })

    const result = await completeOnboarding()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  // T-076 — un .update() direct était filtré en silence par la RLS (aucune policy
  // n'autorise un client à modifier sa propre fiche) : updateError restait toujours
  // null, donc cette action répondait "succès" sans que onboarding_completed ne
  // passe jamais à true en base. La RPC renvoie explicitement false dans ce cas.
  it('returns DATABASE_ERROR when the RPC succeeds but updates no row', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'client-456', onboarding_completed: false },
        error: null,
      }),
    })
    mockSupabase.rpc.mockResolvedValue({ data: false, error: null })

    const result = await completeOnboarding()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('returns success with redirect to /modules/parcours when parcours exists', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // select client
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'client-456', onboarding_completed: false },
            error: null,
          }),
        }
      }
      // select parcours
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'parcours-789' },
          error: null,
        }),
      }
    })
    mockSupabase.rpc.mockResolvedValue({ data: true, error: null })

    const result = await completeOnboarding()

    expect(result.error).toBeNull()
    expect(result.data?.clientId).toBe('client-456')
    expect(result.data?.redirectTo).toBe('/modules/parcours')
  })

  it('returns success with redirect to / when no parcours', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'client-456', onboarding_completed: false },
            error: null,
          }),
        }
      }
      // No parcours
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    })
    mockSupabase.rpc.mockResolvedValue({ data: true, error: null })

    const result = await completeOnboarding()

    expect(result.error).toBeNull()
    expect(result.data?.redirectTo).toBe('/')
  })

  // T-076 — appeler Terminer une 2e fois (ex. double-clic) alors que onboarding_completed
  // est déjà true ne doit pas être traité comme un échec : la RPC renvoie false (aucune
  // ligne à modifier) mais c'est l'état déjà en base qui tranche, pas la RPC seule.
  it('treats a second call as success when onboarding_completed is already true', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'client-456', onboarding_completed: true },
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    })
    mockSupabase.rpc.mockResolvedValue({ data: false, error: null })

    const result = await completeOnboarding()

    expect(result.error).toBeNull()
  })
})
