import { describe, it, expect } from 'vitest'
import {
  normalizeCustomerId,
  buildCustomerClientMap,
  resolveClientId,
  extractSubscriptionCustomerId,
  computeSubscriptionAmountCents,
  extractListItems,
  extractInvoiceCustomerId,
  isCreditNotePayload,
  mergeInvoiceData,
  type PennylaneSubscriptionApi,
} from './sync-logic'

// T-083 — la synchro lisait `customer_invoices` alors que l'API V2 rend `items` :
// liste toujours vide, `synced: 0` pendant un mois, factures payees affichees
// « a venir » dans le Hub. Ces tests verrouillent la forme V2.
describe('extractListItems (T-083)', () => {
  it('lit la cle V2 `items`', () => {
    expect(extractListItems({ items: [{ id: 1 }], has_more: false }, 'customer_invoices')).toEqual([{ id: 1 }])
  })

  it('retombe sur la cle historique si `items` est absent', () => {
    expect(extractListItems({ customer_invoices: [{ id: 2 }] }, 'customer_invoices')).toEqual([{ id: 2 }])
  })

  it('rend une liste vide pour une forme inconnue ou nulle', () => {
    expect(extractListItems({ data: 'x' }, 'customers')).toEqual([])
    expect(extractListItems(null, 'customers')).toEqual([])
  })
})

describe('extractInvoiceCustomerId (T-083)', () => {
  it('lit `customer.id` (forme V2 reelle)', () => {
    expect(extractInvoiceCustomerId({ customer: { id: 1558203228160 } })).toBe('1558203228160')
  })

  it('accepte encore `customer_id`', () => {
    expect(extractInvoiceCustomerId({ customer_id: '42' })).toBe('42')
  })

  it('rend null sans client', () => {
    expect(extractInvoiceCustomerId({ customer: null })).toBeNull()
  })
})

describe('isCreditNotePayload (T-083)', () => {
  it('reconnait un avoir par son statut', () => {
    expect(isCreditNotePayload({ status: 'credit_note', amount: '478.8' })).toBe(true)
  })

  it('reconnait un avoir par son montant negatif', () => {
    expect(isCreditNotePayload({ status: 'paid', amount: '-478.8' })).toBe(true)
  })

  it('laisse passer une facture normale', () => {
    expect(isCreditNotePayload({ status: 'paid', amount: '2400.0' })).toBe(false)
    expect(isCreditNotePayload({ status: 'upcoming', amount: null })).toBe(false)
  })
})

describe('mergeInvoiceData (T-083)', () => {
  it('garde les cles posees par le Hub et laisse Pennylane faire foi sur les siennes', () => {
    const merged = mergeInvoiceData(
      { restored_note: 'restauree', status: 'upcoming', paid: false },
      { status: 'paid', paid: true }
    )
    expect(merged).toEqual({ restored_note: 'restauree', status: 'paid', paid: true })
  })

  it('accepte une ligne locale absente', () => {
    expect(mergeInvoiceData(null, { status: 'paid' })).toEqual({ status: 'paid' })
  })
})

describe('normalizeCustomerId', () => {
  it('normalise un number en string', () => {
    expect(normalizeCustomerId(275890907)).toBe('275890907')
  })

  it('conserve une string valide (trim)', () => {
    expect(normalizeCustomerId(' 42 ')).toBe('42')
  })

  it('retourne null pour null / undefined / vide', () => {
    expect(normalizeCustomerId(null)).toBeNull()
    expect(normalizeCustomerId(undefined)).toBeNull()
    expect(normalizeCustomerId('')).toBeNull()
    expect(normalizeCustomerId('   ')).toBeNull()
  })

  it('traite les ids corrompus "undefined"/"null" comme absents', () => {
    expect(normalizeCustomerId('undefined')).toBeNull()
    expect(normalizeCustomerId('null')).toBeNull()
  })
})

describe('buildCustomerClientMap', () => {
  it('mappe pennylane_customer_id → clients.id', () => {
    const map = buildCustomerClientMap([
      { id: 'client-1', pennylane_customer_id: '100' },
      { id: 'client-2', pennylane_customer_id: '200' },
    ])
    expect(map.get('100')).toBe('client-1')
    expect(map.get('200')).toBe('client-2')
  })

  it('ignore les clients sans pennylane_customer_id', () => {
    const map = buildCustomerClientMap([
      { id: 'client-1', pennylane_customer_id: null },
      { id: 'client-2', pennylane_customer_id: 'undefined' },
    ])
    expect(map.size).toBe(0)
  })
})

describe('resolveClientId', () => {
  const map = new Map<string, string | null>([
    ['100', 'client-1'],
    ['300', null], // miss connu (cache négatif)
  ])

  it('résout un customer_id number vers le client_id', () => {
    expect(resolveClientId(map, 100)).toBe('client-1')
  })

  it('résout un customer_id string vers le client_id', () => {
    expect(resolveClientId(map, '100')).toBe('client-1')
  })

  it('retourne null pour un customer inconnu (row Hub-only, pas de client)', () => {
    expect(resolveClientId(map, '999')).toBeNull()
    expect(resolveClientId(map, '300')).toBeNull()
  })

  it('retourne null pour un customer_id absent', () => {
    expect(resolveClientId(map, null)).toBeNull()
    expect(resolveClientId(map, undefined)).toBeNull()
  })
})

describe('extractSubscriptionCustomerId', () => {
  it('lit customer_id direct', () => {
    expect(extractSubscriptionCustomerId({ id: 1, customer_id: 42 })).toBe('42')
  })

  it('lit customer.id en fallback (payload V2 imbriqué)', () => {
    expect(extractSubscriptionCustomerId({ id: 1, customer: { id: '42' } })).toBe('42')
  })

  it('retourne null si aucun customer', () => {
    expect(extractSubscriptionCustomerId({ id: 1 })).toBeNull()
  })
})

describe('computeSubscriptionAmountCents', () => {
  it('utilise le champ amount en priorité (euros → centimes)', () => {
    expect(computeSubscriptionAmountCents({ id: 1, amount: 39 })).toBe(3900)
    expect(computeSubscriptionAmountCents({ id: 1, amount: '99.00' })).toBe(9900)
  })

  it('somme les line_items quand amount est absent', () => {
    const sub: PennylaneSubscriptionApi = {
      id: 1,
      line_items: [
        { quantity: 1, raw_currency_unit_price: '39.00' },
        { quantity: 2, raw_currency_unit_price: '10.50' },
      ],
    }
    expect(computeSubscriptionAmountCents(sub)).toBe(6000)
  })

  it('quantity absent = 1', () => {
    const sub: PennylaneSubscriptionApi = {
      id: 1,
      line_items: [{ raw_currency_unit_price: '45.00' }],
    }
    expect(computeSubscriptionAmountCents(sub)).toBe(4500)
  })

  it('retourne null si aucune info exploitable', () => {
    expect(computeSubscriptionAmountCents({ id: 1 })).toBeNull()
    expect(computeSubscriptionAmountCents({ id: 1, line_items: [] })).toBeNull()
    expect(
      computeSubscriptionAmountCents({ id: 1, line_items: [{ raw_currency_unit_price: 'abc' }] })
    ).toBeNull()
  })
})
