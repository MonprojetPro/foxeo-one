'use client'

// Story 12.7 — Task 4: Tableau de bord instances One avec monitoring

import { useState } from 'react'
import { Badge } from '@monprojetpro/ui'
import {
  useInstancesMonitoring,
  computeInstanceStats,
  getUsagePercent,
  getMetricLevel,
  THRESHOLDS,
  type MonitoredInstance,
  type AlertLevel,
} from '../hooks/use-instances-monitoring'
import type { UpgradeInstanceModalProps } from './upgrade-instance-modal'

// Lazy import pour éviter un cycle — le composant modal est passé en slot
interface InstancesDashboardProps {
  upgradeModal?: React.ComponentType<UpgradeInstanceModalProps>
}

// ── Badge config par niveau d'alerte ─────────────────────────────────────────

const ALERT_BADGE: Record<AlertLevel, { label: string; variant: 'default' | 'outline' | 'secondary' | 'destructive'; className: string }> = {
  none:     { label: 'OK',        variant: 'default',     className: 'bg-green-900/50 text-green-400 border-green-700/30' },
  info:     { label: 'Info',      variant: 'secondary',   className: 'bg-blue-900/50 text-blue-400 border-blue-700/30' },
  warning:  { label: 'Warning',   variant: 'outline',     className: 'bg-amber-900/50 text-amber-400 border-amber-700/30' },
  critical: { label: 'Critique',  variant: 'destructive', className: 'bg-red-900/50 text-red-400 border-red-700/30' },
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ percent, level }: { percent: number; level: AlertLevel }) {
  const colorClass =
    level === 'critical' ? 'bg-red-500' :
    level === 'warning'  ? 'bg-amber-500' :
    level === 'info'     ? 'bg-blue-500' :
    'bg-green-500'

  return (
    <div className="h-1.5 w-full rounded-full bg-white/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

// ── Panneau de détail instance ────────────────────────────────────────────────

function InstanceDetail({
  instance,
  onUpgrade,
}: {
  instance: MonitoredInstance
  onUpgrade: (id: string) => void
}) {
  const metrics = instance.usageMetrics
  const history = instance.metricsHistory.slice(-30)
  const lastCheck = instance.lastHealthCheck
    ? new Date(instance.lastHealthCheck).toLocaleString('fr-FR')
    : 'Jamais'

  const metricRows: { label: string; value: number; max: number; unit: string; key: 'dbRows' | 'storageUsedMb' | 'bandwidthUsedGb' | 'edgeFunctionCalls' }[] = [
    { label: 'DB Rows', value: metrics.dbRows, max: THRESHOLDS.dbRows.max, unit: '', key: 'dbRows' },
    { label: 'Stockage', value: metrics.storageUsedMb, max: THRESHOLDS.storageUsedMb.max, unit: ' MB', key: 'storageUsedMb' },
    { label: 'Bande passante', value: metrics.bandwidthUsedGb, max: THRESHOLDS.bandwidthUsedGb.max, unit: ' GB', key: 'bandwidthUsedGb' },
    { label: 'Edge Functions', value: metrics.edgeFunctionCalls, max: THRESHOLDS.edgeFunctionCalls.max, unit: '', key: 'edgeFunctionCalls' },
  ]

  return (
    <div className="space-y-4 rounded border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-white">{instance.slug}</h3>
          <p className="text-xs text-gray-400">Dernier check : {lastCheck}</p>
        </div>
        <button
          type="button"
          onClick={() => onUpgrade(instance.id)}
          className="rounded bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500"
          aria-label={`Initier un upgrade pour ${instance.slug}`}
        >
          Initier upgrade
        </button>
      </div>

      {/* Métriques avec barres de progression */}
      <div className="space-y-3">
        {metricRows.map(({ label, value, max, unit, key }) => {
          const pct = getUsagePercent(value, max)
          const level = getMetricLevel(value, key)
          return (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">{label}</span>
                <span className="text-gray-300">
                  {value.toLocaleString('fr-FR')}{unit} / {max.toLocaleString('fr-FR')}{unit}
                  <span className="ml-1 text-gray-500">({pct}%)</span>
                </span>
              </div>
              <ProgressBar percent={pct} level={level} />
            </div>
          )
        })}
      </div>

      {/* Historique 30 jours — résumé textuel (graphique P2) */}
      {history.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-gray-500">Historique ({history.length} snapshots)</p>
          <div className="flex gap-1" aria-label="Historique métriques 30 jours">
            {history.map((snap, idx) => {
              const level = getMetricLevel(snap.dbRows, 'dbRows')
              const colorClass =
                level === 'critical' ? 'bg-red-500' :
                level === 'warning'  ? 'bg-amber-500' :
                level === 'info'     ? 'bg-blue-500' :
                'bg-green-500'
              return (
                <div
                  key={idx}
                  className={`h-4 w-2 rounded-sm opacity-70 ${colorClass}`}
                  title={snap.timestamp ? new Date(snap.timestamp).toLocaleDateString('fr-FR') : ''}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Modules actifs */}
      <div>
        <p className="mb-1 text-xs text-gray-500">Modules ({instance.activeModules.length})</p>
        <div className="flex flex-wrap gap-1">
          {instance.activeModules.map((mod) => (
            <span key={mod} className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-300">
              {mod}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function InstancesDashboard({ upgradeModal: UpgradeModal }: InstancesDashboardProps) {
  const { data: instances, isPending, isError } = useInstancesMonitoring()
  const [filterLevel, setFilterLevel] = useState<AlertLevel | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [upgradeInstanceId, setUpgradeInstanceId] = useState<string | null>(null)

  if (isPending) {
    return (
      <div className="space-y-3" aria-label="Chargement du tableau de bord instances">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded bg-white/5" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded bg-white/5" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded border border-red-500/20 bg-red-950/30 p-4 text-sm text-red-400">
        Erreur lors du chargement du tableau de bord instances
      </div>
    )
  }

  const allInstances = instances ?? []
  const stats = computeInstanceStats(allInstances)

  const filtered = filterLevel === 'all'
    ? allInstances
    : allInstances.filter((i) => i.alertLevel === filterLevel)

  const selectedInstance = selectedId ? allInstances.find((i) => i.id === selectedId) : null
  const upgradeInstance = upgradeInstanceId ? allInstances.find((i) => i.id === upgradeInstanceId) : null

  return (
    <div className="space-y-6">
      {/* Vue d'ensemble */}
      <div className="grid grid-cols-3 gap-4" aria-label="Vue d'ensemble instances">
        <div className="rounded border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-gray-400">Instances actives</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.activeCount}</p>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-gray-400">Alertes en cours</p>
          <p className={`mt-1 text-2xl font-bold ${stats.alertCount > 0 ? 'text-amber-400' : 'text-white'}`}>
            {stats.alertCount}
            {stats.criticalCount > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                {stats.criticalCount}
              </span>
            )}
          </p>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-gray-400">MRR estimé</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.estimatedMrr}€/mois</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2" role="group" aria-label="Filtrer par niveau d'alerte">
        {(['all', 'none', 'info', 'warning', 'critical'] as const).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setFilterLevel(level)}
            className={`rounded border px-3 py-1 text-xs transition-colors ${
              filterLevel === level
                ? 'border-white/30 bg-white/15 text-white'
                : 'border-white/10 text-gray-400 hover:text-white'
            }`}
            aria-pressed={filterLevel === level}
          >
            {level === 'all' ? 'Tous' : ALERT_BADGE[level].label}
            {level !== 'all' && (
              <span className="ml-1.5 text-gray-500">
                ({allInstances.filter((i) => i.alertLevel === level).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste des instances */}
      {filtered.length === 0 ? (
        <div className="rounded border border-white/10 bg-white/5 p-8 text-center text-sm text-gray-500">
          Aucune instance pour ce filtre
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-white/10">
          <table className="w-full text-sm" aria-label="Liste des instances avec monitoring">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs text-gray-400">
                <th className="px-4 py-3 font-medium">Instance</th>
                <th className="px-4 py-3 font-medium">Alerte</th>
                <th className="px-4 py-3 font-medium">DB Rows</th>
                <th className="px-4 py-3 font-medium">Stockage</th>
                <th className="px-4 py-3 font-medium">Bande passante</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((instance) => {
                const badge = ALERT_BADGE[instance.alertLevel]
                const metrics = instance.usageMetrics
                return (
                  <tr key={instance.id} className="text-gray-300 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{instance.slug}</div>
                      <div className="text-xs text-gray-400">{instance.clientName ?? instance.clientId.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant} className={badge.className}>
                        {badge.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 min-w-28">
                      <div className="space-y-1">
                        <span className="text-xs">{metrics.dbRows.toLocaleString('fr-FR')}</span>
                        <ProgressBar
                          percent={getUsagePercent(metrics.dbRows, THRESHOLDS.dbRows.max)}
                          level={getMetricLevel(metrics.dbRows, 'dbRows')}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-28">
                      <div className="space-y-1">
                        <span className="text-xs">{metrics.storageUsedMb.toFixed(1)} MB</span>
                        <ProgressBar
                          percent={getUsagePercent(metrics.storageUsedMb, THRESHOLDS.storageUsedMb.max)}
                          level={getMetricLevel(metrics.storageUsedMb, 'storageUsedMb')}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-28">
                      <div className="space-y-1">
                        <span className="text-xs">{metrics.bandwidthUsedGb.toFixed(2)} GB</span>
                        <ProgressBar
                          percent={getUsagePercent(metrics.bandwidthUsedGb, THRESHOLDS.bandwidthUsedGb.max)}
                          level={getMetricLevel(metrics.bandwidthUsedGb, 'bandwidthUsedGb')}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedId(selectedId === instance.id ? null : instance.id)}
                          className="rounded border border-white/10 px-2 py-1 text-xs text-gray-300 hover:text-white"
                          aria-label={`Voir le détail de ${instance.slug}`}
                          aria-expanded={selectedId === instance.id}
                        >
                          Détail
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpgradeInstanceId(instance.id)}
                          className="rounded border border-orange-500/30 px-2 py-1 text-xs text-orange-400 hover:border-orange-400"
                          aria-label={`Initier un upgrade pour ${instance.slug}`}
                        >
                          Upgrade
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Panneau de détail */}
      {selectedInstance && (
        <InstanceDetail
          instance={selectedInstance}
          onUpgrade={(id) => { setUpgradeInstanceId(id); setSelectedId(null) }}
        />
      )}

      {/* Modale upgrade */}
      {UpgradeModal && upgradeInstance && (
        <UpgradeModal
          instance={upgradeInstance}
          onClose={() => setUpgradeInstanceId(null)}
        />
      )}
    </div>
  )
}
