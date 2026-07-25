import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startImpersonation } from './start-impersonation'

// Mock Supabase
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn()
const mockInvoke = vi.fn()

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    eq: mockEq,
  })),
  functions: {
    invoke: mockInvoke,
  },
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}))

// Correctif 2026-07-25 — la Server Action génère désormais un vrai lien de connexion
// au compte client (service role). Mocké ici : pas de réseau en test unitaire.
const mockBuildLink = vi.fn()
vi.mock('../utils/build-impersonation-link', () => ({
  buildImpersonationLink: (...args: unknown[]) => mockBuildLink(...args),
}))

/**
 * Chaîne de requête Supabase tolérante : chaque filtre (.eq/.gt/.lte/…) renvoie le même
 * nœud, qui est à la fois awaitable et terminal (.single/.maybeSingle). Évite de réécrire
 * les mocks à chaque filtre ajouté dans l'action — c'est ce qui les rendait fragiles.
 */
function queryChain(result: unknown = { data: null, error: null }) {
  const node: Record<string, unknown> = {}
  const passthrough = () => node
  for (const method of ['eq', 'gt', 'gte', 'lte', 'lt', 'neq', 'select', 'order', 'limit']) {
    node[method] = vi.fn(passthrough)
  }
  node.maybeSingle = vi.fn().mockResolvedValue(result)
  node.single = vi.fn().mockResolvedValue(result)
  node.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return node
}

