// Story 12.7 — Tests logique monitoring instances (10 tests)

import { describe, it, expect } from 'vitest'
import {
  computeAlertLevel,
  computeMetricLevel,
  isLevelEscalation,
  getUsagePercent,
  buildAlertTitle,
  THRESHOLDS,
  type UsageMetrics,
} from './instances-monitor-logic'

const EMPTY_METRICS: UsageMetrics = {
  dbRows: 0,
  storageUsedMb: 0,
  bandwidthUsedGb: 0,
  edgeFunctionCalls: 0,
}

describe('computeMetricLevel', () => {
  it('retourne none sous le seuil info', () => {
    expect(computeMetricLevel(100_000, 'dbRows')).toBe('none')
  })

  it('retourne info à 60% (300K rows)', () => {
    expect(computeMetricLevel(300_000, 'dbRows')).toBe('info')
  })

  it('retourne warning à 80% (400K rows)', () => {
    expect(computeMetricLevel(400_000, 'dbRows')).toBe('warning')
  })

  it('retourne critical à 95% (475K rows)', () => {
    expect(computeMetricLevel(475_000, 'dbRows')).toBe('critical')
  })
})

describe('computeAlertLevel', () => {
  it('retourne none si toutes les métriques sont basses', () => {
    expect(computeAlertLevel(EMPTY_METRICS)).toBe('none')
  })

  it('retourne le niveau le plus élevé parmi toutes les métriques', () => {
    const metrics: UsageMetrics = {
      dbRows: 400_000,    // warning (seuil exact)
      storageUsedMb: 100, // none
      bandwidthUsedGb: 0, // none
      edgeFunctionCalls: 0, // none
    }
    expect(computeAlertLevel(metrics)).toBe('warning')
  })

  it('retourne critical si storage est critique', () => {
    const metrics: UsageMetrics = {
      ...EMPTY_METRICS,
      storageUsedMb: 960, // critical (> 950)
    }
    expect(computeAlertLevel(metrics)).toBe('critical')
  })
})

describe('isLevelEscalation', () => {
  it('retourne true si le niveau monte', () => {
    expect(isLevelEscalation('none', 'info')).toBe(true)
    expect(isLevelEscalation('info', 'warning')).toBe(true)
    expect(isLevelEscalation('warning', 'critical')).toBe(true)
  })

  it('retourne false si le niveau est identique ou descend', () => {
    expect(isLevelEscalation('warning', 'warning')).toBe(false)
    expect(isLevelEscalation('critical', 'warning')).toBe(false)
    expect(isLevelEscalation('none', 'none')).toBe(false)
  })
})

describe('getUsagePercent', () => {
  it('calcule le pourcentage correct', () => {
    expect(getUsagePercent(250_000, 500_000)).toBe(50)
    expect(getUsagePercent(500_000, 500_000)).toBe(100)
  })

  it('plafonne à 100%', () => {
    expect(getUsagePercent(600_000, 500_000)).toBe(100)
  })
})

describe('buildAlertTitle', () => {
  it('génère un titre correct pour le niveau warning', () => {
    const title = buildAlertTitle('acme', 'warning')
    expect(title).toBe('Instance acme — Seuil Avertissement atteint')
  })
})

describe('THRESHOLDS cohérence', () => {
  it('les seuils respectent info < warning < critical < max pour dbRows', () => {
    const t = THRESHOLDS.dbRows
    expect(t.info).toBeLessThan(t.warning)
    expect(t.warning).toBeLessThan(t.critical)
    expect(t.critical).toBeLessThan(t.max)
  })
})
