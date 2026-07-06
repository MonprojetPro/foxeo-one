import { describe, it, expect } from 'vitest'
import {
  startOfCurrentMonthISO,
  previousMonthLabelFr,
  groupItemsByClient,
  sumAmountCents,
  buildCoachingInvoiceLines,
  coachingInvoiceLabel,
  type PendingBillableItem,
} from './monthly-billing-logic'

const makeItem = (overrides: Partial<PendingBillableItem> = {}): PendingBillableItem => ({
  id: 'item-1',
  client_id: 'client-1',
  label: 'Séance coaching — 15/06/2026',
  amount_cents: 4500,
  ...overrides,
})

describe('startOfCurrentMonthISO', () => {
  it('retourne le 1er du mois courant à minuit UTC', () => {
    expect(startOfCurrentMonthISO(new Date('2026-07-01T06:00:00Z'))).toBe(
      '2026-07-01T00:00:00.000Z'
    )
    expect(startOfCurrentMonthISO(new Date('2026-07-15T23:59:00Z'))).toBe(
      '2026-07-01T00:00:00.000Z'
    )
  })

  it('gère le passage d\'année', () => {
    expect(startOfCurrentMonthISO(new Date('2027-01-01T05:00:00Z'))).toBe(
      '2027-01-01T00:00:00.000Z'
    )
  })
})

describe('previousMonthLabelFr', () => {
  it('run le 1er juillet → "juin 2026"', () => {
    expect(previousMonthLabelFr(new Date('2026-07-01T06:00:00Z'))).toBe('juin 2026')
  })

  it('run le 1er janvier → décembre de l\'année précédente', () => {
    expect(previousMonthLabelFr(new Date('2027-01-01T06:00:00Z'))).toBe('décembre 2026')
  })
})

describe('coachingInvoiceLabel', () => {
  it('construit le libellé avec le mois écoulé', () => {
    expect(coachingInvoiceLabel(new Date('2026-07-01T06:00:00Z'))).toBe(
      'Séances coaching supplémentaires — juin 2026'
    )
  })
})

describe('groupItemsByClient', () => {
  it('regroupe les items pending par client_id', () => {
    const items = [
      makeItem({ id: 'a', client_id: 'client-1' }),
      makeItem({ id: 'b', client_id: 'client-2' }),
      makeItem({ id: 'c', client_id: 'client-1' }),
    ]
    const grouped = groupItemsByClient(items)
    expect(grouped.size).toBe(2)
    expect(grouped.get('client-1')?.map((i) => i.id)).toEqual(['a', 'c'])
    expect(grouped.get('client-2')?.map((i) => i.id)).toEqual(['b'])
  })

  it('retourne une map vide sans items', () => {
    expect(groupItemsByClient([]).size).toBe(0)
  })
})

describe('sumAmountCents', () => {
  it('somme les montants (2 séances à 45 € = 9000 centimes)', () => {
    expect(sumAmountCents([makeItem(), makeItem({ id: 'b' })])).toBe(9000)
  })

  it('retourne 0 sans items', () => {
    expect(sumAmountCents([])).toBe(0)
  })
})

describe('buildCoachingInvoiceLines', () => {
  it('produit une ligne V2 par item (45.00, FR_200, service)', () => {
    const lines = buildCoachingInvoiceLines([
      makeItem({ label: 'Séance coaching — 15/06/2026' }),
      makeItem({ id: 'b', label: 'Séance coaching — 22/06/2026' }),
    ])
    expect(lines).toHaveLength(2)
    expect(lines[0]).toEqual({
      label: 'Séance coaching — 15/06/2026',
      quantity: 1,
      raw_currency_unit_price: '45.00',
      vat_rate: 'FR_200',
      unit: 'service',
    })
    expect(lines[1].label).toBe('Séance coaching — 22/06/2026')
  })
})
