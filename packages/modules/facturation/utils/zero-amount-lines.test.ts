import { describe, it, expect } from 'vitest'
import {
  findZeroAmountLines,
  describeZeroAmountLine,
  describeZeroAmountLines,
} from './zero-amount-lines'
import type { LineItem } from '../types/billing.types'

// ============================================================
// T-043 — lignes a 0,00 €
//
// Verrou principal : une contre-ligne « Offert » (montant NEGATIF) ne doit
// JAMAIS etre signalee, sinon le geste commercial T-037 declencherait
// l avertissement a chaque emission.
// ============================================================

function line(partial: Partial<LineItem>): LineItem {
  return {
    label: 'Prestation',
    description: null,
    quantity: 1,
    unit: 'u',
    unitPrice: 100,
    vatRate: 'FR_200',
    total: 100,
    ...partial,
  }
}

describe('findZeroAmountLines', () => {
  it('ne signale rien quand toutes les lignes portent un montant', () => {
    expect(findZeroAmountLines([line({}), line({ unitPrice: 50 })])).toEqual([])
  })

  it('signale une ligne a prix unitaire nul', () => {
    const found = findZeroAmountLines([line({}), line({ label: 'Maintenance', unitPrice: 0 })])
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ index: 1, position: 2, label: 'Maintenance' })
  })

  it('signale une ligne a quantite nulle, prix non nul', () => {
    const found = findZeroAmountLines([line({ quantity: 0 })])
    expect(found).toHaveLength(1)
  })

  it('ne signale JAMAIS une contre-ligne negative (geste commercial T-037)', () => {
    const found = findZeroAmountLines([
      line({ label: 'Site vitrine', unitPrice: 2200 }),
      line({ label: 'Offert — Site vitrine', unitPrice: -2200 }),
      line({ label: 'Geste commercial', unitPrice: -399 }),
    ])
    expect(found).toEqual([])
  })

  it('traite un montant sous le demi-centime comme nul — il s imprime 0,00 €', () => {
    const found = findZeroAmountLines([line({ unitPrice: 0.004 })])
    expect(found).toHaveLength(1)
  })

  it('ne signale pas un montant d un centime', () => {
    expect(findZeroAmountLines([line({ unitPrice: 0.01 })])).toEqual([])
  })

  it('signale un montant non calculable et le marque illisible', () => {
    const found = findZeroAmountLines([line({ unitPrice: Number.NaN })])
    expect(found).toHaveLength(1)
    expect(found[0].isUnreadable).toBe(true)
  })

  it('remonte les lignes sans designation en premier', () => {
    const found = findZeroAmountLines([
      line({ label: 'Maintenance', unitPrice: 0 }),
      line({ label: '   ', unitPrice: 0 }),
    ])
    expect(found.map((l) => l.position)).toEqual([2, 1])
  })

  it('garde l ordre de saisie entre lignes nommees', () => {
    const found = findZeroAmountLines([
      line({ label: 'A', unitPrice: 0 }),
      line({ label: 'B', unitPrice: 0 }),
      line({ label: 'C', unitPrice: 0 }),
    ])
    expect(found.map((l) => l.label)).toEqual(['A', 'B', 'C'])
  })

  it('tolere une entree absente ou non tableau', () => {
    expect(findZeroAmountLines(null)).toEqual([])
    expect(findZeroAmountLines(undefined)).toEqual([])
  })
})

describe('describeZeroAmountLine', () => {
  it('nomme la ligne et son montant', () => {
    expect(
      describeZeroAmountLine({ index: 1, position: 2, label: 'Maintenance', isUnreadable: false })
    ).toBe('Ligne 2 « Maintenance » à 0,00 €')
  })

  it('signale explicitement une ligne sans designation', () => {
    expect(describeZeroAmountLine({ index: 0, position: 1, label: '', isUnreadable: false })).toBe(
      'Ligne 1 (sans désignation) à 0,00 €'
    )
  })

  it('dit « montant illisible » quand le calcul ne donne pas un nombre', () => {
    expect(describeZeroAmountLine({ index: 0, position: 1, label: 'X', isUnreadable: true })).toBe(
      'Ligne 1 « X » à montant illisible'
    )
  })
})

describe('describeZeroAmountLines', () => {
  it('rend une chaine vide sans ligne a signaler', () => {
    expect(describeZeroAmountLines([], 'cette facture')).toBe('')
  })

  it('accorde le pluriel et nomme le document', () => {
    const message = describeZeroAmountLines(
      [
        { index: 0, position: 1, label: 'A', isUnreadable: false },
        { index: 2, position: 3, label: 'B', isUnreadable: false },
      ],
      'ce devis'
    )
    expect(message).toContain('2 lignes à 0,00 € sur ce devis')
    expect(message).toContain('Ligne 1 « A »')
    expect(message).toContain('Ligne 3 « B »')
  })

  it('reste au singulier pour une seule ligne', () => {
    expect(
      describeZeroAmountLines(
        [{ index: 0, position: 1, label: 'A', isUnreadable: false }],
        'cette facture'
      )
    ).toContain('1 ligne à 0,00 € sur cette facture')
  })
})
