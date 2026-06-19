import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockAgentsEq = vi.fn()          // elio_lab_agents .select().eq('archived', false)
const mockExistingOrder = vi.fn()     // client_parcours_agents .select().eq().order()
const mockDeleteEq = vi.fn()          // client_parcours_agents .delete().eq()
const mockInsert = vi.fn()            // client_parcours_agents .insert() ET notifications .insert()
const mockClientMaybeSingle = vi.fn() // clients .select().eq().maybeSingle()

const mockFrom = vi.fn((table: string) => {
  if (table === 'elio_lab_agents') {
    return { select: vi.fn(() => ({ eq: mockAgentsEq })) }
  }
  if (table === 'client_parcours_agents') {
    return {
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: mockExistingOrder })) })),
      delete: vi.fn(() => ({ eq: mockDeleteEq })),
      insert: mockInsert,
    }
  }
  if (table === 'clients') {
    return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mockClientMaybeSingle })) })) }
  }
  // notifications
  return { insert: mockInsert }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

const FULL_CATALOGUE = [
  { id: 'id-vision', name: 'Élio Vision' },
  { id: 'id-cible', name: 'Élio Cible' },
  { id: 'id-offre', name: 'Élio Offre' },
  { id: 'id-business', name: 'Élio Business' },
  { id: 'id-fdr', name: 'Élio Feuille de route' },
]

describe('applyParcoursTemplate Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockAgentsEq.mockResolvedValue({ data: FULL_CATALOGUE, error: null })
    mockExistingOrder.mockResolvedValue({ data: [], error: null })
    mockDeleteEq.mockResolvedValue({ error: null })
    mockInsert.mockResolvedValue({ error: null })
    mockClientMaybeSingle.mockResolvedValue({ data: { auth_user_id: 'auth-client-1' }, error: null })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { applyParcoursTemplate } = await import('./apply-parcours-template')
    const result = await applyParcoursTemplate({ clientId: CLIENT_ID, templateKey: 'validation-express', mode: 'replace' })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for an unknown template', async () => {
    const { applyParcoursTemplate } = await import('./apply-parcours-template')
    const result = await applyParcoursTemplate({ clientId: CLIENT_ID, templateKey: 'inexistant', mode: 'replace' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('replace : insère les agents résolus, 1ère étape active et suivantes pending', async () => {
    const { applyParcoursTemplate } = await import('./apply-parcours-template')
    const result = await applyParcoursTemplate({ clientId: CLIENT_ID, templateKey: 'validation-express', mode: 'replace' })

    expect(result.error).toBeNull()
    // validation-express = Vision, Cible, Offre, Business, Feuille de route → 5 résolus
    expect(result.data?.count).toBe(5)

    const insertCall = mockInsert.mock.calls.find((c) => Array.isArray(c[0]))
    expect(insertCall).toBeDefined()
    const rows = insertCall![0]
    expect(rows).toHaveLength(5)
    expect(rows[0].step_order).toBe(1)
    expect(rows[0].status).toBe('active')
    expect(rows[1].status).toBe('pending')
  })

  it('append : ignore un agent déjà présent et continue le step_order', async () => {
    mockExistingOrder.mockResolvedValue({
      data: [{ id: 'step-1', elio_lab_agent_id: 'id-vision', step_order: 1 }],
      error: null,
    })
    const { applyParcoursTemplate } = await import('./apply-parcours-template')
    const result = await applyParcoursTemplate({ clientId: CLIENT_ID, templateKey: 'validation-express', mode: 'append' })

    expect(result.error).toBeNull()
    // Vision déjà présent → 4 ajoutés (Cible, Offre, Business, Feuille de route)
    expect(result.data?.count).toBe(4)

    const insertCall = mockInsert.mock.calls.find((c) => Array.isArray(c[0]))
    const rows = insertCall![0]
    expect(rows[0].step_order).toBe(2)
    expect(rows.every((r: { status: string }) => r.status === 'pending')).toBe(true)
  })

  it('remonte les agents absents du catalogue dans skipped', async () => {
    // Catalogue sans « Élio Feuille de route »
    mockAgentsEq.mockResolvedValue({
      data: FULL_CATALOGUE.filter((a) => a.name !== 'Élio Feuille de route'),
      error: null,
    })
    const { applyParcoursTemplate } = await import('./apply-parcours-template')
    const result = await applyParcoursTemplate({ clientId: CLIENT_ID, templateKey: 'validation-express', mode: 'replace' })

    expect(result.data?.skipped).toContain('Élio Feuille de route')
    expect(result.data?.count).toBe(4)
  })
})
