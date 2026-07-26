import { describe, it, expect, vi, beforeEach } from 'vitest'

const getUserMock = vi.fn()
const maybeSingleMock = vi.fn()

vi.mock('./server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: maybeSingleMock }),
      }),
    }),
  })),
}))

import {
  isReadOnlyClientStatus,
  checkClientWriteAllowed,
  readOnlyError,
  READ_ONLY_ERROR_CODE,
} from './read-only-guard'

describe('isReadOnlyClientStatus', () => {
  it('reconnaît les deux statuts de fin d’abonnement', () => {
    expect(isReadOnlyClientStatus('subscription_cancelled')).toBe(true)
    expect(isReadOnlyClientStatus('handed_off')).toBe(true)
  })

  it('laisse passer tous les statuts d’un client servi', () => {
    for (const status of ['active', 'suspended', 'prospect', 'archived', 'archived_lab']) {
      expect(isReadOnlyClientStatus(status)).toBe(false)
    }
  })

  it('est permissif sur une valeur absente — jamais de blocage par défaut', () => {
    expect(isReadOnlyClientStatus(null)).toBe(false)
    expect(isReadOnlyClientStatus(undefined)).toBe(false)
  })
})

describe('readOnlyError', () => {
  it('porte un code stable et un message non punitif', () => {
    const error = readOnlyError()

    expect(error.code).toBe(READ_ONLY_ERROR_CODE)
    expect(error.message).toContain('consultable')
  })
})

describe('checkClientWriteAllowed', () => {
  beforeEach(() => {
    getUserMock.mockReset()
    maybeSingleMock.mockReset()
  })

  it('refuse l’écriture à un client dont l’abonnement est résilié', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    maybeSingleMock.mockResolvedValue({ data: { status: 'subscription_cancelled' } })

    const result = await checkClientWriteAllowed()

    expect(result).not.toBeNull()
    expect(result?.code).toBe(READ_ONLY_ERROR_CODE)
  })

  it('refuse l’écriture à un client transféré (handed_off)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    maybeSingleMock.mockResolvedValue({ data: { status: 'handed_off' } })

    expect(await checkClientWriteAllowed()).not.toBeNull()
  })

  it('autorise un client actif — aucune régression pour ceux qui paient', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    maybeSingleMock.mockResolvedValue({ data: { status: 'active' } })

    expect(await checkClientWriteAllowed()).toBeNull()
  })

  it('autorise un opérateur (aucune ligne clients pour son auth_user_id)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'operator-auth' } } })
    maybeSingleMock.mockResolvedValue({ data: null })

    expect(await checkClientWriteAllowed()).toBeNull()
  })

  it('autorise quand il n’y a pas de session', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })

    expect(await checkClientWriteAllowed()).toBeNull()
  })

  it('reste permissif si la lecture du statut échoue — la RLS reste le vrai verrou', async () => {
    getUserMock.mockRejectedValue(new Error('réseau'))

    expect(await checkClientWriteAllowed()).toBeNull()
  })
})
