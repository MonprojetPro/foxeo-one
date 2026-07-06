import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runHubReadTool } from './read-tools'
import type { createServerSupabaseClient } from '@monprojetpro/supabase'

type Supa = Awaited<ReturnType<typeof createServerSupabaseClient>>

// ── Mocks des dépendances inter-modules ───────────────────────────────────────

const mockGetMetrics = vi.hoisted(() => vi.fn())
const mockGetTimeseries = vi.hoisted(() => vi.fn())
vi.mock('@monprojetpro/module-menu-facile', () => ({
  getMenuFacileMetrics: mockGetMetrics,
  getMenuFacileTimeseries: mockGetTimeseries,
}))

vi.mock('../search-client-info', () => ({
  searchClientInfo: vi.fn(async () => ({ data: { multiple: false }, error: null })),
}))

// ── Mock supabase (chaîne awaitable, résultats par table dans l'ordre) ────────

let tableResults: Record<string, Array<{ data: unknown; error: unknown; count?: number | null }>> = {}

function queueResult(table: string, data: unknown, error: unknown = null, count: number | null = null) {
  ;(tableResults[table] ??= []).push({ data, error, count })
}

function makeChain(table: string) {
  const nextResult = () => {
    const queue = tableResults[table] ?? []
    return queue.length > 1 ? queue.shift()! : queue[0] ?? { data: null, error: null, count: null }
  }
  const chain: Record<string, unknown> = {}
  const self = () => chain
  for (const m of ['select', 'eq', 'neq', 'in', 'is', 'or', 'order', 'limit', 'lt', 'gte', 'lte']) {
    chain[m] = vi.fn(self)
  }
  chain.maybeSingle = vi.fn(async () => nextResult())
  chain.single = vi.fn(async () => nextResult())
  chain.then = (resolve: (r: { data: unknown; error: unknown; count?: number | null }) => void) =>
    resolve(nextResult())
  return chain
}

function makeSupabase(): Supa {
  return {
    from: vi.fn((table: string) => makeChain(table)),
  } as unknown as Supa
}

const CLIENT_UUID = '11111111-2222-3333-4444-555555555555'

beforeEach(() => {
  vi.clearAllMocks()
  tableResults = {}
})

// ── list_unpaid_invoices ──────────────────────────────────────────────────────

describe('runHubReadTool — list_unpaid_invoices', () => {
  it('agrège les factures impayées avec le nom des clients (montants en euros)', async () => {
    queueResult('billing_sync', [
      { pennylane_id: 'pl-1', amount: 19900, status: 'unpaid', client_id: 'c1', data: { label: 'Forfait Lab' } },
      { pennylane_id: 'pl-2', amount: 3900, status: 'pending', client_id: 'c2', data: null },
    ])
    queueResult('clients', [
      { id: 'c1', name: 'Dupont', company: 'Dupont SARL' },
      { id: 'c2', name: 'Martin', company: null },
    ])

    const result = await runHubReadTool(makeSupabase(), 'op-1', 'list_unpaid_invoices', {})

    expect(result.ok).toBe(true)
    const payload = result.payload as {
      count: number
      totalEur: number
      invoices: Array<{ client: string; amountEur: number; status: string }>
    }
    expect(payload.count).toBe(2)
    expect(payload.totalEur).toBe(238) // 199 € + 39 €
    expect(payload.invoices[0]).toMatchObject({ client: 'Dupont (Dupont SARL)', amountEur: 199, status: 'unpaid' })
    expect(payload.invoices[1]).toMatchObject({ client: 'Martin', amountEur: 39 })
  })

  it('remonte honnêtement une erreur DB sans inventer de chiffres', async () => {
    queueResult('billing_sync', null, { message: 'permission denied' })

    const result = await runHubReadTool(makeSupabase(), 'op-1', 'list_unpaid_invoices', {})

    expect(result.ok).toBe(false)
    expect((result.payload as { error: string }).error).toContain('permission denied')
  })
})

// ── get_client_activity ───────────────────────────────────────────────────────

