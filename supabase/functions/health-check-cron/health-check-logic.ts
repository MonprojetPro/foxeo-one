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

// Debounce : 60 minutes entre alertes par service (15 min → 60 min le 2026-07-07,
// la cloche était polluée par des blips de latence transitoires)
export const ALERT_DEBOUNCE_MS = 60 * 60 * 1000

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

/**
 * Retourne les services qui nécessitent une alerte cloche.
 * Règle (2026-07-07 — anti-pollution) : UNIQUEMENT `error`, ET confirmé par le
 * cycle précédent (2 observations consécutives). Un blip isolé ou un simple
 * `degraded` reste visible dans l'onglet Maintenance & Système, sans notification.
 * Une vraie panne alerte donc au plus tard à T+10 min (2 cycles de 5 min).
 */
export function getAlertingServices(
  services: Record<string, ServiceCheck>,
  previousServices?: Record<string, ServiceCheck>
): string[] {
  return Object.entries(services)
    .filter(([name, check]) => {
      if (check.status !== 'error') return false
      return previousServices?.[name]?.status === 'error'
    })
    .map(([name]) => name)
}
