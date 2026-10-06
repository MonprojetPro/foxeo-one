import { describe, it, expect } from 'vitest'
import {
  applyCommercialGesture,
  reconstructGestureFromLines,
  DEFAULT_GESTURE_LABEL,
} from './commercial-gesture'
import type { LineItem } from '../types/billing.types'

// ============================================================
// T-037 — brique partagee des gestes commerciaux (facture ET devis).
//
// Le jeu de donnees est la proposition REELLE du CSE Habitat 77 : 12 390 € HT
// de tarif catalogue ramenes a 399 € HT, soit 11 991 € offerts (-97 %).
// ============================================================

function line(label: string, unitPrice: number, overrides: Partial<LineItem> = {}): LineItem {
  return {
    label,
    description: null,
    quantity: 1,
    unit: 'u',
    unitPrice,
    vatRate: 'FR_200',
    total: unitPrice,
    ...overrides,
  }
}

const CATALOGUE: LineItem[] = [
  line('Site vitrine QVCT', 3900),
  line('Interface praticien', 2800),
  line('Module de réservation en ligne', 1500),
  line('Dashboard entreprise anonymisé', 2200),
  line('Maintenance & hébergement', 1990),
]

describe('applyCommercialGesture', () => {
  it('ne touche a rien quand aucun geste n est demande', () => {
    const { data, error } = applyCommercialGesture(CATALOGUE)

    expect(error).toBeNull()
    expect(data?.lineItems).toHaveLength(5)
    expect(data?.catalogTotalHt).toBe(12390)
    expect(data?.finalTotalHt).toBe(12390)
    expect(data?.discountHt).toBe(0)
    expect(data?.offeredTotalHt).toBe(0)
  })

  it('refuse un jeu de lignes vide', () => {
    const { error } = applyCommercialGesture([])
    expect(error?.code).toBe('VALIDATION_ERROR')
  })

  // ── Remise globale ──────────────────────────────────────────────────────

  it('ramene 12 390 € a 399 € et pose une remise de 11 991 €', () => {
    const { data, error } = applyCommercialGesture(CATALOGUE, { targetTotalHt: 399 })

    expect(error).toBeNull()
    expect(data?.catalogTotalHt).toBe(12390)
    expect(data?.discountHt).toBe(11991)
    expect(data?.finalTotalHt).toBe(399)
    expect(data?.savingsPercentage).toBe(97)

    // Les 5 lignes catalogue sont INTACTES : la valeur doit rester lisible
    expect(data?.lineItems).toHaveLength(6)
    expect(data?.lineItems.slice(0, 5).map((l) => l.unitPrice)).toEqual([3900, 2800, 1500, 2200, 1990])

    const discountLine = data!.lineItems[5]
    expect(discountLine.label).toBe(DEFAULT_GESTURE_LABEL)
    expect(discountLine.unitPrice).toBe(-11991)
    expect(discountLine.vatRate).toBe('FR_200')
    expect(discountLine.description).toContain('-97 %')
    // T-037a — format FRANCAIS sur un document francais. `toFixed(2)` imprimait
    // « 12390.00 » au milieu des « 3 900,00 € » formates par Pennylane.
    // Le separateur de milliers de la locale fr-FR est une espace fine
    // insecable (U+202F), pas une espace ordinaire.
    expect(discountLine.description).toContain('11 991,00')
    expect(discountLine.description).toContain('12 390,00')
    expect(discountLine.description).not.toContain('.00')
  })

  it('utilise le libelle personnalise quand il est fourni', () => {
    const { data } = applyCommercialGesture(CATALOGUE, {
      targetTotalHt: 399,
      label: 'Tarif pilote Habitat77',
    })
    expect(data?.lineItems.at(-1)?.label).toBe('Tarif pilote Habitat77')
  })

  it('retombe sur le libelle par defaut si le libelle est vide ou blanc', () => {
    const { data } = applyCommercialGesture(CATALOGUE, { targetTotalHt: 399, label: '   ' })
    expect(data?.lineItems.at(-1)?.label).toBe(DEFAULT_GESTURE_LABEL)
  })

  it('peut masquer le pourcentage', () => {
    const { data } = applyCommercialGesture(CATALOGUE, {
      targetTotalHt: 399,
      showPercentage: false,
    })
    expect(data?.lineItems.at(-1)?.description).not.toContain('%')
  })

  it("n ajoute aucune ligne quand le prix final egale le total", () => {
    const { data } = applyCommercialGesture(CATALOGUE, { targetTotalHt: 12390 })
    expect(data?.lineItems).toHaveLength(5)
    expect(data?.discountHt).toBe(0)
  })

  it('refuse un prix final SUPERIEUR au total — ce serait une majoration', () => {
    const { data, error } = applyCommercialGesture(CATALOGUE, { targetTotalHt: 15000 })
    expect(data).toBeNull()
    expect(error?.code).toBe('VALIDATION_ERROR')
    expect(error?.message).toContain('majoration')
  })

  it('refuse un prix final negatif', () => {
    const { error } = applyCommercialGesture(CATALOGUE, { targetTotalHt: -100 })
    expect(error?.code).toBe('VALIDATION_ERROR')
  })

  it('refuse un prix final non numerique', () => {
    const { error } = applyCommercialGesture(CATALOGUE, { targetTotalHt: Number.NaN })
    expect(error?.code).toBe('VALIDATION_ERROR')
  })

  it('accepte un prix final a zero — tout est offert', () => {
    const { data, error } = applyCommercialGesture(CATALOGUE, { targetTotalHt: 0 })
    expect(error).toBeNull()
    expect(data?.finalTotalHt).toBe(0)
    expect(data?.discountHt).toBe(12390)
    expect(data?.savingsPercentage).toBe(100)
  })

  // ── Lignes offertes ─────────────────────────────────────────────────────

  it('offre une prestation en gardant son prix catalogue visible', () => {
    const lines = [
      line('Site vitrine QVCT', 3900),
      line('Dashboard entreprise anonymisé', 2200, { offered: true }),
    ]
    const { data, error } = applyCommercialGesture(lines)

    expect(error).toBeNull()
    expect(data?.catalogTotalHt).toBe(6100)
    expect(data?.offeredTotalHt).toBe(2200)
    expect(data?.finalTotalHt).toBe(3900)

    // La contre-ligne suit IMMEDIATEMENT la prestation offerte
    expect(data?.lineItems).toHaveLength(3)
    expect(data?.lineItems[1].label).toBe('Dashboard entreprise anonymisé')
    expect(data?.lineItems[1].unitPrice).toBe(2200)
    expect(data?.lineItems[2].label).toBe('Offert — Dashboard entreprise anonymisé')
    expect(data?.lineItems[2].unitPrice).toBe(-2200)
    expect(data?.lineItems[2].vatRate).toBe('FR_200')
  })

  it('tient compte de la quantite d une ligne offerte', () => {
    const lines = [line('Atelier', 500, { quantity: 4, offered: true })]
    const { data } = applyCommercialGesture(lines)

    expect(data?.offeredTotalHt).toBe(2000)
    expect(data?.lineItems[1].unitPrice).toBe(-2000)
    expect(data?.finalTotalHt).toBe(0)
  })

  it("n ajoute pas de contre-ligne pour une prestation deja a 0 €", () => {
    const lines = [line('Bonus', 0, { offered: true })]
    const { data } = applyCommercialGesture(lines)

    expect(data?.lineItems).toHaveLength(1)
    expect(data?.offeredTotalHt).toBe(0)
  })

  it('ne laisse jamais fuiter le marqueur offered vers Pennylane', () => {
    const lines = [line('Dashboard', 2200, { offered: true })]
    const { data } = applyCommercialGesture(lines)

    for (const item of data!.lineItems) {
      expect(item.offered).toBeUndefined()
    }
  })

  it('reprend la description d origine sur la contre-ligne', () => {
    const lines = [line('Dashboard', 2200, { offered: true, description: 'KPIs temps réel' })]
    const { data } = applyCommercialGesture(lines)

    expect(data?.lineItems[1].description).toBe('KPIs temps réel — offert')
  })

  // ── Cumul des deux gestes ───────────────────────────────────────────────

  it('cumule une prestation offerte ET une remise globale', () => {
    const lines = [
      line('Site vitrine QVCT', 3900),
      line('Interface praticien', 2800),
      line('Module de réservation en ligne', 1500),
      line('Dashboard entreprise anonymisé', 2200, { offered: true }),
      line('Maintenance & hébergement', 1990),
    ]
    const { data, error } = applyCommercialGesture(lines, { targetTotalHt: 399 })

    expect(error).toBeNull()
    expect(data?.catalogTotalHt).toBe(12390)
    expect(data?.offeredTotalHt).toBe(2200)
    // La remise globale ne porte QUE sur le reste : 12 390 - 2 200 - 399
    expect(data?.discountHt).toBe(9791)
    expect(data?.finalTotalHt).toBe(399)
    expect(data?.savingsPercentage).toBe(97)

    // 5 lignes + 1 contre-ligne « Offert » + 1 remise globale
    expect(data?.lineItems).toHaveLength(7)
  })

  it('refuse un prix final superieur au reste apres prestations offertes', () => {
    const lines = [line('A', 1000, { offered: true }), line('B', 500)]
    const { error } = applyCommercialGesture(lines, { targetTotalHt: 800 })

    expect(error?.code).toBe('VALIDATION_ERROR')
    expect(error?.message).toContain('500,00')
  })

  // ── TVA ─────────────────────────────────────────────────────────────────

  it('refuse une remise globale sur des taux de TVA heterogenes', () => {
    const lines = [line('A', 1000), line('B', 500, { vatRate: 'FR_100' })]
    const { data, error } = applyCommercialGesture(lines, { targetTotalHt: 100 })

    expect(data).toBeNull()
    expect(error?.code).toBe('MIXED_VAT_RATES')
    expect(error?.message).toContain('FR_200')
    expect(error?.message).toContain('FR_100')
  })

  it('autorise des taux heterogenes tant qu il n y a PAS de remise globale', () => {
    const lines = [line('A', 1000, { offered: true }), line('B', 500, { vatRate: 'FR_100' })]
    const { data, error } = applyCommercialGesture(lines)

    expect(error).toBeNull()
    expect(data?.finalTotalHt).toBe(500)
    // Chaque contre-ligne porte le taux de SA prestation
    expect(data?.lineItems[1].vatRate).toBe('FR_200')
  })

  it('ignore le taux des lignes offertes pour choisir celui de la remise', () => {
    const lines = [
      line('Offerte a 10%', 1000, { offered: true, vatRate: 'FR_100' }),
      line('Payante a 20%', 2000),
    ]
    const { data, error } = applyCommercialGesture(lines, { targetTotalHt: 500 })

    expect(error).toBeNull()
    expect(data?.lineItems.at(-1)?.vatRate).toBe('FR_200')
  })

  // ── Arrondis ────────────────────────────────────────────────────────────

  it('arrondit au centime sans trainee de virgule flottante', () => {
    const lines = [line('A', 0.1, { quantity: 3 }), line('B', 0.2)]
    const { data } = applyCommercialGesture(lines, { targetTotalHt: 0.1 })

    expect(data?.catalogTotalHt).toBe(0.5)
    expect(data?.discountHt).toBe(0.4)
    expect(data?.finalTotalHt).toBe(0.1)
  })
})

