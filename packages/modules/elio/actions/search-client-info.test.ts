import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchClientInfo } from './search-client-info'

// ── Mocks Supabase ────────────────────────────────────────────────────────────

const mockClientsLimit = vi.fn()
const mockClientsOr = vi.fn(() => ({ limit: mockClientsLimit }))

const mockParcoursEqSingle = vi.fn()
const mockValidationLimit = vi.fn()
const mockMessagesLimit = vi.fn()
const mockMessagesOrder = vi.fn(() => ({ limit: mockMessagesLimit }))
const mockMessagesEq = vi.fn(() => ({ order: mockMessagesOrder }))
const mockClientConfigMaybeSingle = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({ or: mockClientsOr })),
        }
      }
      if (table === 'client_configs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: mockClientConfigMaybeSingle })),
          })),
        }
      }
      if (table === 'parcours') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: mockParcoursEqSingle })),
          })),
        }
      }
      if (table === 'validation_requests') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ limit: mockValidationLimit })),
            })),
          })),
        }
      }
      if (table === 'elio_messages') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order: vi.fn(() => ({ limit: mockMessagesLimit })) })),
          })),
        }
      }
      return {}
    }),
  })),
}))

// ── Helper ────────────────────────────────────────────────────────────────────

const makeClient = (overrides = {}) => ({
  id: 'client-uuid-1',
  name: 'Sandrine Martin',
  email: 'sandrine@example.com',
  company: 'Startup SAS',
  client_type: 'lab',
  status: 'active',
  operator_id: 'op-1',
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('searchClientInfo (Story 8.5 — Task 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClientsOr.mockReturnValue({ limit: mockClientsLimit })
    // Default: no client_config (hasLabAccess = false)
    mockClientConfigMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('Task 5.2 — retourne VALIDATION_ERROR si query vide', async () => {
    const result = await searchClientInfo('')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('Task 5.5 — retourne { data: clientInfo, error: null } pour un client trouvé (Lab)', async () => {
    const client = makeClient()
    mockClientsLimit.mockResolvedValueOnce({ data: [client], error: null })
    mockClientConfigMaybeSingle.mockResolvedValueOnce({
      data: { dashboard_type: 'lab', lab_mode_available: false },
      error: null,
    })
    mockParcoursEqSingle.mockResolvedValueOnce({
      data: { id: 'parc-1', current_step: 2, total_steps: 6, status: 'in_progress' },
      error: null,
    })
    mockValidationLimit.mockResolvedValueOnce({ data: [], error: null })
    mockMessagesLimit.mockResolvedValueOnce({ data: [], error: null })

    const result = await searchClientInfo('Sandrine')

    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveProperty('client')
    expect(result.data).toHaveProperty('parcours')
  })

  it('Task 5.2 — retourne NOT_FOUND si aucun client correspond', async () => {
    mockClientsLimit.mockResolvedValueOnce({ data: [], error: null })

    const result = await searchClientInfo('InconnuXYZ')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('Task 5.5 — retourne DB_ERROR si la requête Supabase échoue', async () => {
    mockClientsLimit.mockResolvedValueOnce({ data: null, error: new Error('DB connection error') })

    const result = await searchClientInfo('Sandrine')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('Task 5.3 — retourne multiple:true si plusieurs clients trouvés', async () => {
    const clients = [
      makeClient({ name: 'Marie Dupont' }),
      makeClient({ id: 'client-2', name: 'Marie Martin' }),
    ]
    mockClientsLimit.mockResolvedValueOnce({ data: clients, error: null })

    const result = await searchClientInfo('Marie')

    expect(result.error).toBeNull()
    expect(result.data).toHaveProperty('multiple', true)
  })

  it('Task 5.4 — respecte RLS (requête via createServerSupabaseClient)', async () => {
    mockClientsLimit.mockResolvedValueOnce({ data: [], error: null })

    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    await searchClientInfo('test')

    expect(createServerSupabaseClient).toHaveBeenCalled()
  })

  it('CR Fix 3 — caractères wildcard dans la query ne cassent pas la recherche', async () => {
    mockClientsLimit.mockResolvedValueOnce({ data: [], error: null })

    const result = await searchClientInfo('100%_test')

    expect(result.error?.code).toBe('NOT_FOUND')
    // The query should reach Supabase without error (wildcards escaped)
    expect(mockClientsOr).toHaveBeenCalled()
  })

  it('Task 5.3 — client One sans accès Lab ne fetch pas le parcours', async () => {
    const client = makeClient({ client_type: 'one' })
    mockClientsLimit.mockResolvedValueOnce({ data: [client], error: null })
    mockClientConfigMaybeSingle.mockResolvedValueOnce({
      data: { dashboard_type: 'one', lab_mode_available: false },
      error: null,
    })
    mockValidationLimit.mockResolvedValueOnce({ data: [], error: null })
    mockMessagesLimit.mockResolvedValueOnce({ data: [], error: null })

    const result = await searchClientInfo('Sandrine')

    expect(result.error).toBeNull()
    expect((result.data as { parcours: unknown })?.parcours).toBeNull()
    expect(mockParcoursEqSingle).not.toHaveBeenCalled()
  })

  it('Fix 2026-04-14 — client gradué avec lab_mode_available=true fetch le parcours', async () => {
    const client = makeClient({ client_type: 'one' })
    mockClientsLimit.mockResolvedValueOnce({ data: [client], error: null })
    mockClientConfigMaybeSingle.mockResolvedValueOnce({
      data: { dashboard_type: 'one', lab_mode_available: true },
      error: null,
    })
    mockParcoursEqSingle.mockResolvedValueOnce({
      data: { id: 'parc-1', current_step: 6, total_steps: 6, status: 'completed' },
      error: null,
    })
    mockValidationLimit.mockResolvedValueOnce({ data: [], error: null })
    mockMessagesLimit.mockResolvedValueOnce({ data: [], error: null })

    const result = await searchClientInfo('Sandrine')

    expect(result.error).toBeNull()
    expect((result.data as { parcours: unknown })?.parcours).toBeDefined()
    expect(mockParcoursEqSingle).toHaveBeenCalled()
  })
})
