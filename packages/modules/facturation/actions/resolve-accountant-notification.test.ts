import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveAccountantNotification, getAccountantNotifications } from './resolve-accountant-notification'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockNeq = vi.fn()
const mockOrder = vi.fn()
const mockRpc = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: mockEq })),
      select: vi.fn(() => ({
        neq: vi.fn(() => ({
          order: mockOrder,
        })),
      })),
    })),
  })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockOperator() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'op-1' } }, error: null })
  mockRpc.mockResolvedValue({ data: true, error: null })
}

function mockUnauthorized() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('no session') })
}

// ── Tests resolveAccountantNotification ───────────────────────────────────────

describe('resolveAccountantNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    mockUnauthorized()
    const result = await resolveAccountantNotification('some-uuid')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne VALIDATION_ERROR si ID non UUID', async () => {
    mockOperator()
    const result = await resolveAccountantNotification('invalid-id')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('met à jour le statut à resolved avec succès', async () => {
    mockOperator()
    mockEq.mockResolvedValue({ error: null })

    const validUuid = '123e4567-e89b-12d3-a456-426614174000'
    const result = await resolveAccountantNotification(validUuid)
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ resolved: true })
    expect(mockEq).toHaveBeenCalledWith('id', validUuid)
  })
})

// ── Tests getAccountantNotifications ─────────────────────────────────────────

describe('getAccountantNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    mockUnauthorized()
    const result = await getAccountantNotifications()
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne la liste des notifications actives', async () => {
    mockOperator()
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'notif-1',
          type: 'missing_receipt',
          title: 'Justificatif manquant',
          body: 'Facture 2024-01',
          source_email: 'comptable@cabinet.fr',
          status: 'unread',
          created_at: '2026-04-17T09:00:00Z',
        },
      ],
      error: null,
    })

    const result = await getAccountantNotifications()
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data![0].type).toBe('missing_receipt')
  })
})
