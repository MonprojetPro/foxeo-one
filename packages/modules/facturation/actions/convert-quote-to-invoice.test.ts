import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================
// T-036 — tests REECRITS le 2026-10-06.
//
// L ancienne version mockait la reponse Pennylane A LA FORME V1
// (`{ quote: … }`, `{ customer_invoice: … }`, `line_items` embarquees) alors que
// le client HTTP tape V2. Elle validait donc du code qui plantait en reel : les
// 4 tests passaient au vert sur une action morte. Les mocks ci-dessous suivent
// la forme V2 REELLE, et deux tests verrouillent explicitement ce qui avait ete
// manque — corps plat, et refus de facturer un devis sans lignes.
// ============================================================

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('../config/pennylane', () => ({
  pennylaneClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('./get-quote-with-lines', () => ({
  getQuoteWithLines: vi.fn(),
}))

vi.mock('../utils/send-by-email-with-retry', () => ({
  sendByEmailWithRetry: vi.fn().mockResolvedValue({ sent: true, attempts: 1, lastError: null }),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { pennylaneClient } from '../config/pennylane'
import { getQuoteWithLines } from './get-quote-with-lines'
import { sendByEmailWithRetry } from '../utils/send-by-email-with-retry'
import { convertQuoteToInvoice } from './convert-quote-to-invoice'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)
const mockPennylane = vi.mocked(pennylaneClient)
const mockGetQuoteWithLines = vi.mocked(getQuoteWithLines)
const mockSendByEmail = vi.mocked(sendByEmailWithRetry)

// ── Helpers ───────────────────────────────────────────────────────────────────

type SupabaseMockOptions = {
  isOperator?: boolean
  /** Lignes presentes dans le miroir billing_sync (repli quand l API est muette) */
  mirroredLineItems?: unknown[] | null
  /** Facture deja rattachee au devis dans quote_metadata (garde anti-doublon) */
  alreadyInvoicedId?: string | null
}

function makeSupabaseMock(options: SupabaseMockOptions = {}) {
  const { isOperator = true, mirroredLineItems = null, alreadyInvoicedId = null } = options

  const upsert = vi.fn().mockResolvedValue({ error: null })
  const insert = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

  // Deux lectures distinctes passent par `select` et se distinguent par la table :
  //   quote_metadata → .select().eq().maybeSingle()        (1 seul eq)
  //   billing_sync   → .select().eq().eq().maybeSingle()   (2 eq)
  // Le mock expose donc `eq` ET `maybeSingle` au meme niveau, pour supporter
  // les deux chaines sans deviner laquelle est appelee.
  let currentTable = ''

  const select = vi.fn(() => {
    const makeChain = (table: string) => {
      const maybeSingle = vi.fn().mockResolvedValue({
        data:
          table === 'quote_metadata'
            ? alreadyInvoicedId
              ? { pennylane_invoice_id: alreadyInvoicedId }
              : { pennylane_invoice_id: null }
            : mirroredLineItems
              ? { data: { original_line_items: mirroredLineItems } }
              : null,
        error: null,
      })
      const chain: Record<string, unknown> = { maybeSingle }
      chain.eq = vi.fn(() => chain)
      return chain
    }
    return makeChain(currentTable)
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator-1' } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isOperator }),
    from: vi.fn((table: string) => {
      currentTable = table
      return { upsert, insert, update, select }
    }),
    __spies: { upsert, insert, update },
  }
}

function useSupabase(mock: ReturnType<typeof makeSupabaseMock>) {
  mockCreateServerSupabaseClient.mockResolvedValue(
    mock as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
  )
}

/** En-tete de devis AU FORMAT V2 : reponse plate, client sous `customer.id` */
const V2_QUOTE_HEADER = {
  id: 4242,
  customer: { id: 275890907, url: 'https://app.pennylane.com/customers/275890907' },
  quote_number: 'DEV-001',
  status: 'accepted',
  date: '2026-10-01',
  deadline: '2026-10-31',
  invoice_lines: { url: 'https://app.pennylane.com/quotes/4242/invoice_lines' },
  currency: 'EUR',
  amount: '600.00',
  currency_amount_before_tax: '500.00',
  currency_tax: '100.00',
  pdf_invoice_free_text: 'Prestation de conseil',
  public_file_url: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
}

const QUOTE_LINES = [
  {
    label: 'Conseil',
    description: null,
    quantity: 1,
    unit: 'h',
    unitPrice: 500,
    vatRate: 'FR_200',
    total: 500,
  },
]

function mockLinesOk() {
  mockGetQuoteWithLines.mockResolvedValue({
    data: {
      pennylaneQuoteId: '4242',
      publicNotes: 'Prestation de conseil',
      status: 'accepted',
      lineItems: QUOTE_LINES,
      wasOriginallySent: true,
    },
    error: null,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('convertQuoteToInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendByEmail.mockResolvedValue({ sent: true, attempts: 1, lastError: null })
  })

  it('refuse un utilisateur non authentifie', async () => {
    const supabase = makeSupabaseMock()
    supabase.auth.getUser = vi
      .fn()
      .mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') })
    useSupabase(supabase)

    const result = await convertQuoteToInvoice('4242', 'client-1')
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('refuse un utilisateur non operateur', async () => {
    useSupabase(makeSupabaseMock({ isOperator: false }))

    const result = await convertQuoteToInvoice('4242', 'client-1')
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('refuse de convertir deux fois le meme devis', async () => {
    useSupabase(makeSupabaseMock({ alreadyInvoicedId: '9000' }))
    mockLinesOk()
    mockPennylane.get.mockResolvedValue({ data: V2_QUOTE_HEADER, error: null })

    const result = await convertQuoteToInvoice('4242', 'client-1')

    expect(result.error?.code).toBe('ALREADY_INVOICED')
    expect(result.error?.message).toContain('9000')
    // Aucune seconde facture ne doit partir chez Pennylane
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it('cree la facture avec un corps PLAT V2 : invoice_lines, date, customer_id entier', async () => {
    useSupabase(makeSupabaseMock())
    mockLinesOk()
    mockPennylane.get.mockResolvedValue({ data: V2_QUOTE_HEADER, error: null })
    mockPennylane.post.mockResolvedValue({
      data: { id: 9001, invoice_number: 'FA-001', status: 'pending', amount: '600.00' },
      error: null,
    })

    const result = await convertQuoteToInvoice('4242', 'client-1')

    expect(result.error).toBeNull()
    expect(result.data?.pennylaneInvoiceId).toBe('9001')
    expect(result.data?.invoiceNumber).toBe('FA-001')
    expect(result.data?.totalHt).toBe(500)

    expect(mockPennylane.get).toHaveBeenCalledWith('/quotes/4242')

    const [path, body] = mockPennylane.post.mock.calls[0] as [string, Record<string, unknown>]
    expect(path).toBe('/customer_invoices')
    // Verrou anti-regression V1 : aucun wrapper, aucun `line_items`
    expect(body).not.toHaveProperty('customer_invoice')
    expect(body).not.toHaveProperty('line_items')
    expect(body.customer_id).toBe(275890907)
    expect(body).toHaveProperty('date')
    expect(Array.isArray(body.invoice_lines)).toBe(true)
    expect(body.invoice_lines).toHaveLength(1)
    expect((body.invoice_lines as Record<string, unknown>[])[0]).toMatchObject({
      label: 'Conseil',
      raw_currency_unit_price: '500.00',
      vat_rate: 'FR_200',
    })
  })

  it('refuse de facturer quand le devis n a aucune ligne recuperable', async () => {
    useSupabase(makeSupabaseMock({ mirroredLineItems: null }))
    mockGetQuoteWithLines.mockResolvedValue({
      data: null,
      error: { message: 'boom', code: 'PENNYLANE_404' },
    })
    mockPennylane.get.mockResolvedValue({ data: V2_QUOTE_HEADER, error: null })

    const result = await convertQuoteToInvoice('4242', 'client-1')

    expect(result.error?.code).toBe('QUOTE_LINES_EMPTY')
    // Aucune facture ne doit partir chez Pennylane
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it('se replie sur le miroir billing_sync quand l API ne rend pas les lignes', async () => {
    useSupabase(makeSupabaseMock({ mirroredLineItems: QUOTE_LINES }))
    mockGetQuoteWithLines.mockResolvedValue({
      data: {
        pennylaneQuoteId: '4242',
        publicNotes: null,
        status: 'accepted',
        lineItems: [],
        wasOriginallySent: false,
      },
      error: null,
    })
    mockPennylane.get.mockResolvedValue({ data: V2_QUOTE_HEADER, error: null })
    mockPennylane.post.mockResolvedValue({ data: { id: 9002, invoice_number: 'FA-002' }, error: null })

    const result = await convertQuoteToInvoice('4242', 'client-1')

    expect(result.error).toBeNull()
    expect(result.data?.pennylaneInvoiceId).toBe('9002')
    expect(result.data?.totalHt).toBe(500)
  })

  it('accepte une reponse wrappee { customer_invoice: { id } }', async () => {
    useSupabase(makeSupabaseMock())
    mockLinesOk()
    mockPennylane.get.mockResolvedValue({ data: V2_QUOTE_HEADER, error: null })
    mockPennylane.post.mockResolvedValue({
      data: { customer_invoice: { id: 9003, invoice_number: 'FA-003' } },
      error: null,
    })

    const result = await convertQuoteToInvoice('4242', 'client-1')

    expect(result.error).toBeNull()
    expect(result.data?.pennylaneInvoiceId).toBe('9003')
  })

  it('remonte une erreur si le client Pennylane est absent du devis', async () => {
    useSupabase(makeSupabaseMock())
    mockLinesOk()
    mockPennylane.get.mockResolvedValue({
      data: { ...V2_QUOTE_HEADER, customer: undefined },
      error: null,
    })

    const result = await convertQuoteToInvoice('4242', 'client-1')

    expect(result.error?.code).toBe('INVALID_RESPONSE')
    expect(mockPennylane.post).not.toHaveBeenCalled()
  })

  it('remonte l erreur Pennylane quand la creation echoue', async () => {
    useSupabase(makeSupabaseMock())
    mockLinesOk()
    mockPennylane.get.mockResolvedValue({ data: V2_QUOTE_HEADER, error: null })
    mockPennylane.post.mockResolvedValue({
      data: null,
      error: { message: 'API error', code: 'PENNYLANE_422' },
    })

    const result = await convertQuoteToInvoice('4242', 'client-1')
    expect(result.error?.code).toBe('PENNYLANE_422')
  })

  it("n envoie l email que si sendNow est demande, sur la ressource customer_invoices", async () => {
    useSupabase(makeSupabaseMock())
    mockLinesOk()
    mockPennylane.get.mockResolvedValue({ data: V2_QUOTE_HEADER, error: null })
    mockPennylane.post.mockResolvedValue({ data: { id: 9004, invoice_number: 'FA-004' }, error: null })

    const silent = await convertQuoteToInvoice('4242', 'client-1')
    expect(silent.data?.emailSent).toBe(false)
    expect(mockSendByEmail).not.toHaveBeenCalled()

    const sent = await convertQuoteToInvoice('4242', 'client-1', { sendNow: true })
    expect(sent.data?.emailSent).toBe(true)
    expect(mockSendByEmail).toHaveBeenCalledWith('9004', 'customer_invoices')
  })
})
