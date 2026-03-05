import { describe, it, expect } from 'vitest'
import {
  mapTierToElio,
  isDowngradeFromOnePlus,
  isUpgradeToOnePlus,
  TIER_INFO,
  TIER_BADGE_CLASSES,
} from './tier-helpers'
import type { SubscriptionTier } from '../types/subscription.types'

describe('mapTierToElio', () => {
  it('mappe base vers null', () => {
    expect(mapTierToElio('base')).toBeNull()
  })

  it('mappe essentiel vers one', () => {
    expect(mapTierToElio('essentiel')).toBe('one')
  })

  it('mappe agentique vers one_plus', () => {
    expect(mapTierToElio('agentique')).toBe('one_plus')
  })
})

describe('TIER_INFO', () => {
  it('contient les 3 tiers', () => {
    expect(Object.keys(TIER_INFO)).toEqual(['base', 'essentiel', 'agentique'])
  })

  it('base a le bon prix Ponctuel', () => {
    expect(TIER_INFO.base.price).toBe('Ponctuel')
    expect(TIER_INFO.base.elio).toBe('Aucun')
  })

  it('essentiel a le bon prix', () => {
    expect(TIER_INFO.essentiel.price).toBe('49€/mois')
    expect(TIER_INFO.essentiel.elio).toBe('Elio One')
  })

  it('agentique a le bon prix', () => {
    expect(TIER_INFO.agentique.price).toBe('99€/mois')
    expect(TIER_INFO.agentique.elio).toBe('Elio One+')
  })
})

describe('TIER_BADGE_CLASSES', () => {
  it('contient les 3 tiers', () => {
    expect(Object.keys(TIER_BADGE_CLASSES)).toEqual(['base', 'essentiel', 'agentique'])
  })

  it('agentique contient violet', () => {
    expect(TIER_BADGE_CLASSES.agentique).toContain('violet')
  })

  it('essentiel contient green', () => {
    expect(TIER_BADGE_CLASSES.essentiel).toContain('green')
  })
})

describe('isDowngradeFromOnePlus', () => {
  const downgradesCases: Array<[SubscriptionTier, SubscriptionTier, boolean]> = [
    ['agentique', 'essentiel', true],
    ['agentique', 'base', true],
    ['agentique', 'agentique', false],
    ['essentiel', 'base', false],
    ['base', 'essentiel', false],
  ]

  it.each(downgradesCases)(
    'isDowngradeFromOnePlus(%s → %s) = %s',
    (from, to, expected) => {
      expect(isDowngradeFromOnePlus(from, to)).toBe(expected)
    }
  )
})

describe('isUpgradeToOnePlus', () => {
  const upgradesCases: Array<[SubscriptionTier, SubscriptionTier, boolean]> = [
    ['base', 'agentique', true],
    ['essentiel', 'agentique', true],
    ['agentique', 'agentique', false],
    ['agentique', 'essentiel', false],
    ['base', 'essentiel', false],
  ]

  it.each(upgradesCases)(
    'isUpgradeToOnePlus(%s → %s) = %s',
    (from, to, expected) => {
      expect(isUpgradeToOnePlus(from, to)).toBe(expected)
    }
  )
})
