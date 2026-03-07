import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================
// Mocks
// ============================================================

vi.mock('@foxeo/supabase', () => ({
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

import { createServerSupabaseClient } from '@foxeo/supabase'
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
      mockPennylane.post.mockResolvedValue({
        data: { customer: { id: 'pl-cust-999', name: 'ACME Corp', emails: [], billing_address: null, created_at: '', updated_at: '' } },
        error: null,
      })

      const result = await createPennylaneCustomer('client-1', 'ACME Corp', 'acme@example.com')
      expect(result.data).toBe('pl-cust-999')
      expect(result.error).toBeNull()
      expect(mockPennylane.post).toHaveBeenCalledWith('/customers', expect.objectContaining({
        customer: expect.objectContaining({ name: 'ACME Corp' }),
      }))
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
      const customerData = { id: 'pl-cust-1', name: 'ACME', emails: [], billing_address: null, created_at: '', updated_at: '' }
      mockPennylane.get.mockResolvedValue({ data: { customer: customerData }, error: null })

      const result = await getPennylaneCustomer('pl-cust-1')
      expect(result.data?.id).toBe('pl-cust-1')
      expect(mockPennylane.get).toHaveBeenCalledWith('/customers/pl-cust-1')
    })
  })

  describe('listQuotes()', () => {
    it('returns mapped quotes list', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
      mockPennylane.get.mockResolvedValue({
        data: {
          quotes: [
            {
              id: 'q-1', customer_id: 'cust-1', quote_number: 'DEV-001', status: 'pending',
              date: '2026-03-01', deadline: '2026-03-31', line_items: [], currency: 'EUR',
              amount: 480, currency_amount_before_tax: 400, currency_tax: 80,
              pdf_invoice_free_text: null, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
            },
          ],
        },
        error: null,
      })

      const result = await listQuotes()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].id).toBe('q-1')
    })

    it('passes customer filter in URL', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
      mockPennylane.get.mockResolvedValue({ data: { quotes: [] }, error: null })

      await listQuotes({ pennylaneCustomerId: 'cust-abc' })
      expect(mockPennylane.get).toHaveBeenCalledWith(expect.stringContaining('filter%5Bcustomer_id%5D=cust-abc'))
    })
  })

  describe('listInvoices()', () => {
    it('returns mapped invoices list', async () => {
      const supabase = makeSupabaseMock()
      mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
      mockPennylane.get.mockResolvedValue({
        data: {
          customer_invoices: [
            {
              id: 'inv-1', customer_id: 'cust-1', invoice_number: 'FA-001', status: 'paid',
              date: '2026-03-01', deadline: '2026-03-15', line_items: [], currency: 'EUR',
              amount: 480, currency_amount_before_tax: 400, currency_tax: 80,
              remaining_amount: 0, pdf_invoice_free_text: null, file_url: null,
              created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-15T00:00:00Z',
            },
          ],
        },
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
      mockPennylane.get.mockResolvedValue({
        data: {
          billing_subscriptions: [
            {
              id: 'sub-1', customer_id: 'cust-1', status: 'active',
              start_date: '2026-03-01', recurring_period: 'monthly',
              line_items: [], amount: 480,
              created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
            },
          ],
        },
        error: null,
      })

      const result = await listSubscriptions()
      expect(result.data).toHaveLength(1)
      expect(result.data![0].frequency).toBe('monthly')
    })
  })
})
