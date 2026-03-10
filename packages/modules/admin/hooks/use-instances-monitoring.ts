// Story 12.7 — Task 4: TanStack Query hook for instances monitoring
import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@foxeo/supabase'

export interface UsageMetrics {
  dbRows: number
  storageUsedMb: number
  bandwidthUsedGb: number
  edgeFunctionCalls: number
  timestamp?: string
}

export type AlertLevel = 'none' | 'info' | 'warning' | 'critical'

export interface MonitoredInstance {
  id: string
  clientId: string
  clientName: string | null
  slug: string
  instanceUrl: string
  status: string
  tier: string
  activeModules: string[]
  alertLevel: AlertLevel
  usageMetrics: UsageMetrics
  lastHealthCheck: string | null
  metricsHistory: (UsageMetrics & { timestamp: string })[]
}

// Seuils Free tier (miroir du côté Edge Function)
export const THRESHOLDS = {
  dbRows:            { max: 500_000 },
  storageUsedMb:     { max: 1_024 },
  bandwidthUsedGb:   { max: 2 },
  edgeFunctionCalls: { max: 500_000 },
}

export function getUsagePercent(value: number, max: number): number {
  return Math.min(100, Math.round((value / max) * 100))
}

// Seuils absolus Free tier (même valeurs que instances-monitor-logic.ts)
const ALERT_THRESHOLDS = {
  dbRows:            { info: 300_000, warning: 400_000, critical: 475_000 },
  storageUsedMb:     { info: 600,     warning: 800,     critical: 950 },
  bandwidthUsedGb:   { info: 1.2,     warning: 1.6,     critical: 1.9 },
  edgeFunctionCalls: { info: 300_000, warning: 400_000, critical: 475_000 },
}

/** Calcule le niveau d'alerte pour une métrique (valeur absolue) */
export function getMetricLevel(value: number, metricKey: keyof typeof ALERT_THRESHOLDS): AlertLevel {
  const t = ALERT_THRESHOLDS[metricKey]
  if (value >= t.critical) return 'critical'
  if (value >= t.warning) return 'warning'
  if (value >= t.info) return 'info'
  return 'none'
}

const EMPTY_METRICS: UsageMetrics = {
  dbRows: 0,
  storageUsedMb: 0,
  bandwidthUsedGb: 0,
  edgeFunctionCalls: 0,
}

export function useInstancesMonitoring() {
  return useQuery({
    queryKey: ['admin', 'instances', 'monitoring'],
    queryFn: async (): Promise<MonitoredInstance[]> => {
      const supabase = createBrowserSupabaseClient()

      const { data, error } = await supabase
        .from('client_instances')
        .select(
          'id, client_id, slug, instance_url, status, tier, active_modules, alert_level, usage_metrics, last_health_check, metadata, clients(company)'
        )
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data ?? []).map((row) => {
        const clientRow = Array.isArray(row.clients) ? row.clients[0] : row.clients
        const metadata = (row.metadata as Record<string, unknown> | null) ?? {}
        const metricsHistory =
          (metadata.usage_metrics_history as (UsageMetrics & { timestamp: string })[] | undefined) ?? []

        return {
          id: row.id,
          clientId: row.client_id,
          clientName: (clientRow as { company?: string } | null)?.company ?? null,
          slug: row.slug,
          instanceUrl: row.instance_url,
          status: row.status,
          tier: row.tier,
          activeModules: (row.active_modules as string[]) ?? [],
          alertLevel: ((row.alert_level as AlertLevel | null) ?? 'none') as AlertLevel,
          usageMetrics: (row.usage_metrics as UsageMetrics | null) ?? EMPTY_METRICS,
          lastHealthCheck: row.last_health_check ?? null,
          metricsHistory,
        }
      })
    },
    refetchInterval: 5 * 60 * 1000, // Refresh toutes les 5 minutes
  })
}

// Statistiques globales dérivées
export function computeInstanceStats(instances: MonitoredInstance[]) {
  const active = instances.filter((i) => i.status === 'active')
  const alerts = instances.filter((i) => i.alertLevel !== 'none')
  const critical = instances.filter((i) => i.alertLevel === 'critical')
  const warning = instances.filter((i) => i.alertLevel === 'warning')

  const TIER_MRR: Record<string, number> = { base: 49, essentiel: 99, agentique: 199 }
  const estimatedMrr = active.reduce((sum, i) => sum + (TIER_MRR[i.tier] ?? 0), 0)

  return { activeCount: active.length, alertCount: alerts.length, criticalCount: critical.length, warningCount: warning.length, estimatedMrr }
}
