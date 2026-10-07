import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pennylaneClient, PENNYLANE_API_URL } from './pennylane'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeOkResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeErrorResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status })
}

describe('pennylaneClient', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.PENNYLANE_API_TOKEN = 'test-token-abc'
    // Avoid real sleep in tests
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.PENNYLANE_API_TOKEN
  })

  describe('headers', () => {
    it('sends correct Authorization Bearer header', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ id: '1' }))
      await pennylaneClient.get('/me')
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = options.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer test-token-abc')
    })

    it('sends X-Use-2026-API-Changes header', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({}))
      await pennylaneClient.get('/me')
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = options.headers as Record<string, string>
      expect(headers['X-Use-2026-API-Changes']).toBe('true')
    })

    it('sends Content-Type and Accept headers', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({}))
      await pennylaneClient.post('/quotes', {})
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = options.headers as Record<string, string>
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['Accept']).toBe('application/json')
    })
  })

  describe('get()', () => {
    it('calls correct URL', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ data: 'ok' }))
      await pennylaneClient.get('/customers')
      const [url] = mockFetch.mock.calls[0] as [string]
      expect(url).toBe(`${PENNYLANE_API_URL}/customers`)
    })

    it('returns { data, error: null } on success', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ id: 'cust-1' }))
      const result = await pennylaneClient.get<{ id: string }>('/customers/cust-1')
      expect(result.data).toEqual({ id: 'cust-1' })
      expect(result.error).toBeNull()
    })

    it('returns { data: null, error } on 404', async () => {
      mockFetch.mockResolvedValueOnce(makeErrorResponse(404, { message: 'Not found' }))
      const result = await pennylaneClient.get('/customers/unknown')
      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('PENNYLANE_404')
    })
  })

  describe('post()', () => {
    it('sends body as JSON', async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ id: 'new-cust' }))
      await pennylaneClient.post('/customers', { name: 'ACME' })
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(options.method).toBe('POST')
      expect(options.body).toBe(JSON.stringify({ name: 'ACME' }))
    })
  })

  describe('error handling', () => {
    it('returns PENNYLANE_500 error on 500 response after retry', async () => {
      mockFetch
        .mockResolvedValueOnce(makeErrorResponse(500))
        .mockResolvedValueOnce(makeErrorResponse(500))

      const resultPromise = pennylaneClient.get('/quotes')
      await vi.runAllTimersAsync()
      const result = await resultPromise
      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('PENNYLANE_500')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('retries once on 5xx and succeeds', async () => {
      mockFetch
        .mockResolvedValueOnce(makeErrorResponse(503))
        .mockResolvedValueOnce(makeOkResponse({ id: 'ok' }))

      const resultPromise = pennylaneClient.get('/quotes')
      await vi.runAllTimersAsync()
      const result = await resultPromise
      expect(result.data).toEqual({ id: 'ok' })
      expect(result.error).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('handles rate limiting 429 and retries', async () => {
      const rateLimitResponse = new Response(JSON.stringify({}), {
        status: 429,
        headers: { 'retry-after': '1', 'ratelimit-remaining': '0' },
      })
      mockFetch
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValueOnce(makeOkResponse({ id: 'ok' }))

      const resultPromise = pennylaneClient.get('/invoices')
      await vi.runAllTimersAsync()
      const result = await resultPromise
      expect(result.data).toEqual({ id: 'ok' })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('returns RATE_LIMIT_EXCEEDED after max rate limit retries', async () => {
      const make429 = () => new Response(JSON.stringify({}), {
        status: 429,
        headers: { 'retry-after': '1', 'ratelimit-remaining': '0' },
      })
      // 4 calls: initial + 3 rate limit retries = exceeds MAX_RATE_LIMIT_RETRIES (3)
      mockFetch
        .mockResolvedValueOnce(make429())
        .mockResolvedValueOnce(make429())
        .mockResolvedValueOnce(make429())
        .mockResolvedValueOnce(make429())

      const resultPromise = pennylaneClient.get('/invoices')
      await vi.runAllTimersAsync()
      const result = await resultPromise
      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('returns NETWORK_ERROR on fetch failure after retry', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network failure'))
        .mockRejectedValueOnce(new Error('Network failure'))

      const resultPromise = pennylaneClient.get('/me')
      await vi.runAllTimersAsync()
      const result = await resultPromise
      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('NETWORK_ERROR')
    })

    it('returns CONFIG_ERROR when PENNYLANE_API_TOKEN is not set', async () => {
      delete process.env.PENNYLANE_API_TOKEN
      const result = await pennylaneClient.get('/me')
      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('CONFIG_ERROR')
      expect(result.error?.message).toContain('PENNYLANE_API_TOKEN')
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('del()', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))
      const result = await pennylaneClient.del('/quotes/q-1')
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(options.method).toBe('DELETE')
      expect(result.error).toBeNull()
    })
  })

  // ── T-041a — le MOTIF du refus doit remonter jusqu'a l'appelant ──────────
  //
  // Le premier avoir reel a echoue sur un « 400 Bad Request » nu : le corps de
  // la reponse Pennylane partait dans les journaux Vercel et l'operateur
  // n'avait rien d'exploitable sous les yeux.

  describe('motif des erreurs', () => {
    it('reprend le champ `message` du corps dans le message d erreur', async () => {
      mockFetch.mockResolvedValue(
        makeErrorResponse(400, { message: 'credited_invoice_id is not a valid attribute' })
      )
      const result = await pennylaneClient.post('/customer_invoices', {})

      expect(result.error?.code).toBe('PENNYLANE_400')
      expect(result.error?.message).toContain('credited_invoice_id is not a valid attribute')
    })

    it('reprend un tableau `errors`', async () => {
      mockFetch.mockResolvedValue(
        makeErrorResponse(422, { errors: ['Ligne 1 invalide', 'Ligne 2 invalide'] })
      )
      const result = await pennylaneClient.post('/customer_invoices', {})

      expect(result.error?.message).toContain('Ligne 1 invalide')
      expect(result.error?.message).toContain('Ligne 2 invalide')
    })

    it('reprend un dictionnaire champ -> messages', async () => {
      mockFetch.mockResolvedValue(
        makeErrorResponse(422, { errors: { invoice_lines: ['ledger_account_id manquant'] } })
      )
      const result = await pennylaneClient.post('/customer_invoices', {})

      expect(result.error?.message).toContain('invoice_lines')
      expect(result.error?.message).toContain('ledger_account_id manquant')
    })

    it('serialise le corps quand aucune forme connue ne correspond', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(400, { unexpected: 'shape' }))
      const result = await pennylaneClient.post('/customer_invoices', {})

      expect(result.error?.message).toContain('unexpected')
    })

    it('garde le message nu quand le corps est vide', async () => {
      mockFetch.mockResolvedValue(new Response('', { status: 400 }))
      const result = await pennylaneClient.post('/customer_invoices', {})

      expect(result.error?.message).toBe('Pennylane API error: 400 ')
    })

    it('conserve le corps complet dans `details` meme si le message est tronque', async () => {
      const long = 'x'.repeat(500)
      mockFetch.mockResolvedValue(makeErrorResponse(400, { message: long }))
      const result = await pennylaneClient.post('/customer_invoices', {})

      expect(result.error?.message.length).toBeLessThan(400)
      expect((result.error?.details as { message: string }).message).toHaveLength(500)
    })
  })
})
