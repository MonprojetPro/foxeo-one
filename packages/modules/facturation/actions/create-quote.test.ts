import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('../config/pennylane', () => ({
  pennylaneClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('./trigger-billing-sync', () => ({
  triggerBillingSync: vi.fn().mockResolvedValue({ data: { synced: 1 }, error: null }),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { pennylaneClient } from '../config/pennylane'
import { triggerBillingSync } from './trigger-billing-sync'
import { createAndSendQuote } from './create-quote'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockPennylane = vi.mocked(pennylaneClient)
const mockTriggerBillingSync = vi.mocked(triggerBillingSync)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInsertChain(): unknown {
  return { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }
}

function makeSupabaseMock(opts: {
  isOperator?: boolean
  clientData?: Record<string, unknown> | null
  clientError?: { message: string } | null
} = {}) {
  const { isOperator = true, clientData = { id: 'client-1', name: 'ACME', auth_user_id: 'auth-user-1', pennylane_customer_id: '275890907' }, clientError = null } = opts

  const singleMock = vi.fn().mockResolvedValue({ data: clientData, error: clientError })
  const eqChain = { eq: vi.fn().mockReturnThis(), single: singleMock }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator-1' } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isOperator }),
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return { select: vi.fn().mockReturnValue(eqChain) }
      }
      return {
        insert: vi.fn().mockReturnValue(makeInsertChain()),
      }
    }),
  }
}

const mockLineItems = [
  { label: 'Conseil stratégique', description: null, quantity: 2, unitPrice: 500, vatRate: 'FR_200', unit: 'h', total: 1000 },
]

// V2 API : id est un number, amounts sont des strings, pas de wrapper { quote: ... }
const mockPennylaneQuote = {
  id: 4807770486,
  customer: { id: 275890907, url: 'https://app.pennylane.com/api/external/v2/customers/275890907' },
  quote_number: 'DEV-001',
  status: 'pending',
  date: '2026-04-11',
  deadline: '2026-05-11',
  invoice_lines: { url: 'https://app.pennylane.com/api/external/v2/quotes/4807770486/invoice_lines' },
  currency: 'EUR',
  amount: '1200.0',
  currency_amount_before_tax: '1000.0',
  currency_tax: '200.0',
  pdf_invoice_free_text: null,
  public_file_url: null,
  created_at: '2026-04-11T00:00:00Z',
  updated_at: '2026-04-11T00:00:00Z',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createAndSendQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTriggerBillingSync.mockResolvedValue({ data: { synced: 1 }, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    const supabase = makeSupabaseMock()
    supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

    const result = await createAndSendQuote('client-1', mockLineItems, {})
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when user is not an operator', async () => {
    const supabase = makeSupabaseMock({ isOperator: false })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

    const result = await createAndSendQuote('client-1', mockLineItems, {})
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('returns CLIENT_NOT_FOUND when client does not exist in DB', async () => {
    const supabase = makeSupabaseMock({ clientData: null, clientError: { message: 'Not found' } })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

    const result = await createAndSendQuote('client-1', mockLineItems, {})
    expect(result.error?.code).toBe('CLIENT_NOT_FOUND')
  })

  it('returns MISSING_EMAIL when client has no pennylane_customer_id and no email (auto-creation impossible)', async () => {
    // Story G : sans pennylane_customer_id, on tente l'auto-création — mais sans email c'est impossible
    const supabase = makeSupabaseMock({ clientData: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-1', pennylane_customer_id: null, email: null } })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)

    const result = await createAndSendQuote('client-1', mockLineItems, {})
    expect(result.error?.code).toBe('MISSING_EMAIL')
  })

  it('returns error when Pennylane POST fails', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: null, error: { message: 'API error', code: 'PENNYLANE_500' } })

    const result = await createAndSendQuote('client-1', mockLineItems, {})
    expect(result.error?.code).toBe('PENNYLANE_500')
  })

  it('crée un devis avec le bon format V2 (invoice_lines, raw_currency_unit_price, date)', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    // V2 : réponse directe sans wrapper
    mockPennylane.post.mockResolvedValue({ data: mockPennylaneQuote, error: null })

    const result = await createAndSendQuote('client-1', mockLineItems, { sendNow: false })

    expect(result.error).toBeNull()
    expect(mockPennylane.post).toHaveBeenCalledWith('/quotes', expect.objectContaining({
      customer_id: 275890907, // number (parseInt)
      invoice_lines: expect.arrayContaining([
        expect.objectContaining({
          label: 'Conseil stratégique',
          quantity: 2,
          raw_currency_unit_price: '500.00', // string
          vat_rate: 'FR_200',
        }),
      ]),
    }))
    // pas de wrapper quote
    const postBody = mockPennylane.post.mock.calls[0][1] as Record<string, unknown>
    expect(postBody.quote).toBeUndefined()
    expect(postBody.date).toBeDefined() // date obligatoire V2
  })

  it('ne tente pas de finaliser le devis (V2 : status pending par défaut)', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: mockPennylaneQuote, error: null })

    await createAndSendQuote('client-1', mockLineItems, { sendNow: true })

    // Un seul POST (création) — plus de finalize
    expect(mockPennylane.post).toHaveBeenCalledTimes(1)
  })

  it('inserts a payment notification for the client after quote creation', async () => {
    const supabase = makeSupabaseMock()
    const insertMock = vi.fn().mockReturnValue(makeInsertChain())
    supabase.from = vi.fn((table: string) => {
      if (table === 'clients') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-user-1', pennylane_customer_id: '275890907' }, error: null }) }) }
      }
      return { insert: insertMock }
    })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: mockPennylaneQuote, error: null })

    await createAndSendQuote('client-1', mockLineItems, { sendNow: true })

    const notifCall = insertMock.mock.calls.find((call) => {
      const arg = call[0]
      return arg?.type === 'payment' || (Array.isArray(arg) && arg[0]?.type === 'payment')
    })
    expect(notifCall).toBeDefined()
  })

  it('calls triggerBillingSync with clientId after successful quote creation', async () => {
    const supabase = makeSupabaseMock()
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: mockPennylaneQuote, error: null })

    await createAndSendQuote('client-1', mockLineItems, {})

    expect(mockTriggerBillingSync).toHaveBeenCalledWith('client-1')
  })

  it('logs activity_log with quote_created action', async () => {
    const supabase = makeSupabaseMock()
    const insertMock = vi.fn().mockReturnValue(makeInsertChain())
    supabase.from = vi.fn((table: string) => {
      if (table === 'clients') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-user-1', pennylane_customer_id: '275890907' }, error: null }) }) }
      }
      return { insert: insertMock }
    })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: mockPennylaneQuote, error: null })

    await createAndSendQuote('client-1', mockLineItems, {})

    const activityCall = insertMock.mock.calls.find((call) => {
      const arg = call[0]
      return arg?.action === 'quote_created' || (Array.isArray(arg) && arg[0]?.action === 'quote_created')
    })
    expect(activityCall).toBeDefined()
  })
})

