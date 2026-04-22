import { describe, it, expect } from 'vitest'
import { calculateCostEur, getModelPricing, formatCostEur } from './token-cost-calculator'

describe('calculateCostEur', () => {
  it('calcule le coût pour Gemini 2.5 Flash', () => {
    // 1000 input + 500 output @ $0.15/$0.60 per 1M → EUR = * 0.92
    const cost = calculateCostEur('gemini-2.5-flash', 1000, 500)
    const expectedUsd = (1000 / 1_000_000) * 0.15 + (500 / 1_000_000) * 0.60
    const expectedEur = expectedUsd * 0.92
    expect(cost).toBeCloseTo(expectedEur, 6)
  })

  it('calcule le coût pour Claude Sonnet', () => {
    const cost = calculateCostEur('claude-sonnet-4-6', 10_000, 2_000)
    const expectedUsd = (10_000 / 1_000_000) * 3.00 + (2_000 / 1_000_000) * 15.00
    const expectedEur = expectedUsd * 0.92
    expect(cost).toBeCloseTo(expectedEur, 6)
  })

  it('calcule le coût pour Claude Haiku', () => {
    const cost = calculateCostEur('claude-haiku-4-5', 5_000, 1_000)
    const expectedUsd = (5_000 / 1_000_000) * 0.80 + (1_000 / 1_000_000) * 4.00
    const expectedEur = expectedUsd * 0.92
    expect(cost).toBeCloseTo(expectedEur, 6)
  })

  it('utilise le tarif par défaut pour un modèle inconnu', () => {
    const cost = calculateCostEur('unknown-model-xyz', 1_000, 500)
    // Doit utiliser le DEFAULT_PRICING (Gemini 2.5 Flash : $0.15/$0.60)
    const expectedUsd = (1_000 / 1_000_000) * 0.15 + (500 / 1_000_000) * 0.60
    const expectedEur = expectedUsd * 0.92
    expect(cost).toBeCloseTo(expectedEur, 6)
  })

  it('retourne 0 pour 0 tokens', () => {
    expect(calculateCostEur('gemini-2.5-flash', 0, 0)).toBe(0)
  })

  it('gère les noms de modèles avec variante (préfixe)', () => {
    // 'claude-sonnet-4-20250514' est dans la table
    const cost = calculateCostEur('claude-sonnet-4-20250514', 1_000, 500)
    expect(cost).toBeGreaterThan(0)
  })

  it('est insensible à la casse', () => {
    const cost1 = calculateCostEur('Gemini-2.5-Flash', 1000, 500)
    const cost2 = calculateCostEur('gemini-2.5-flash', 1000, 500)
    expect(cost1).toBe(cost2)
  })
})

describe('getModelPricing', () => {
  it('retourne les tarifs USD corrects pour Gemini', () => {
    const pricing = getModelPricing('gemini-2.5-flash')
    expect(pricing.inputPer1M).toBe(0.15)
    expect(pricing.outputPer1M).toBe(0.60)
    expect(pricing.currency).toBe('USD')
  })

  it('retourne les tarifs pour Opus', () => {
    const pricing = getModelPricing('claude-opus-4-6')
    expect(pricing.inputPer1M).toBe(15.00)
    expect(pricing.outputPer1M).toBe(75.00)
  })
})

describe('formatCostEur', () => {
  it('formate les petits montants avec 6 décimales', () => {
    expect(formatCostEur(0.000042)).toMatch(/0,000042 €/)
  })

  it('formate les montants >= 0.01 avec 2 décimales', () => {
    expect(formatCostEur(1.234)).toBe('1,23 €')
  })

  it('formate 0 correctement', () => {
    expect(formatCostEur(0)).toMatch(/€/)
  })
})
