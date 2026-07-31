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
  it('mappe ponctuel vers null', () => {
    expect(mapTierToElio('ponctuel')).toBeNull()
  })

  it('mappe one vers one', () => {
    expect(mapTierToElio('one')).toBe('one')
  })

  it('mappe one_plus vers one_plus (grille v2 Contrat 6 — One+ = coaching humain, 2026-07-06)', () => {
    expect(mapTierToElio('one_plus')).toBe('one_plus')
  })
})

describe('TIER_INFO', () => {
  it('contient les 3 offres', () => {
    expect(Object.keys(TIER_INFO)).toEqual(['ponctuel', 'one', 'one_plus'])
  })

  it('ponctuel a le bon prix', () => {
    expect(TIER_INFO.ponctuel.price).toBe('Devis')
    expect(TIER_INFO.ponctuel.elio).toBe('Aucun')
  })

  it('one a le bon prix (grille v2 — One 49 €/mois)', () => {
    expect(TIER_INFO.one.price).toBe('49€/mois')
    expect(TIER_INFO.one.elio).toBe('Elio One')
  })

  it('one_plus a le bon prix', () => {
    expect(TIER_INFO.one_plus.price).toBe('99€/mois')
    expect(TIER_INFO.one_plus.elio).toBe('Elio One+')
  })
})

describe('TIER_BADGE_CLASSES', () => {
  it('contient les 3 offres', () => {
    expect(Object.keys(TIER_BADGE_CLASSES)).toEqual(['ponctuel', 'one', 'one_plus'])
  })

  it('one_plus contient violet', () => {
    expect(TIER_BADGE_CLASSES.one_plus).toContain('violet')
  })

  it('one contient green', () => {
    expect(TIER_BADGE_CLASSES.one).toContain('green')
  })
})

describe('isDowngradeFromOnePlus', () => {
  const downgradesCases: Array<[SubscriptionTier, SubscriptionTier, boolean]> = [
    ['one_plus', 'one', true],
    ['one_plus', 'ponctuel', true],
    ['one_plus', 'one_plus', false],
    ['one', 'ponctuel', false],
    ['ponctuel', 'one', false],
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
    ['ponctuel', 'one_plus', true],
    ['one', 'one_plus', true],
    ['one_plus', 'one_plus', false],
    ['one_plus', 'one', false],
    ['ponctuel', 'one', false],
  ]

  it.each(upgradesCases)(
    'isUpgradeToOnePlus(%s → %s) = %s',
    (from, to, expected) => {
      expect(isUpgradeToOnePlus(from, to)).toBe(expected)
    }
  )
})