// ============================================================
// reconstructGestureFromLines — reprise en edition d un document deja emis.
//
// Sans elle, rouvrir un devis remisé echouait sur « Prix >= 0 » devant une
// ligne que personne n a saisie, et un reenregistrement aurait applique le
// geste UNE SECONDE FOIS par-dessus les contre-lignes existantes.
// ============================================================

describe('reconstructGestureFromLines', () => {
  it('ne touche a rien quand le document ne porte aucun geste', () => {
    const restored = reconstructGestureFromLines(CATALOGUE)

    expect(restored.lineItems).toHaveLength(5)
    expect(restored.targetTotalHt).toBeNull()
    expect(restored.label).toBeNull()
    expect(restored.lineItems.every((l) => l.offered !== true)).toBe(true)
  })

  it('retire la ligne de remise et restitue le prix final', () => {
    const emitted = applyCommercialGesture(CATALOGUE, { targetTotalHt: 399 }).data!.lineItems

    const restored = reconstructGestureFromLines(emitted)

    expect(restored.lineItems).toHaveLength(5)
    expect(restored.targetTotalHt).toBe(399)
    expect(restored.label).toBe(DEFAULT_GESTURE_LABEL)
  })

  it('repose le marqueur offered sur la bonne prestation', () => {
    const lines = [line('Site vitrine QVCT', 3900), line('Dashboard', 2200, { offered: true })]
    const emitted = applyCommercialGesture(lines).data!.lineItems

    const restored = reconstructGestureFromLines(emitted)

    expect(restored.lineItems).toHaveLength(2)
    expect(restored.lineItems[0].offered).toBeUndefined()
    expect(restored.lineItems[1].offered).toBe(true)
    expect(restored.targetTotalHt).toBeNull()
  })

  it('restitue un libelle personnalise', () => {
    const emitted = applyCommercialGesture(CATALOGUE, {
      targetTotalHt: 399,
      label: 'Tarif pilote Habitat77',
    }).data!.lineItems

    expect(reconstructGestureFromLines(emitted).label).toBe('Tarif pilote Habitat77')
  })

  it('fait un aller-retour FIDELE sur le cumul offert + remise', () => {
    const lines = [
      line('Site vitrine QVCT', 3900),
      line('Interface praticien', 2800),
      line('Module de réservation en ligne', 1500),
      line('Dashboard entreprise anonymisé', 2200, { offered: true }),
      line('Maintenance & hébergement', 1990),
    ]
    const emitted = applyCommercialGesture(lines, { targetTotalHt: 399 }).data!

    const restored = reconstructGestureFromLines(emitted.lineItems)

    expect(restored.lineItems).toHaveLength(5)
    expect(restored.lineItems[3].offered).toBe(true)
    expect(restored.targetTotalHt).toBe(399)

    // Le verrou qui compte : reappliquer le geste sur les lignes restituees
    // doit redonner EXACTEMENT le meme document, pas une remise doublee.
    const reapplied = applyCommercialGesture(restored.lineItems, {
      targetTotalHt: restored.targetTotalHt,
      label: restored.label,
    }).data!

    expect(reapplied.finalTotalHt).toBe(399)
    expect(reapplied.discountHt).toBe(emitted.discountHt)
    expect(reapplied.lineItems).toHaveLength(emitted.lineItems.length)
  })

  it('ne confond pas une prestation offerte avec une remise globale', () => {
    const lines = [line('Dashboard', 2200, { offered: true }), line('Site', 3900)]
    const emitted = applyCommercialGesture(lines, { targetTotalHt: 1000 }).data!.lineItems

    const restored = reconstructGestureFromLines(emitted)

    expect(restored.lineItems).toHaveLength(2)
    expect(restored.lineItems[0].offered).toBe(true)
    expect(restored.targetTotalHt).toBe(1000)
  })

  it('tolere un document vide', () => {
    const restored = reconstructGestureFromLines([])
    expect(restored.lineItems).toEqual([])
    expect(restored.targetTotalHt).toBeNull()
  })

  it('cumule plusieurs lignes negatives non prefixees en une seule remise', () => {
    const lines = [
      line('Site', 3900),
      line('Remise A', -400),
      line('Remise B', -500),
    ]
    const restored = reconstructGestureFromLines(lines)

    expect(restored.lineItems).toHaveLength(1)
    expect(restored.targetTotalHt).toBe(3000)
    expect(restored.label).toBe('Remise A')
  })
})