describe('runHubReadTool — get_client_activity', () => {
  it('calcule « dernier contact il y a N jours » à partir des messages et visios', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString()
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString()

    // resolveClient (UUID direct)
    queueResult('clients', {
      id: CLIENT_UUID,
      name: 'Dupont',
      company: 'Dupont SARL',
      email: 'dupont@example.com',
      auth_user_id: 'auth-1',
      operator_id: 'op-1',
    })
    // messages : envoyé (operator) puis reçu (client)
    queueResult('messages', [{ content: 'Bonjour, voici le devis', created_at: tenDaysAgo }])
    queueResult('messages', [{ content: 'Merci, je regarde !', created_at: threeDaysAgo }])
    // dernière visio
    queueResult('meetings', [{ title: 'Point mensuel', scheduled_at: tenDaysAgo, status: 'completed', type: 'standard' }])
    // validations
    queueResult('validation_requests', [
      { title: 'Brief cible', type: 'brief_lab', status: 'approved', created_at: tenDaysAgo },
    ])

    const result = await runHubReadTool(makeSupabase(), 'op-1', 'get_client_activity', { client: CLIENT_UUID })

    expect(result.ok).toBe(true)
    const payload = result.payload as {
      client: { name: string }
      lastContactDaysAgo: number
      lastMessageReceivedFromClient: { daysAgo: number; preview: string }
      lastMeeting: { title: string }
      recentValidations: unknown[]
    }
    expect(payload.client.name).toBe('Dupont (Dupont SARL)')
    // Le contact le plus récent = message client il y a 3 jours
    expect(payload.lastContactDaysAgo).toBe(3)
    expect(payload.lastMessageReceivedFromClient.daysAgo).toBe(3)
    expect(payload.lastMeeting.title).toBe('Point mensuel')
    expect(payload.recentValidations).toHaveLength(1)
  })

  it('retourne une erreur claire si le client est introuvable', async () => {
    queueResult('clients', []) // recherche par nom sans résultat

    const result = await runHubReadTool(makeSupabase(), 'op-1', 'get_client_activity', { client: 'Zorro' })

    expect(result.ok).toBe(false)
    expect((result.payload as { error: string }).error).toContain('Zorro')
  })
})

// ── get_menufacile_report ─────────────────────────────────────────────────────

describe('runHubReadTool — get_menufacile_report', () => {
  it('somme la série temporelle sur la période et joint les totaux', async () => {
    mockGetMetrics.mockResolvedValueOnce({
      data: {
        generated_at: '2026-07-06T10:00:00Z',
        users: { total: 120, new_7d: 8, banned: 1 },
        recipes: { total: 340, public: 200, official: 30, hidden: 5, new_7d: 12, total_copies: 999 },
        moderation: { reports_pending: 2, reports_total: 10 },
        ratings: { total: 50 },
        friendships: { total: 20 },
        top_recipes: [],
      },
      error: null,
    })
    mockGetTimeseries.mockResolvedValueOnce({
      data: {
        range: { from: '2026-06-29', to: '2026-07-06', days: 7 },
        series: [
          { date: '2026-07-04', new_users: 2, new_recipes: 1, recipe_copies: 5 },
          { date: '2026-07-05', new_users: 3, new_recipes: 0, recipe_copies: 7 },
          { date: '2026-07-06', new_users: 1, new_recipes: 4, recipe_copies: 0 },
        ],
      },
      error: null,
    })

    const result = await runHubReadTool(makeSupabase(), 'op-1', 'get_menufacile_report', { days: 7 })

    expect(result.ok).toBe(true)
    const payload = result.payload as {
      totals: { users: { total: number } }
      period: { newUsers: number; newRecipes: number; recipeCopies: number; periodDays: number }
    }
    expect(payload.totals.users.total).toBe(120)
    expect(payload.period).toMatchObject({ periodDays: 7, newUsers: 6, newRecipes: 5, recipeCopies: 12 })
    expect(mockGetTimeseries).toHaveBeenCalledWith(7)
  })

  it('guichet MenuFacile injoignable → erreur honnête, aucun chiffre inventé', async () => {
    mockGetMetrics.mockResolvedValueOnce({ data: null, error: { message: 'HTTP 503', code: 'MENUFACILE_HTTP_503' } })
    mockGetTimeseries.mockResolvedValueOnce({ data: null, error: { message: 'HTTP 503', code: 'MENUFACILE_HTTP_503' } })

    const result = await runHubReadTool(makeSupabase(), 'op-1', 'get_menufacile_report', {})

    expect(result.ok).toBe(false)
    expect((result.payload as { error: string }).error).toContain('injoignable')
  })
})
