// health-check-logic.ts — Logique métier testable (Vitest compatible)
// Les fonctions pures sont isolées ici pour ne pas dépendre de Deno/Supabase.

export type ServiceStatus = 'ok' | 'degraded' | 'error'
export type GlobalStatus = 'ok' | 'degraded' | 'error'

export interface ServiceCheck {
  status: ServiceStatus
  latencyMs: number
  error?: string
}

export interface HealthCheckResult {
  checkedAt: string
  services: Record<string, ServiceCheck>
  globalStatus: GlobalStatus
}

// Seuils par service (ms)
export const THRESHOLDS: Record<string, { warn: number; error: number }> = {
  // Recalibré : un aller-retour REST depuis l'Edge Function mesure ~130–400 ms
  // (sauts réseau inclus). Les seuils 300/500 faisaient clignoter la DB en « degraded »
  // sans vraie dégradation. Une vraie lenteur (>1,5 s) reste détectée.
  supabase_db: { warn: 800, error: 1500 },
  supabase_storage: { warn: 1000, error: 2000 },
  supabase_auth: { warn: 500, error: 1000 },
  // Recalibré : l'endpoint de check Realtime (/realtime/v1/channels) répond
  // normalement en ~2 s. Les anciens seuils (500/1000) le faisaient passer en
  // « error » en permanence alors que le Realtime fonctionne. Une vraie panne
  // reste détectée via le timeout (5 s → error).
  supabase_realtime: { warn: 3000, error: 5000 },
  pennylane: { warn: 1500, error: 2000 },
  cal_com: { warn: 2000, error: 5000 },
  // Apps Vercel (Hub + client) : SSR + middleware + cold start possibles → seuils larges.
  vercel_hub: { warn: 3000, error: 8000 },
  vercel_client: { warn: 3000, error: 8000 },
  resend: { warn: 1500, error: 3000 },
}

// Durée minimale d'erreur CONTINUE avant d'alerter (2026-07-11 — anti-fantôme).
// Un service doit être en `error` depuis au moins 15 min (≈ 3 cycles de 5 min)
// pour déclencher une alerte cloche. Filtre les blips transitoires qui se
// soignent seuls. La surveillance externe (Better Stack) prend le relais pour
// l'urgence temps réel.
export const SUSTAINED_ERROR_MS = 15 * 60 * 1000

/** Détermine le statut d'un service en fonction de la latence et des seuils */
export function evaluateServiceStatus(
  service: string,
  latencyMs: number,
  failed: boolean
): ServiceStatus {
  if (failed) return 'error'
  const threshold = THRESHOLDS[service]
  if (!threshold) return latencyMs > 2000 ? 'degraded' : 'ok'
  if (latencyMs >= threshold.error) return 'error'
  if (latencyMs >= threshold.warn) return 'degraded'
  return 'ok'
}

/** Calcule le statut global depuis les statuts individuels */
export function determineGlobalStatus(
  services: Record<string, ServiceCheck>
): GlobalStatus {
  const statuses = Object.values(services).map((s) => s.status)
  if (statuses.some((s) => s === 'error')) return 'error'
  if (statuses.some((s) => s === 'degraded')) return 'degraded'
  return 'ok'
}

/** Construit le résultat complet health check */
export function buildHealthCheckResult(
  services: Record<string, ServiceCheck>,
  checkedAt: string = new Date().toISOString()
): HealthCheckResult {
  return {
    checkedAt,
    services,
    globalStatus: determineGlobalStatus(services),
  }
}

// ── Suivi d'incidents (auto-résolution — 2026-07-11) ──────────────────────────
//
// Le problème résolu : avant, une alerte partait dès qu'un service était `error`
// 2 cycles de suite, MAIS elle restait affichée dans la cloche même après le
// retour à la normale (« le monitoring est vert mais j'ai une alerte fantôme »).
//
// Nouveau modèle : on garde un état d'incident par service.
//  • `errorSince`      = début de la série d'erreurs en cours.
//  • `notificationId`  = id de l'alerte cloche ouverte (null tant que pas alerté).
// Règles :
//  1. On alerte UNE fois quand l'erreur dure ≥ SUSTAINED_ERROR_MS (panne durable).
//  2. Dès que le service repasse ok/degraded, l'alerte ouverte est SUPPRIMÉE
//     (auto-résolution) → la cloche ne montre que des pannes réellement en cours.

export interface Incident {
  /** ISO — début de la série d'erreurs continue en cours */
  errorSince: string
  /** id de la notification cloche ouverte, ou null si pas encore alerté */
  notificationId: string | null
}

export type IncidentMap = Record<string, Incident>

export interface IncidentReconciliation {
  /** Services à alerter maintenant (panne durable, pas encore notifiée) */
  toAlert: string[]
  /** Alertes ouvertes à supprimer (service revenu à la normale) */
  toResolve: { service: string; notificationId: string }[]
  /** État d'incidents à persister pour le prochain cycle */
  nextIncidents: IncidentMap
}

/**
 * Compare l'état courant des services aux incidents connus et décide :
 * qui alerter (panne durable), quelles alertes fermer (service rétabli),
 * et l'état d'incidents à sauvegarder.
 *
 * Note : pour les services `toAlert`, le `notificationId` reste `null` dans
 * `nextIncidents` — l'appelant le renseigne après l'insertion réelle de la notif.
 */
export function reconcileIncidents(
  services: Record<string, ServiceCheck>,
  prevIncidents: IncidentMap = {},
  nowMs: number = Date.now()
): IncidentReconciliation {
  const toAlert: string[] = []
  const toResolve: { service: string; notificationId: string }[] = []
  const nextIncidents: IncidentMap = {}

  for (const [service, check] of Object.entries(services)) {
    const prev = prevIncidents[service]

    if (check.status === 'error') {
      const errorSince = prev?.errorSince ?? new Date(nowMs).toISOString()
      const notificationId = prev?.notificationId ?? null
      const sustainedMs = nowMs - new Date(errorSince).getTime()

      // Alerte seulement si l'erreur dure ET qu'aucune alerte n'est déjà ouverte
      if (!notificationId && sustainedMs >= SUSTAINED_ERROR_MS) {
        toAlert.push(service)
      }
      nextIncidents[service] = { errorSince, notificationId }
    } else {
      // Service revenu ok/degraded : auto-résolution si une alerte était ouverte
      if (prev?.notificationId) {
        toResolve.push({ service, notificationId: prev.notificationId })
      }
      // Incident clos → on ne le persiste pas (absent de nextIncidents)
    }
  }

  return { toAlert, toResolve, nextIncidents }
}
