// instances-monitor-logic.ts — Logique métier testable (Vitest compatible)
// Les fonctions pures sont isolées ici pour ne pas dépendre de Deno/Supabase.

export interface UsageMetrics {
  dbRows: number
  storageUsedMb: number
  bandwidthUsedGb: number
  edgeFunctionCalls: number
}

// Seuils Free tier Supabase
export const THRESHOLDS = {
  dbRows:            { info: 300_000, warning: 400_000, critical: 475_000, max: 500_000 },
  storageUsedMb:     { info: 600,     warning: 800,     critical: 950,     max: 1_024 },
  bandwidthUsedGb:   { info: 1.2,     warning: 1.6,     critical: 1.9,     max: 2 },
  edgeFunctionCalls: { info: 300_000, warning: 400_000, critical: 475_000, max: 500_000 },
}

export type AlertLevel = 'none' | 'info' | 'warning' | 'critical'

const LEVEL_ORDER: Record<AlertLevel, number> = { none: 0, info: 1, warning: 2, critical: 3 }

/** Calcule le niveau d'alerte pour une métrique donnée */
export function computeMetricLevel(value: number, key: keyof typeof THRESHOLDS): AlertLevel {
  const t = THRESHOLDS[key]
  if (value >= t.critical) return 'critical'
  if (value >= t.warning) return 'warning'
  if (value >= t.info) return 'info'
  return 'none'
}

/** Calcule le niveau d'alerte global (le plus élevé) à partir des métriques */
export function computeAlertLevel(metrics: UsageMetrics): AlertLevel {
  const levels: AlertLevel[] = [
    computeMetricLevel(metrics.dbRows, 'dbRows'),
    computeMetricLevel(metrics.storageUsedMb, 'storageUsedMb'),
    computeMetricLevel(metrics.bandwidthUsedGb, 'bandwidthUsedGb'),
    computeMetricLevel(metrics.edgeFunctionCalls, 'edgeFunctionCalls'),
  ]
  if (levels.includes('critical')) return 'critical'
  if (levels.includes('warning')) return 'warning'
  if (levels.includes('info')) return 'info'
  return 'none'
}

/** Vérifie si le niveau monte (escalade = notification requise) */
export function isLevelEscalation(previous: AlertLevel, current: AlertLevel): boolean {
  return LEVEL_ORDER[current] > LEVEL_ORDER[previous]
}

/** Calcule le pourcentage d'usage par rapport au max */
export function getUsagePercent(value: number, max: number): number {
  return Math.min(100, Math.round((value / max) * 100))
}

/** Génère le titre de notification selon le niveau */
export function buildAlertTitle(slug: string, level: AlertLevel): string {
  const labels: Record<AlertLevel, string> = {
    none: 'Normal',
    info: 'Information',
    warning: 'Avertissement',
    critical: 'Critique',
  }
  return `Instance ${slug} — Seuil ${labels[level]} atteint`
}
