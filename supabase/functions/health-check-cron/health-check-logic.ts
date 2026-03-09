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
  supabase_db: { warn: 300, error: 500 },
  supabase_storage: { warn: 1000, error: 2000 },
  supabase_auth: { warn: 500, error: 1000 },
  supabase_realtime: { warn: 500, error: 1000 },
  pennylane: { warn: 1500, error: 2000 },
  cal_com: { warn: 2000, error: 5000 },
  open_vidu: { warn: 2000, error: 5000 },
}

// Debounce : 15 minutes entre alertes par service
export const ALERT_DEBOUNCE_MS = 15 * 60 * 1000

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

/** Vérifie si une alerte peut être envoyée (debounce 15 min) */
export function shouldSendAlert(
  lastAlertAt: string | null,
  nowMs: number = Date.now()
): boolean {
  if (!lastAlertAt) return true
  const lastMs = new Date(lastAlertAt).getTime()
  return nowMs - lastMs >= ALERT_DEBOUNCE_MS
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

/** Retourne les services en erreur/dégradés qui nécessitent une alerte */
export function getAlertingServices(
  services: Record<string, ServiceCheck>
): string[] {
  return Object.entries(services)
    .filter(([, check]) => check.status === 'error' || check.status === 'degraded')
    .map(([name]) => name)
}
