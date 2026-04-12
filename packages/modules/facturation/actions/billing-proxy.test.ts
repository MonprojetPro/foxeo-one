import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================
// Mocks
// ============================================================

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('../config/pennylane', () => ({
  pennylaneClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { pennylaneClient } from '../config/pennylane'
import {
  createPennylaneCustomer,
  getPennylaneCustomer,
  listQuotes,
  listInvoices,
  listSubscriptions,
} from './billing-proxy'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockPennylane = vi.mocked(pennylaneClient)

function makeSupabaseMock(isOperator = true) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isOperator }),
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }
}

// ── V2 mock data ───────────────────────────────────────────────────────────────

const mockV2Quote = {
  id: 4807770486,
  customer: { id: 275890907, url: 'https://app.pennylane.com/api/external/v2/customers/275890907' },
  quote_number: 'DEV-001',
  status: 'pending' as const,
  date: '2026-03-01',
  deadline: '2026-03-31',
  invoice_lines: { url: 'https://app.pennylane.com/api/external/v2/quotes/4807770486/invoice_lines' },
  currency: 'EUR',
  amount: '480.0',
  currency_amount_before_tax: '400.0',
  currency_tax: '80.0',
  pdf_invoice_free_text: null,
  public_file_url: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

const mockV2Invoice = {
  id: 'inv-1',
  customer_id: 'cust-1',
  invoice_number: 'FA-001',
  status: 'paid' as const,
  date: '2026-03-01',
  deadline: '2026-03-15',
  line_items: [],
  currency: 'EUR',
  amount: 480,
  currency_amount_before_tax: 400,
  currency_tax: 80,
  remaining_amount: 0,
  pdf_invoice_free_text: null,
  file_url: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-15T00:00:00Z',
}

const mockV2Subscription = {
  id: 'sub-1',
  customer_id: 'cust-1',
  status: 'active' as const,
  start_date: '2026-03-01',
  recurring_period: 'monthly' as const,
  line_items: [],
  amount: 480,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('billing-proxy', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('auth check', () => {
    it('returns UNAUTHORIZED when user is not authenticated', async () => {
      const supabase = makeSupabaseMock()
      supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') })
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

      const result = await listQuotes()
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('returns FORBIDDEN when user is not an operator', async () => {
      const supabase = makeSupabaseMock(false)
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

      const result = await listQuotes()
      expect(result.error?.code).toBe('FORBIDDEN')
    })
  })

  describe('createPennylaneCustomer()', () => {
    it('creates customer and stores pennylane_customer_id in DB', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
      // V2 : réponse directe (pas de wrapper { customer: ... }), id est un number
      mockPennylane.post.mockResolvedValue({
        data: { id: 275890907, name: 'ACME Corp', emails: ['acme@example.com'], billing_address: null, created_at: '', updated_at: '' },
        error: null,
      })

      const result = await createPennylaneCustomer('client-1', 'ACME Corp', 'acme@example.com')
      // String(275890907)
      expect(result.data).toBe('275890907')
      expect(result.error).toBeNull()
      // V2 : endpoint /company_customers, body direct (pas de wrapper)
      expect(mockPennylane.post).toHaveBeenCalledWith('/company_customers', expect.objectContaining({
        name: 'ACME Corp',
        emails: expect.arrayContaining(['acme@example.com']),
      }))
    })

    it('handles wrapped response { company_customer: { id } }', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
      mockPennylane.post.mockResolvedValue({
        data: { company_customer: { id: 999888, name: 'ACME Corp', emails: ['acme@example.com'], billing_address: null, created_at: '', updated_at: '' } },
        error: null,
      })

      const result = await createPennylaneCustomer('client-1', 'ACME Corp', 'acme@example.com')
      expect(result.data).toBe('999888')
      expect(result.error).toBeNull()
    })

    it('returns MISSING_EMAIL when email is empty', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

      const result = await createPennylaneCustomer('client-1', 'ACME', '')
      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('MISSING_EMAIL')
      expect(mockPennylane.post).not.toHaveBeenCalled()
    })

    it('returns error when Pennylane API fails', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
      mockPennylane.post.mockResolvedValue({
        data: null,
        error: { message: 'API error', code: 'PENNYLANE_500' },
      })

      const result = await createPennylaneCustomer('client-1', 'ACME', 'a@b.com')
      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('PENNYLANE_500')
    })
  })

  describe('getPennylaneCustomer()', () => {
    it('fetches customer by pennylane id', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
      // V2 : réponse directe (pas de wrapper { customer: ... })
      const customerData = { id: 'pl-cust-1', name: 'ACME', emails: [], billing_address: null, created_at: '', updated_at: '' }
      mockPennylane.get.mockResolvedValue({ data: customerData, error: null })

      const result = await getPennylaneCustomer('pl-cust-1')
      expect(result.data?.id).toBe('pl-cust-1')
      expect(mockPennylane.get).toHaveBeenCalledWith('/customers/pl-cust-1')
    })
  })

  describe('listQuotes()', () => {
    it('returns mapped quotes list', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
      // V2 : { items: [...] }
      mockPennylane.get.mockResolvedValue({
        data: { items: [mockV2Quote] },
        error: null,
      })

      const result = await listQuotes()
      expect(result.data).toHaveLength(1)
      // fromPennylaneQuote fait String(quote.id)
      expect(result.data![0].id).toBe('4807770486')
    })

    it('passes customer filter in URL', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
      mockPennylane.get.mockResolvedValue({ data: { items: [] }, error: null })

      await listQuotes({ pennylaneCustomerId: 'cust-abc' })
      expect(mockPennylane.get).toHaveBeenCalledWith(expect.stringContaining('filter%5Bcustomer_id%5D=cust-abc'))
    })
  })

  describe('listInvoices()', () => {
    it('returns mapped invoices list', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
      // V2 : { items: [...] }
      mockPennylane.get.mockResolvedValue({
        data: { items: [mockV2Invoice] },
        error: null,
      })

      const result = await listInvoices()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].status).toBe('paid')
    })

    it('returns error when API fails', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
      mockPennylane.get.mockResolvedValue({ data: null, error: { message: 'API error', code: 'PENNYLANE_503' } })

      const result = await listInvoices()
      expect(result.error?.code).toBe('PENNYLANE_503')
    })
  })

  describe('listSubscriptions()', () => {
    it('returns mapped subscriptions list', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
      // V2 : { items: [...] }
      mockPennylane.get.mockResolvedValue({
        data: { items: [mockV2Subscription] },
        error: null,
      })

      const result = await listSubscriptions()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].frequency).toBe('monthly')
    })
  })
})
