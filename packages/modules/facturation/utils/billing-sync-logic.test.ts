import { describe, it, expect } from 'vitest'
import {
  parseChangelogPage,
  aggregateChangelogPages,
  shouldNotifyOperator,
  computeErrorState,
  computeSuccessState,
  chunkArray,
  buildIdFilter,
  buildChangelogUrl,
  buildChangelogCursorUrl,
  extractRetryAfter,
  buildInvoiceRow,
  buildCustomerRow,
  MAX_CONSECUTIVE_ERRORS,
  BATCH_SIZE,
  PENNYLANE_BASE_URL,
  isLabInvoice,
  shouldActivateLabAccess,
  LAB_INVOICE_TAG,
  LAB_AMOUNT_CENTS,
} from './billing-sync-logic'
import type { ChangelogPage, BillingSyncState } from './billing-sync-logic'

// ── Tests parsing changelog ───────────────────────────────────────────────────

describe('parseChangelogPage', () => {
  it('sépare les insertions/mises à jour des suppressions', () => {
    const page: ChangelogPage = {
      changelogs: [
        { id: 'inv-1', operation: 'insert' },
        { id: 'inv-2', operation: 'update' },
        { id: 'inv-3', operation: 'delete' },
      ],
      has_more: false,
    }

    const result = parseChangelogPage(page)

    expect(result.upsertIds).toEqual(['inv-1', 'inv-2'])
    expect(result.deleteIds).toEqual(['inv-3'])
  })

  it('retourne des tableaux vides pour un changelog vide', () => {
    const page: ChangelogPage = { changelogs: [], has_more: false }
    const result = parseChangelogPage(page)

    expect(result.upsertIds).toHaveLength(0)
    expect(result.deleteIds).toHaveLength(0)
  })
})

describe('aggregateChangelogPages', () => {
  it('agrège plusieurs pages en listes consolidées', () => {
    const pages: ChangelogPage[] = [
      { changelogs: [{ id: 'A', operation: 'insert' }], has_more: true, next_cursor: 'c1' },
      { changelogs: [{ id: 'B', operation: 'delete' }, { id: 'C', operation: 'update' }], has_more: false },
    ]

    const result = aggregateChangelogPages(pages)

    expect(result.upsertIds).toEqual(['A', 'C'])
    expect(result.deleteIds).toEqual(['B'])
  })
})

// ── Tests gestion erreurs consécutives ────────────────────────────────────────

describe('shouldNotifyOperator', () => {
  it(`retourne true quand consecutive_errors >= ${MAX_CONSECUTIVE_ERRORS}`, () => {
    expect(shouldNotifyOperator(MAX_CONSECUTIVE_ERRORS)).toBe(true)
    expect(shouldNotifyOperator(MAX_CONSECUTIVE_ERRORS + 1)).toBe(true)
  })

  it(`retourne false quand consecutive_errors < ${MAX_CONSECUTIVE_ERRORS}`, () => {
    expect(shouldNotifyOperator(0)).toBe(false)
    expect(shouldNotifyOperator(MAX_CONSECUTIVE_ERRORS - 1)).toBe(false)
  })
})

describe('computeErrorState', () => {
  const baseState: BillingSyncState = {
    entity_type: 'invoice',
    last_sync_at: '2026-03-01T00:00:00Z',
    consecutive_errors: 1,
  }

  it('incrémente consecutive_errors et stocke le message', () => {
    const result = computeErrorState(baseState, 'rate limited')

    expect(result.consecutive_errors).toBe(2)
    expect(result.last_error).toBe('rate limited')
    expect(result.last_sync_at).toBe(baseState.last_sync_at) // inchangé
  })
})

describe('computeSuccessState', () => {
  const baseState: BillingSyncState = {
    entity_type: 'invoice',
    last_sync_at: '2026-01-01T00:00:00Z',
    consecutive_errors: 2,
    last_error: 'previous error',
  }

  it('remet consecutive_errors à 0 et met à jour last_sync_at', () => {
    const before = Date.now()
    const result = computeSuccessState(baseState)
    const after = Date.now()

    expect(result.consecutive_errors).toBe(0)
    expect(result.last_error).toBeNull()

    const resultTime = new Date(result.last_sync_at).getTime()
    expect(resultTime).toBeGreaterThanOrEqual(before)
    expect(resultTime).toBeLessThanOrEqual(after)
  })
})

// ── Tests batch helpers ───────────────────────────────────────────────────────

describe('chunkArray', () => {
  it(`divise un tableau en chunks de ${BATCH_SIZE}`, () => {
    const arr = Array.from({ length: 250 }, (_, i) => `id-${i}`)
    const chunks = chunkArray(arr, BATCH_SIZE)

    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toHaveLength(BATCH_SIZE)
    expect(chunks[1]).toHaveLength(BATCH_SIZE)
    expect(chunks[2]).toHaveLength(50)
  })

  it('retourne un seul chunk si le tableau est plus petit que la taille', () => {
    const arr = ['a', 'b', 'c']
    const chunks = chunkArray(arr, 10)

    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toEqual(['a', 'b', 'c'])
  })
})

