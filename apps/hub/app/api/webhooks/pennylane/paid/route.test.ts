import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'

// ── Mock @monprojetpro/modules-facturation avant d'importer la route ──────────

const mockVerify = vi.fn()
const mockMatch = vi.fn()
const mockDispatch = vi.fn()

vi.mock('@monprojetpro/modules-facturation/server', () => ({
  verifyPennylaneHmac: mockVerify,
  matchQuoteFromInvoice: mockMatch,
  dispatchPaidQuote: mockDispatch,
}))

// Mock @supabase/supabase-js createClient
const fromMock = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: fromMock })),
}))

// ── Helper pour simuler une NextRequest minimale ──────────────────────────────

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return {
    text: () => Promise.resolve(body),
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  } as unknown as import('next/server').NextRequest
}

const SECRET = 'test-secret'
const VALID_BODY = JSON.stringify({ pennylane_invoice_id: 'INV-1', pennylane_quote_id: 'Q-1' })

function signBody(body: string): string {
  return createHmac('sha256', SECRET).update(body, 'utf8').digest('hex')
}

// ── Imports dynamiques (apres mocks) ──────────────────────────────────────────

async function loadRoute() {
  const mod = await import('./route')
  return mod.POST
}

describe('POST /api/webhooks/pennylane/paid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('PENNYLANE_WEBHOOK_SECRET', SECRET)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
    mockVerify.mockReturnValue(true)
    mockMatch.mockResolvedValue(null)
    mockDispatch.mockResolvedValue({
      data: { action: 'lab_activated', clientId: 'client-1' },
      error: null,
    })
  })

  it('returns 500 when PENNYLANE_WEBHOOK_SECRET is missing', async () => {
    vi.stubEnv('PENNYLANE_WEBHOOK_SECRET', '')
    const POST = await loadRoute()
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(500)
  })

  it('returns 401 when signature is invalid', async () => {
    mockVerify.mockReturnValue(false)
    const POST = await loadRoute()
    const res = await POST(makeRequest(VALID_BODY, { 'x-pennylane-signature': 'wrong' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when body is not valid JSON', async () => {
    const POST = await loadRoute()
    const res = await POST(
      makeRequest('not json', { 'x-pennylane-signature': signBody('not json') })
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when both invoice_id and quote_id are missing', async () => {
    const POST = await loadRoute()
    const body = JSON.stringify({ foo: 'bar' })
    const res = await POST(makeRequest(body, { 'x-pennylane-signature': signBody(body) }))
    expect(res.status).toBe(400)
  })

  it('returns 200 matched:false when no quote_metadata matches (idempotent)', async () => {
    const POST = await loadRoute()
    const res = await POST(
      makeRequest(VALID_BODY, { 'x-pennylane-signature': signBody(VALID_BODY) })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ received: true, matched: false })
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('dispatches when a quote is matched', async () => {
    const quote = { pennylane_quote_id: 'Q-1', quote_type: 'lab_onboarding', client_id: 'c-1' }
    mockMatch.mockResolvedValue(quote)
    const POST = await loadRoute()
    const res = await POST(
      makeRequest(VALID_BODY, { 'x-pennylane-signature': signBody(VALID_BODY) })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ received: true, matched: true, action: 'lab_activated' })
    expect(mockDispatch).toHaveBeenCalledTimes(1)
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ supabase: expect.any(Object) }),
      quote
    )
  })

  it('accepts invoice.id nested form', async () => {
    const quote = { pennylane_quote_id: 'Q-2', quote_type: 'one_direct_deposit', client_id: 'c-2' }
    mockMatch.mockResolvedValue(quote)
    mockDispatch.mockResolvedValue({
      data: { action: 'one_deposit_activated', clientId: 'c-2' },
      error: null,
    })
    const body = JSON.stringify({ invoice: { id: 999, quote_id: 42 } })
    const POST = await loadRoute()
    const res = await POST(makeRequest(body, { 'x-pennylane-signature': signBody(body) }))
    expect(res.status).toBe(200)
    expect(mockMatch).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        pennylaneInvoiceId: '999',
        pennylaneQuoteId: '42',
      })
    )
  })

  it('still returns 200 when handler returns an error (no retry flood)', async () => {
    mockMatch.mockResolvedValue({
      pennylane_quote_id: 'Q-3',
      quote_type: 'lab_onboarding',
      client_id: 'c-3',
    })
    mockDispatch.mockResolvedValue({
      data: null,
      error: { code: 'BOOM', message: 'handler crashed' },
    })
    // operators query used by the alert path
    fromMock.mockImplementation((table: string) => {
      if (table === 'operators') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    })

    const POST = await loadRoute()
    const res = await POST(
      makeRequest(VALID_BODY, { 'x-pennylane-signature': signBody(VALID_BODY) })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.handler_error).toBe('BOOM')
  })
})
