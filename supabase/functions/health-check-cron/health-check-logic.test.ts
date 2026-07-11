import { describe, it, expect } from 'vitest'
import {
  evaluateServiceStatus,
  determineGlobalStatus,
  buildHealthCheckResult,
  reconcileIncidents,
  SUSTAINED_ERROR_MS,
  type ServiceCheck,
  type IncidentMap,
} from './health-check-logic'

describe('evaluateServiceStatus', () => {
  it('retourne "ok" si latence sous le seuil warn', () => {
    expect(evaluateServiceStatus('supabase_db', 200, false)).toBe('ok')
  })

  it('retourne "degraded" si latence entre warn et error', () => {
    // supabase_db recalibré : warn 800 / error 1500
    expect(evaluateServiceStatus('supabase_db', 1000, false)).toBe('degraded')
  })

  it('retourne "error" si latence >= seuil error', () => {
    expect(evaluateServiceStatus('supabase_db', 1600, false)).toBe('error')
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

describe('reconcileIncidents — panne durable + auto-résolution (2026-07-11)', () => {
  const nowMs = Date.parse('2026-07-11T12:00:00Z')
  const err = (latencyMs = 3000): ServiceCheck => ({ status: 'error', latencyMs })
  const ok = (latencyMs = 100): ServiceCheck => ({ status: 'ok', latencyMs })

  it('n\'alerte PAS au premier cycle d\'erreur (blip) — juste ouvre l\'incident', () => {
    const { toAlert, toResolve, nextIncidents } = reconcileIncidents(
      { resend: err() },
      {},
      nowMs
    )
    expect(toAlert).toHaveLength(0)
    expect(toResolve).toHaveLength(0)
    // incident ouvert, errorSince = maintenant, pas encore notifié
    expect(nextIncidents.resend).toEqual({
      errorSince: new Date(nowMs).toISOString(),
      notificationId: null,
    })
  })

  it('alerte quand l\'erreur dure >= 15 min et n\'est pas déjà notifiée', () => {
    const errorSince = new Date(nowMs - SUSTAINED_ERROR_MS).toISOString()
    const prev: IncidentMap = { resend: { errorSince, notificationId: null } }
    const { toAlert, nextIncidents } = reconcileIncidents({ resend: err() }, prev, nowMs)
    expect(toAlert).toEqual(['resend'])
    // errorSince préservé ; notificationId reste null (renseigné par l'appelant après insert)
    expect(nextIncidents.resend.errorSince).toBe(errorSince)
    expect(nextIncidents.resend.notificationId).toBeNull()
  })

  it('n\'alerte pas si l\'erreur dure mais est déjà notifiée (pas de spam)', () => {
    const errorSince = new Date(nowMs - 2 * SUSTAINED_ERROR_MS).toISOString()
    const prev: IncidentMap = {
      resend: { errorSince, notificationId: 'notif-123' },
    }
    const { toAlert, toResolve, nextIncidents } = reconcileIncidents(
      { resend: err() },
      prev,
      nowMs
    )
    expect(toAlert).toHaveLength(0)
    expect(toResolve).toHaveLength(0)
    // l'incident reste ouvert avec sa notif
    expect(nextIncidents.resend.notificationId).toBe('notif-123')
  })

  it('auto-résout : service rétabli avec une alerte ouverte → à supprimer', () => {
    const prev: IncidentMap = {
      resend: { errorSince: '2026-07-11T11:00:00Z', notificationId: 'notif-123' },
    }
    const { toAlert, toResolve, nextIncidents } = reconcileIncidents(
      { resend: ok() },
      prev,
      nowMs
    )
    expect(toAlert).toHaveLength(0)
    expect(toResolve).toEqual([{ service: 'resend', notificationId: 'notif-123' }])
    // incident clos → absent de l'état persisté
    expect(nextIncidents.resend).toBeUndefined()
  })

  it('service rétabli SANS alerte ouverte (blip jamais notifié) → rien à faire', () => {
    const prev: IncidentMap = {
      resend: { errorSince: '2026-07-11T11:58:00Z', notificationId: null },
    }
    const { toAlert, toResolve, nextIncidents } = reconcileIncidents(
      { resend: ok() },
      prev,
      nowMs
    )
    expect(toAlert).toHaveLength(0)
    expect(toResolve).toHaveLength(0)
    expect(nextIncidents.resend).toBeUndefined()
  })

  it('degraded compte comme rétabli (pas une panne) → auto-résout l\'alerte', () => {
    const prev: IncidentMap = {
      resend: { errorSince: '2026-07-11T11:00:00Z', notificationId: 'notif-123' },
    }
    const { toResolve } = reconcileIncidents(
      { resend: { status: 'degraded', latencyMs: 1800 } },
      prev,
      nowMs
    )
    expect(toResolve).toEqual([{ service: 'resend', notificationId: 'notif-123' }])
  })

  it('gère alerte + résolution simultanées sur des services différents', () => {
    const prev: IncidentMap = {
      db: { errorSince: new Date(nowMs - SUSTAINED_ERROR_MS).toISOString(), notificationId: null },
      resend: { errorSince: '2026-07-11T11:00:00Z', notificationId: 'notif-999' },
    }
    const { toAlert, toResolve } = reconcileIncidents(
      { db: err(2000), resend: ok() },
      prev,
      nowMs
    )
    expect(toAlert).toEqual(['db'])
    expect(toResolve).toEqual([{ service: 'resend', notificationId: 'notif-999' }])
  })

  it('tout ok sans incident préalable → aucune action', () => {
    const { toAlert, toResolve, nextIncidents } = reconcileIncidents(
      { db: ok(), storage: ok() },
      {},
      nowMs
    )
    expect(toAlert).toHaveLength(0)
    expect(toResolve).toHaveLength(0)
    expect(nextIncidents).toEqual({})
  })
})