// ── Tests déduction Lab (Story 11.6) ──────────────────────────────────────────

describe('createAndSendQuote — Lab deduction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTriggerBillingSync.mockResolvedValue({ data: { synced: 1 }, error: null })
  })

  it('ne ajoute pas de ligne déduction quand labDeduction=false', async () => {
    const supabase = makeSupabaseMock({
      clientData: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-1', pennylane_customer_id: '275890907', lab_paid: true },
    })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: mockPennylaneQuote, error: null })

    await createAndSendQuote('client-1', mockLineItems, { labDeduction: false })

    const postCall = mockPennylane.post.mock.calls[0]
    const lineItems = postCall[1].invoice_lines as Array<{ raw_currency_unit_price: string }>
    const hasDeduction = lineItems.some((li) => li.raw_currency_unit_price === '-199.00')
    expect(hasDeduction).toBe(false)
  })

  it('ne ajoute pas de ligne déduction quand client.lab_paid=false même avec labDeduction=true', async () => {
    const supabase = makeSupabaseMock({
      clientData: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-1', pennylane_customer_id: '275890907', lab_paid: false },
    })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: mockPennylaneQuote, error: null })

    await createAndSendQuote('client-1', mockLineItems, { labDeduction: true })

    const postCall = mockPennylane.post.mock.calls[0]
    const lineItems = postCall[1].invoice_lines as Array<{ raw_currency_unit_price: string }>
    const hasDeduction = lineItems.some((li) => li.raw_currency_unit_price === '-199.00')
    expect(hasDeduction).toBe(false)
  })

  it('ajoute une ligne déduction -199€ quand labDeduction=true et client.lab_paid=true', async () => {
    const supabase = makeSupabaseMock({
      clientData: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-1', pennylane_customer_id: '275890907', lab_paid: true },
    })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: mockPennylaneQuote, error: null })

    await createAndSendQuote('client-1', mockLineItems, { labDeduction: true })

    const postCall = mockPennylane.post.mock.calls[0]
    const lineItems = postCall[1].invoice_lines as Array<{ label: string; raw_currency_unit_price: string }>
    const deductionLine = lineItems.find((li) => li.raw_currency_unit_price === '-199.00')
    expect(deductionLine).toBeDefined()
    expect(deductionLine?.label).toBe('Déduction forfait Lab MonprojetPro')
  })

  it('stocke [LAB_DEDUCTION:19900] dans pdf_invoice_free_text quand déduction appliquée', async () => {
    const supabase = makeSupabaseMock({
      clientData: { id: 'client-1', name: 'ACME', auth_user_id: 'auth-1', pennylane_customer_id: '275890907', lab_paid: true },
    })
    mockCreateServerSupabaseClient.mockResolvedValue(supabase as unknown as ReturnType<typeof createServerSupabaseClient>)
    mockPennylane.post.mockResolvedValue({ data: mockPennylaneQuote, error: null })

    await createAndSendQuote('client-1', mockLineItems, { labDeduction: true })

    const postCall = mockPennylane.post.mock.calls[0]
    const freeText = postCall[1].pdf_invoice_free_text as string
    expect(freeText).toContain('[LAB_DEDUCTION:19900]')
  })
})
