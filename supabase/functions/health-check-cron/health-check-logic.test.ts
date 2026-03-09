import { describe, it, expect } from 'vitest'
import {
  evaluateServiceStatus,
  determineGlobalStatus,
  shouldSendAlert,
  buildHealthCheckResult,
  getAlertingServices,
  ALERT_DEBOUNCE_MS,
  type ServiceCheck,
} from './health-check-logic'

describe('evaluateServiceStatus', () => {
  it('retourne "ok" si latence sous le seuil warn', () => {
    expect(evaluateServiceStatus('supabase_db', 200, false)).toBe('ok')
  })

  it('retourne "degraded" si latence entre warn et error', () => {
    expect(evaluateServiceStatus('supabase_db', 400, false)).toBe('degraded')
  })

  it('retourne "error" si latence >= seuil error', () => {
    expect(evaluateServiceStatus('supabase_db', 600, false)).toBe('error')
  })

  it('retourne "error" si failed=true indépendamment de la latence', () => {
    expect(evaluateServiceStatus('supabase_db', 50, true)).toBe('error')
  })

  it('retourne "ok" pour Pennylane sous le seuil warn (1500ms)', () => {
    expect(evaluateServiceStatus('pennylane', 1000, false)).toBe('ok')
  })

  it('retourne "degraded" pour Pennylane entre 1500ms et 2000ms', () => {
    expect(evaluateServiceStatus('pennylane', 1800, false)).toBe('degraded')
  })

  it('retourne "error" pour Pennylane >= 2000ms', () => {
    expect(evaluateServiceStatus('pennylane', 2500, false)).toBe('error')
  })

  it('retourne "degraded" pour service inconnu avec latence > 2000ms', () => {
    expect(evaluateServiceStatus('unknown_service', 2500, false)).toBe('degraded')
  })
})

describe('determineGlobalStatus', () => {
  it('retourne "ok" si tous les services sont ok', () => {
    const services: Record<string, ServiceCheck> = {
      db: { status: 'ok', latencyMs: 100 },
      storage: { status: 'ok', latencyMs: 200 },
    }
    expect(determineGlobalStatus(services)).toBe('ok')
  })

  it('retourne "degraded" si au moins un service est degraded', () => {
    const services: Record<string, ServiceCheck> = {
      db: { status: 'ok', latencyMs: 100 },
      storage: { status: 'degraded', latencyMs: 800 },
    }
    expect(determineGlobalStatus(services)).toBe('degraded')
  })

  it('retourne "error" si au moins un service est en erreur', () => {
    const services: Record<string, ServiceCheck> = {
      db: { status: 'ok', latencyMs: 100 },
      storage: { status: 'degraded', latencyMs: 800 },
      pennylane: { status: 'error', latencyMs: 3000 },
    }
    expect(determineGlobalStatus(services)).toBe('error')
  })

  it('retourne "error" même si d\'autres services sont ok', () => {
    const services: Record<string, ServiceCheck> = {
      db: { status: 'error', latencyMs: 600 },
      storage: { status: 'ok', latencyMs: 200 },
    }
    expect(determineGlobalStatus(services)).toBe('error')
  })
})

describe('shouldSendAlert', () => {
  const nowMs = Date.now()

  it('retourne true si lastAlertAt est null', () => {
    expect(shouldSendAlert(null, nowMs)).toBe(true)
  })

  it('retourne true si la dernière alerte dépasse le debounce', () => {
    const past = new Date(nowMs - ALERT_DEBOUNCE_MS - 1000).toISOString()
    expect(shouldSendAlert(past, nowMs)).toBe(true)
  })

  it('retourne false si la dernière alerte est dans le debounce (< 15 min)', () => {
    const recent = new Date(nowMs - 5 * 60 * 1000).toISOString()
    expect(shouldSendAlert(recent, nowMs)).toBe(false)
  })

  it('retourne false exactement à la limite du debounce', () => {
    const atLimit = new Date(nowMs - ALERT_DEBOUNCE_MS + 1000).toISOString()
    expect(shouldSendAlert(atLimit, nowMs)).toBe(false)
  })
})

describe('buildHealthCheckResult', () => {
  it('construit un résultat complet avec globalStatus', () => {
    const services: Record<string, ServiceCheck> = {
      db: { status: 'ok', latencyMs: 100 },
      pennylane: { status: 'degraded', latencyMs: 1800 },
    }
    const checkedAt = '2026-03-09T10:00:00Z'
    const result = buildHealthCheckResult(services, checkedAt)

    expect(result.checkedAt).toBe(checkedAt)
    expect(result.services).toEqual(services)
    expect(result.globalStatus).toBe('degraded')
  })

  it('génère un checkedAt valide si non fourni', () => {
    const services: Record<string, ServiceCheck> = {
      db: { status: 'ok', latencyMs: 50 },
    }
    const result = buildHealthCheckResult(services)
    expect(new Date(result.checkedAt).getTime()).not.toBeNaN()
  })
})

describe('getAlertingServices', () => {
  it('retourne les services en erreur ou dégradés', () => {
    const services: Record<string, ServiceCheck> = {
      db: { status: 'ok', latencyMs: 100 },
      storage: { status: 'degraded', latencyMs: 1500 },
      pennylane: { status: 'error', latencyMs: 3000 },
    }
    const alerting = getAlertingServices(services)
    expect(alerting).toContain('storage')
    expect(alerting).toContain('pennylane')
    expect(alerting).not.toContain('db')
  })

  it('retourne un tableau vide si tout est ok', () => {
    const services: Record<string, ServiceCheck> = {
      db: { status: 'ok', latencyMs: 100 },
      storage: { status: 'ok', latencyMs: 200 },
    }
    expect(getAlertingServices(services)).toHaveLength(0)
  })
})
