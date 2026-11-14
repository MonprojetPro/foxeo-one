import { describe, it, expect } from 'vitest'
import {
  evaluateServiceStatus,
  determineGlobalStatus,
  buildHealthCheckResult,
  reconcileIncidents,
  SUSTAINED_ERROR_MS,
  ALERT_COOLDOWN_MS,
  type ServiceCheck,
  type IncidentMap,
  type CooldownMap,
} from './health-check-logic'

describe('evaluateServiceStatus', () => {
  it('retourne "ok" si latence sous le seuil de lenteur', () => {
    expect(evaluateServiceStatus('supabase_db', 200, false)).toBe('ok')
  })

  it('retourne "degraded" si le service repond mais lentement', () => {
    expect(evaluateServiceStatus('supabase_db', 1000, false)).toBe('degraded')
  })

  it('retourne "error" si failed=true indépendamment de la latence', () => {
    expect(evaluateServiceStatus('supabase_db', 50, true)).toBe('error')
  })

  it('retourne "degraded" pour service inconnu avec latence >= 2000ms', () => {
    expect(evaluateServiceStatus('unknown_service', 2500, false)).toBe('degraded')
    expect(evaluateServiceStatus('unknown_service', 1500, false)).toBe('ok')
  })

  it('retourne "ok" pour Resend à sa latence nominale mesurée en prod (1153ms)', () => {
    expect(evaluateServiceStatus('resend', 1153, false)).toBe('ok')
  })

  it('retourne "ok" pour Realtime à sa latence nominale (~2,1 s)', () => {
    expect(evaluateServiceStatus('supabase_realtime', 2100, false)).toBe('ok')
  })

  // T-091 (2026-11-14) — LE verrou. Du 3 au 14 novembre, 24 alertes
  // « supabase_db » sont parties (mail + cloche, y compris la nuit) alors que
  // la base répondait 200 à chaque sonde, en 1,1 à 3 s. Une lenteur n'est PAS
  // une panne : elle ne doit JAMAIS produire « error », seul statut qui alerte.
  it.each([
    ['supabase_db', 3000],
    ['supabase_db', 4999],
    ['supabase_storage', 4000],
    ['supabase_auth', 4000],
    ['supabase_realtime', 4999],
    ['pennylane', 4000],
    ['cal_com', 4999],
    ['vercel_hub', 7999],
    ['vercel_client', 7999],
    ['resend', 7999],
  ])('ne retourne JAMAIS "error" pour %s lent mais qui répond (%i ms)', (service, latency) => {
    expect(evaluateServiceStatus(service, latency, false)).toBe('degraded')
  })

  it("les mesures réelles de l'alerte du 14-11 (06:15-07:10) ne sont pas une panne", () => {
    const mesuresReelles = [1401, 1743, 1431, 2991, 1725, 2608, 1791, 1546, 1546, 2747, 1902]
    for (const ms of mesuresReelles) {
      expect(evaluateServiceStatus('supabase_db', ms, false)).not.toBe('error')
    }
  })
})

