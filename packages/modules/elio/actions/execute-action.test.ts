import { describe, it, expect } from 'vitest'
import { checkElioTierAccess } from './execute-action'

/**
 * Décision MiKL 2026-08-19 : l'agentique ne distingue plus One de One+ (seul le coaching
 * HUMAIN les sépare). Ce verrou refuse donc TOUJOURS, quel que soit `elio_tier` — y
 * compris pour les clients restés en `one_plus` en base.
 */
describe('checkElioTierAccess — agentique coupée pour tous les tiers', () => {
  it('refuse un client quelconque avec le message renvoyant vers MiKL', async () => {
    const result = await checkElioTierAccess('client-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('TIER_INSUFFICIENT')
    expect(result.error?.message).toContain('MiKL')
  })

  it('refuse aussi un client historiquement en one_plus', async () => {
    // Le point de la décision : ces clients ne doivent plus avoir d'Élio agentique.
    const result = await checkElioTierAccess('client-one-plus')

    expect(result.error?.code).toBe('TIER_INSUFFICIENT')
  })

  it('ne vend jamais une montée en gamme dans son message', async () => {
    // L'automatisation est du sur-mesure au devis, pas un argument d'upsell vers One+.
    const result = await checkElioTierAccess('client-1')

    expect(result.error?.message).not.toMatch(/One\+/)
    expect(result.error?.message).not.toMatch(/pass(ez|er) à/i)
  })

  it('retourne INVALID_INPUT si clientId vide', async () => {
    const result = await checkElioTierAccess('')

    expect(result.error?.code).toBe('INVALID_INPUT')
  })
})