describe('startImpersonation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default chain setup
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle, maybeSingle: mockMaybeSingle, eq: mockEq })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockInvoke.mockResolvedValue({ data: null, error: null })
    mockBuildLink.mockResolvedValue({
      url: 'https://app.monprojet-pro.com/auth/impersonation?token_hash=hash-abc&session=00000000-0000-0000-0000-000000000099',
    })
  })

  it('should reject unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const result = await startImpersonation({ clientId: '00000000-0000-0000-0000-000000000001' })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should reject non-operator users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    // First .from('operators') call
    let fromCallCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            })),
          })),
        }
      }
      return { select: mockSelect, insert: mockInsert, eq: mockEq }
    })

    const result = await startImpersonation({ clientId: '00000000-0000-0000-0000-000000000001' })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('should reject invalid client ID', async () => {
    const result = await startImpersonation({ clientId: 'not-a-uuid' })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should succeed with valid operator and client', async () => {
    const operatorId = '00000000-0000-0000-0000-000000000010'
    const clientId = '00000000-0000-0000-0000-000000000001'
    const clientAuthUserId = '00000000-0000-0000-0000-000000000002'
    const sessionId = '00000000-0000-0000-0000-000000000099'

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'op-auth-id' } },
      error: null,
    })

    let fromCallIndex = 0
    mockSupabase.from.mockImplementation((table: string) => {
      fromCallIndex++
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: operatorId },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: clientId,
                  auth_user_id: clientAuthUserId,
                  name: 'Dupont',
                  first_name: 'Jean',
                  email: 'jean@test.com',
                  status: 'active',
                },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'impersonation_sessions') {
        // Aucune session en cours → insert
        return {
          select: vi.fn(() => queryChain({ data: null, error: null })),
          update: vi.fn(() => queryChain({ error: null })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: sessionId },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'activity_logs') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return { select: mockSelect, insert: mockInsert }
    })

    const result = await startImpersonation({ clientId })

    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
    expect(result.data?.sessionId).toBe(sessionId)
    expect(result.data?.clientName).toBe('Jean Dupont')
    expect(result.data?.redirectUrl).toContain(sessionId)
    // Le lien doit être un vrai lien de connexion au compte client, jamais localhost
    // (régression 2026-07-25 : NEXT_PUBLIC_CLIENT_URL absente → fallback localhost:3000).
    expect(result.data?.redirectUrl).toContain('/auth/impersonation')
    expect(result.data?.redirectUrl).toContain('token_hash=')
    expect(result.data?.redirectUrl).not.toContain('localhost')
    expect(mockBuildLink).toHaveBeenCalledWith({
      email: 'jean@test.com',
      sessionId,
    })
  })

  it('should roll back the session when the login link cannot be generated', async () => {
    const operatorId = '00000000-0000-0000-0000-000000000010'
    const clientId = '00000000-0000-0000-0000-000000000001'
    const sessionId = '00000000-0000-0000-0000-000000000099'

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'op-auth-id' } },
      error: null,
    })

    mockBuildLink.mockResolvedValue({ error: 'SUPABASE_SERVICE_ROLE_KEY manquant' })

    const sessionUpdateChain = queryChain({ error: null })
    const sessionUpdate = vi.fn(() => sessionUpdateChain)
    const emailInvoke = vi.fn().mockResolvedValue({ data: null, error: null })
    mockSupabase.functions.invoke = emailInvoke

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: operatorId }, error: null }),
            })),
          })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: clientId,
                  auth_user_id: 'auth-id',
                  name: 'Test',
                  first_name: null,
                  email: 'test@test.com',
                  status: 'active',
                },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'impersonation_sessions') {
        return {
          select: vi.fn(() => queryChain({ data: null, error: null })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: sessionId }, error: null }),
            })),
          })),
          update: sessionUpdate,
        }
      }
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return { select: mockSelect, insert: mockInsert }
    })

    const result = await startImpersonation({ clientId })

    expect(result.error?.code).toBe('INTERNAL_ERROR')
    // Session clôturée : sinon elle resterait « active » et bloquerait tout nouvel essai.
    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ended' })
    )
    expect(sessionUpdateChain.eq).toHaveBeenCalledWith('id', sessionId)
    // Et le client n'est pas notifié d'une session qui n'a jamais eu lieu.
    expect(emailInvoke).not.toHaveBeenCalled()
  })

  it('should reject if active session exists', async () => {
    const operatorId = '00000000-0000-0000-0000-000000000010'
    const clientId = '00000000-0000-0000-0000-000000000001'

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'op-auth-id' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: operatorId },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: clientId,
                  auth_user_id: 'auth-id',
                  name: 'Test',
                  first_name: null,
                  email: 'test@test.com',
                  status: 'active',
                },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'impersonation_sessions') {
        return {
          select: vi.fn(() => queryChain({ data: { id: 'existing-session' }, error: null })),
          update: vi.fn(() => queryChain({ error: null })),
        }
      }
      return { select: mockSelect, insert: mockInsert }
    })

    const result = await startImpersonation({ clientId })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('CONFLICT')
  })

  it('expires a stale active session instead of blocking on CONFLICT', async () => {
    const operatorId = '00000000-0000-0000-0000-000000000010'
    const clientId = '00000000-0000-0000-0000-000000000001'
    const sessionId = '00000000-0000-0000-0000-000000000099'

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'op-auth-id' } },
      error: null,
    })

    // La péremption se fait par filtres (.eq status active + .lte expires_at now) :
    // le select qui suit ne voit donc plus de session en cours.
    const staleUpdate = vi.fn(() => queryChain({ error: null }))

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: operatorId }, error: null }),
            })),
          })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: clientId,
                  auth_user_id: 'auth-id',
                  name: 'Test',
                  first_name: null,
                  email: 'test@test.com',
                  status: 'active',
                },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'impersonation_sessions') {
        return {
          select: vi.fn(() => queryChain({ data: null, error: null })),
          update: staleUpdate,
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: sessionId }, error: null }),
            })),
          })),
        }
      }
      if (table === 'activity_logs') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return { select: mockSelect, insert: mockInsert }
    })

    const result = await startImpersonation({ clientId })

    expect(result.error).toBeNull()
    expect(staleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'expired' })
    )
  })

  it('should reject client without auth user', async () => {
    const operatorId = '00000000-0000-0000-0000-000000000010'
    const clientId = '00000000-0000-0000-0000-000000000001'

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'op-auth-id' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: operatorId },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: clientId,
                  auth_user_id: null,
                  name: 'Test',
                  first_name: null,
                  email: 'test@test.com',
                  status: 'active',
                },
                error: null,
              }),
            })),
          })),
        }
      }
      return { select: mockSelect, insert: mockInsert }
    })

    const result = await startImpersonation({ clientId })

    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})