describe("T-091 — une base lente ne déclenche jamais d'alerte, même longtemps", () => {
  it('2 heures de sondes lentes (2,5 s) → zéro alerte', () => {
    let incidents: IncidentMap = {}
    let cooldowns: CooldownMap = {}
    const t0 = Date.parse('2026-11-14T04:00:00Z')
    let alerts = 0
    for (let i = 0; i <= 24; i++) {
      const services = {
        supabase_db: { status: evaluateServiceStatus('supabase_db', 2500, false), latencyMs: 2500 },
      }
      const r = reconcileIncidents(services, incidents, t0 + i * 5 * 60 * 1000, cooldowns)
      alerts += r.toAlert.length
      incidents = r.nextIncidents
      cooldowns = r.nextCooldowns
    }
    expect(alerts).toBe(0)
  })

  it('une vraie panne (pas de réponse) pendant 15 min → une alerte', () => {
    let incidents: IncidentMap = {}
    const t0 = Date.parse('2026-11-14T04:00:00Z')
    let alerts = 0
    for (let i = 0; i <= 3; i++) {
      const services = {
        supabase_db: { status: evaluateServiceStatus('supabase_db', 5000, true), latencyMs: 5000 },
      }
      const r = reconcileIncidents(services, incidents, t0 + i * 5 * 60 * 1000, {})
      alerts += r.toAlert.length
      incidents = r.nextIncidents
    }
    expect(alerts).toBe(1)
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

describe('reconcileIncidents — cooldown anti-spam des alertes recurrentes (2026-11-06)', () => {
  const nowMs = Date.parse('2026-07-11T12:00:00Z')
  const err = (latencyMs = 3000): ServiceCheck => ({ status: 'error', latencyMs })
  const ok = (latencyMs = 100): ServiceCheck => ({ status: 'ok', latencyMs })
  const sustainedSince = new Date(nowMs - SUSTAINED_ERROR_MS).toISOString()

  it('1ere alerte jamais vue (pas de cooldown) → alerte et pose le cooldown a occurrenceCount=1', () => {
    const prev: IncidentMap = { resend: { errorSince: sustainedSince, notificationId: null } }
    const { toAlert, nextCooldowns } = reconcileIncidents({ resend: err() }, prev, nowMs, {})
    expect(toAlert).toEqual(['resend'])
    expect(nextCooldowns.resend).toEqual({
      lastAlertedAt: new Date(nowMs).toISOString(),
      occurrenceCount: 1,
    })
  })

  it('panne durable mais le meme service a deja alerte il y a MOINS de 3h → pas de nouvel email', () => {
    const prev: IncidentMap = { resend: { errorSince: sustainedSince, notificationId: null } }
    const cooldowns: CooldownMap = {
      resend: {
        lastAlertedAt: new Date(nowMs - ALERT_COOLDOWN_MS + 60_000).toISOString(), // 1 min avant la fin du cooldown
        occurrenceCount: 1,
      },
    }
    const { toAlert, nextCooldowns } = reconcileIncidents({ resend: err() }, prev, nowMs, cooldowns)
    expect(toAlert).toHaveLength(0)
    // l'occurrence est comptee meme sans email, pour tracer la recurrence
    expect(nextCooldowns.resend.occurrenceCount).toBe(2)
    expect(nextCooldowns.resend.lastAlertedAt).toBe(cooldowns.resend.lastAlertedAt)
  })

  it('panne durable et le cooldown de 3h est ecoule depuis le dernier email → ralerte', () => {
    const prev: IncidentMap = { resend: { errorSince: sustainedSince, notificationId: null } }
    const cooldowns: CooldownMap = {
      resend: {
        lastAlertedAt: new Date(nowMs - ALERT_COOLDOWN_MS - 1000).toISOString(), // juste au-dela
        occurrenceCount: 1,
      },
    }
    const { toAlert, nextCooldowns } = reconcileIncidents({ resend: err() }, prev, nowMs, cooldowns)
    expect(toAlert).toEqual(['resend'])
    expect(nextCooldowns.resend).toEqual({
      lastAlertedAt: new Date(nowMs).toISOString(),
      occurrenceCount: 2,
    })
  })

  it('le cooldown SURVIT a la resolution de l\'incident (couvre l\'episode suivant de la meme panne)', () => {
    const prev: IncidentMap = {
      resend: { errorSince: '2026-07-11T11:00:00Z', notificationId: 'notif-123' },
    }
    const cooldowns: CooldownMap = {
      resend: { lastAlertedAt: '2026-07-11T11:05:00.000Z', occurrenceCount: 1 },
    }
    const { toResolve, nextIncidents, nextCooldowns } = reconcileIncidents(
      { resend: ok() },
      prev,
      nowMs,
      cooldowns
    )
    expect(toResolve).toEqual([{ service: 'resend', notificationId: 'notif-123' }])
    expect(nextIncidents.resend).toBeUndefined() // incident bien clos
    expect(nextCooldowns.resend).toEqual(cooldowns.resend) // cooldown, lui, persiste
  })

  it('sans cooldown prealable, un service sans incident ne cree rien', () => {
    const { nextCooldowns } = reconcileIncidents({ db: ok() }, {}, nowMs, {})
    expect(nextCooldowns).toEqual({})
  })
})
