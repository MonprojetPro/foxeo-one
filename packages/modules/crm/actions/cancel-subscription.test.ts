import { describe, it, expect, vi, beforeEach } from 'vitest'

const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440000'
const validClientUuid = '550e8400-e29b-41d4-a716-446655440001'

// Chaîne clients : .select().eq().eq().maybeSingle()
const mockClientMaybeSingle = vi.fn()
const mockUpdatePayload = vi.fn()
const mockUpdateEqSecond = vi.fn().mockResolvedValue({ error: null })
const mockUpdateEq = vi.fn(() => ({ eq: mockUpdateEqSecond }))
const mockUpdate = vi.fn((payload: Record<string, unknown>) => {
  mockUpdatePayload(payload)
  return { eq: mockUpdateEq }
})

const mockLogInsert = vi.fn().mockResolvedValue({ error: null })

const mockOpSingle = vi.fn()
const mockOpEq = vi.fn(() => ({ single: mockOpSingle }))
const mockOpSelect = vi.fn(() => ({ eq: mockOpEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOpSelect }
  if (table === 'clients') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mockClientMaybeSingle })) })),
      })),
      update: mockUpdate,
    }
  }
  if (table === 'activity_logs') return { insert: mockLogInsert }
  return {}
})

const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('cancelSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateEqSecond.mockResolvedValue({ error: null })
    mockLogInsert.mockResolvedValue({ error: null })
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-op' } }, error: null })
  })

  it('rejette un clientId non-UUID avant tout accès base', async () => {
    const { cancelSubscription } = await import('./cancel-subscription')
    const result = await cancelSubscription({ clientId: 'pas-un-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('refuse un utilisateur non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'nope' } })

    const { cancelSubscription } = await import('./cancel-subscription')
    const result = await cancelSubscription({ clientId: validClientUuid })

    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('refuse un utilisateur qui n’est pas opérateur', async () => {
    mockOpSingle.mockResolvedValue({ data: null, error: { message: 'none' } })

    const { cancelSubscription } = await import('./cancel-subscription')
    const result = await cancelSubscription({ clientId: validClientUuid })

    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('passe un client actif en subscription_cancelled et mémorise son statut précédent', async () => {
    mockClientMaybeSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'active' },
      error: null,
    })

    const { cancelSubscription } = await import('./cancel-subscription')
    const result = await cancelSubscription({ clientId: validClientUuid })

    expect(result.error).toBeNull()
    expect(mockUpdatePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'subscription_cancelled',
        previous_status: 'active',
      })
    )
  })

  it('ne touche JAMAIS active_modules — la réactivation doit être non destructive', async () => {
    mockClientMaybeSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'active' },
      error: null,
    })

    const { cancelSubscription } = await import('./cancel-subscription')
    await cancelSubscription({ clientId: validClientUuid })

    const payload = mockUpdatePayload.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload).not.toHaveProperty('active_modules')
    expect(mockFrom).not.toHaveBeenCalledWith('client_configs')
  })

  it('journalise l’action dans activity_logs', async () => {
    mockClientMaybeSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'active' },
      error: null,
    })

    const { cancelSubscription } = await import('./cancel-subscription')
    await cancelSubscription({ clientId: validClientUuid, reason: 'fin de mission' })

    expect(mockLogInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_type: 'operator',
        action: 'subscription_cancelled',
        entity_id: validClientUuid,
      })
    )
  })

  it('refuse de résilier deux fois', async () => {
    mockClientMaybeSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'subscription_cancelled' },
      error: null,
    })

    const { cancelSubscription } = await import('./cancel-subscription')
    const result = await cancelSubscription({ clientId: validClientUuid })

    expect(result.error?.code).toBe('ALREADY_CANCELLED')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('refuse de résilier un client archivé', async () => {
    mockClientMaybeSingle.mockResolvedValue({
      data: { id: validClientUuid, status: 'archived' },
      error: null,
    })

    const { cancelSubscription } = await import('./cancel-subscription')
    const result = await cancelSubscription({ clientId: validClientUuid })

    expect(result.error?.code).toBe('INVALID_STATUS')
  })

  it('retourne NOT_FOUND si le client n’appartient pas à l’opérateur', async () => {
    mockClientMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { cancelSubscription } = await import('./cancel-subscription')
    const result = await cancelSubscription({ clientId: validClientUuid })

    expect(result.error?.code).toBe('NOT_FOUND')
  })
})

describe('reactivateSubscription — réversibilité', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateEqSecond.mockResolvedValue({ error: null })
    mockLogInsert.mockResolvedValue({ error: null })
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-op' } }, error: null })
  })

  it('rend l’accès complet en restaurant le statut d’avant la résiliation', async () => {
    mockClientMaybeSingle.mockResolvedValue({
      data: { status: 'subscription_cancelled', previous_status: 'active' },
      error: null,
    })

    const { reactivateSubscription } = await import('./cancel-subscription')
    const result = await reactivateSubscription({ clientId: validClientUuid })

    expect(result.error).toBeNull()
    expect(mockUpdatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', previous_status: null })
    )
  })

  it('restaure `suspended` si c’était bien l’état de départ', async () => {
    mockClientMaybeSingle.mockResolvedValue({
      data: { status: 'subscription_cancelled', previous_status: 'suspended' },
      error: null,
    })

    const { reactivateSubscription } = await import('./cancel-subscription')
    await reactivateSubscription({ clientId: validClientUuid })

    expect(mockUpdatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'suspended' })
    )
  })

  it('retombe sur `active` quand aucun statut précédent n’est mémorisé', async () => {
    mockClientMaybeSingle.mockResolvedValue({
      data: { status: 'handed_off', previous_status: null },
      error: null,
    })

    const { reactivateSubscription } = await import('./cancel-subscription')
    await reactivateSubscription({ clientId: validClientUuid })

    expect(mockUpdatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' })
    )
  })

  it('refuse de réactiver un abonnement qui n’est pas résilié', async () => {
    mockClientMaybeSingle.mockResolvedValue({
      data: { status: 'active', previous_status: null },
      error: null,
    })

    const { reactivateSubscription } = await import('./cancel-subscription')
    const result = await reactivateSubscription({ clientId: validClientUuid })

    expect(result.error?.code).toBe('INVALID_STATUS')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('journalise la réactivation', async () => {
    mockClientMaybeSingle.mockResolvedValue({
      data: { status: 'subscription_cancelled', previous_status: 'active' },
      error: null,
    })

    const { reactivateSubscription } = await import('./cancel-subscription')
    await reactivateSubscription({ clientId: validClientUuid })

    expect(mockLogInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'subscription_reactivated' })
    )
  })
})
