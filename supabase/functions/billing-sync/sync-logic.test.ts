import { describe, it, expect } from 'vitest'
import {
  normalizeCustomerId,
  buildCustomerClientMap,
  resolveClientId,
  extractSubscriptionCustomerId,
  computeSubscriptionAmountCents,
  type PennylaneSubscriptionApi,
} from './sync-logic'

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