describe('buildIdFilter', () => {
  it('construit un filtre Pennylane valide', () => {
    const filter = buildIdFilter(['id-1', 'id-2'])
    const parsed = JSON.parse(filter) as Array<{ field: string; operator: string; value: string[] }>

    expect(parsed).toHaveLength(1)
    expect(parsed[0].field).toBe('id')
    expect(parsed[0].operator).toBe('in')
    expect(parsed[0].value).toEqual(['id-1', 'id-2'])
  })
})

// ── Tests URL construction ────────────────────────────────────────────────────

describe('buildChangelogUrl', () => {
  it('construit une URL avec start_date', () => {
    const url = buildChangelogUrl('/changelogs/customer_invoices', '2026-03-01T00:00:00Z')

    expect(url).toContain(PENNYLANE_BASE_URL)
    expect(url).toContain('/changelogs/customer_invoices')
    expect(url).toContain('start_date=')
    expect(url).toContain('per_page=1000')
  })
})

describe('buildChangelogCursorUrl', () => {
  it('construit une URL avec cursor (sans start_date)', () => {
    const url = buildChangelogCursorUrl('/changelogs/customer_invoices', 'cursor-abc123')

    expect(url).toContain('cursor=cursor-abc123')
    expect(url).not.toContain('start_date=')
  })
})

describe('extractRetryAfter', () => {
  it('extrait la valeur retry-after', () => {
    const headers = new Headers({ 'retry-after': '30' })
    expect(extractRetryAfter(headers)).toBe(30)
  })

  it('retourne 60 par défaut si header absent', () => {
    const headers = new Headers()
    expect(extractRetryAfter(headers)).toBe(60)
  })
})

// ── Tests row builders ────────────────────────────────────────────────────────

describe('buildInvoiceRow', () => {
  it('construit une ligne billing_sync pour une facture', () => {
    const invoice = {
      id: 'inv-pennya-001',
      status: 'paid',
      amount: 1500.50,
      customer_id: 'cust-1',
    }
    const syncedAt = '2026-03-07T10:00:00Z'

    const row = buildInvoiceRow(invoice, syncedAt)

    expect(row.entity_type).toBe('invoice')
    expect(row.pennylane_id).toBe('inv-pennya-001')
    expect(row.status).toBe('paid')
    expect(row.amount).toBe(150050) // converti en centimes
    expect(row.last_synced_at).toBe(syncedAt)
    expect(row.data).toEqual(invoice)
  })

  it('gère un montant nul (0)', () => {
    const invoice = { id: 'inv-zero', status: 'draft', amount: 0 }
    const row = buildInvoiceRow(invoice, '2026-03-07T00:00:00Z')

    expect(row.amount).toBe(0)
  })
})

describe('buildCustomerRow', () => {
  it('construit une ligne billing_sync pour un customer avec status active', () => {
    const customer = { id: 'cust-pennya-001', name: 'Acme Corp', emails: ['acme@test.com'] }
    const syncedAt = '2026-03-07T10:00:00Z'

    const row = buildCustomerRow(customer, syncedAt)

    expect(row.entity_type).toBe('customer')
    expect(row.pennylane_id).toBe('cust-pennya-001')
    expect(row.status).toBe('active')
    expect(row.data).toEqual(customer)
    expect(row.last_synced_at).toBe(syncedAt)
  })
})

// ── Tests Lab invoice detection (Story 11.6) ──────────────────────────────────

describe('isLabInvoice', () => {
  it('retourne false pour null', () => {
    expect(isLabInvoice(null)).toBe(false)
  })

  it('retourne false pour undefined', () => {
    expect(isLabInvoice(undefined)).toBe(false)
  })

  it('retourne true quand pdf_invoice_free_text contient le tag lab', () => {
    expect(isLabInvoice(LAB_INVOICE_TAG)).toBe(true)
  })

  it('retourne true quand le tag est présent dans du texte plus long', () => {
    expect(isLabInvoice(`Facture Lab ${LAB_INVOICE_TAG} — données internes`)).toBe(true)
  })

  it('retourne false pour un texte sans le tag', () => {
    expect(isLabInvoice('Facture ordinaire sans tag')).toBe(false)
  })
})

describe('shouldActivateLabAccess', () => {
  it('retourne true quand status=paid et tag lab présent', () => {
    expect(shouldActivateLabAccess({ status: 'paid', pdf_invoice_free_text: LAB_INVOICE_TAG })).toBe(true)
  })

  it('retourne false quand status=unpaid même avec tag lab', () => {
    expect(shouldActivateLabAccess({ status: 'unpaid', pdf_invoice_free_text: LAB_INVOICE_TAG })).toBe(false)
  })

  it('retourne false quand pdf_invoice_free_text est null même si status=paid', () => {
    expect(shouldActivateLabAccess({ status: 'paid', pdf_invoice_free_text: null })).toBe(false)
  })

  it('retourne false quand pdf_invoice_free_text sans tag et status=paid', () => {
    expect(shouldActivateLabAccess({ status: 'paid', pdf_invoice_free_text: 'Facture ordinaire' })).toBe(false)
  })
})

describe('LAB_AMOUNT_CENTS', () => {
  it('vaut 19900 centimes (199€)', () => {
    expect(LAB_AMOUNT_CENTS).toBe(19900)
  })
})
