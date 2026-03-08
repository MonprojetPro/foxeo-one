'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useActivityLogs, ActivityLogsFilters } from '../hooks/use-activity-logs'

const ACTION_TYPES = [
  'data_export_requested',
  'instance_transfer_initiated',
  'maintenance_toggled',
  'client_suspended',
  'client_reactivated',
  'graduation_triggered',
  'brief_submitted',
  'validation_approved',
  'validation_rejected',
]

const ACTOR_TYPES = ['operator', 'client', 'system']

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso))
}

function getActionBadgeClass(action: string): string {
  if (action.includes('error') || action.includes('fail') || action.includes('rejected')) {
    return 'bg-red-500/20 text-red-300'
  }
  if (action.includes('maintenance') || action.includes('suspended')) {
    return 'bg-yellow-500/20 text-yellow-300'
  }
  if (action.includes('approved') || action.includes('activated') || action.includes('graduation')) {
    return 'bg-green-500/20 text-green-300'
  }
  return 'bg-blue-500/20 text-blue-300'
}

function getActorIcon(actorType: string): string {
  switch (actorType) {
    case 'operator': return '🔧'
    case 'client': return '👤'
    case 'system': return '⚙️'
    default: return '❓'
  }
}

interface ExpandableMetadataProps {
  metadata: Record<string, unknown> | null
}

function ExpandableMetadata({ metadata }: ExpandableMetadataProps) {
  const [expanded, setExpanded] = useState(false)
  if (!metadata || Object.keys(metadata).length === 0) return null
  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-gray-400 hover:text-gray-200 underline"
        type="button"
      >
        {expanded ? 'Masquer détails' : 'Voir détails'}
      </button>
      {expanded && (
        <pre className="mt-1 text-xs bg-black/30 rounded p-2 overflow-auto max-h-32 text-gray-300">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}
    </div>
  )
}

export function ActivityLogs() {
  const [filters, setFilters] = useState<ActivityLogsFilters>({ page: 0 })
  const [searchInput, setSearchInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const { data, isPending, isError } = useActivityLogs(filters)

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const currentPage = filters.page ?? 0
  const totalPages = Math.ceil(total / 50)

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: value || undefined, page: 0 }))
    }, 300)
  }, [])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <select
          className="rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200"
          value={filters.clientId ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, clientId: e.target.value || undefined, page: 0 }))}
          aria-label="Filtrer par client"
        >
          <option value="">Tous les clients</option>
        </select>

        <select
          className="rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200"
          value={filters.actionType ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, actionType: e.target.value || undefined, page: 0 }))}
          aria-label="Filtrer par type d'action"
        >
          <option value="">Tous les types</option>
          {ACTION_TYPES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          className="rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200"
          value={filters.actorType ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, actorType: e.target.value || undefined, page: 0 }))}
          aria-label="Filtrer par acteur"
        >
          <option value="">Tous les acteurs</option>
          {ACTOR_TYPES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            className="flex-1 rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200"
            value={filters.startDate ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value || undefined, page: 0 }))}
            aria-label="Date de début"
          />
          <input
            type="date"
            className="flex-1 rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200"
            value={filters.endDate ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value || undefined, page: 0 }))}
            aria-label="Date de fin"
          />
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Rechercher dans les actions..."
        className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
        value={searchInput}
        onChange={(e) => handleSearchChange(e.target.value)}
        aria-label="Recherche textuelle"
      />

      {/* Logs list */}
      {isPending && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          Erreur lors du chargement des logs.
        </div>
      )}

      {!isPending && !isError && logs.length === 0 && (
        <div className="rounded bg-white/5 px-4 py-8 text-center text-sm text-gray-500">
          Aucun log trouvé.
        </div>
      )}

      {!isPending && logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded bg-white/5 border border-white/10 px-4 py-3 space-y-1"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-lg" aria-hidden="true">{getActorIcon(log.actorType)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getActionBadgeClass(log.action)}`}>
                  {log.action}
                </span>
                {log.entityType && (
                  <span className="text-xs text-gray-400">
                    {log.entityType}: <span className="text-gray-300">{log.entityId}</span>
                  </span>
                )}
                <span className="ml-auto text-xs text-gray-500">{formatDate(log.createdAt)}</span>
              </div>
              <div className="text-xs text-gray-400">
                Acteur: <span className="text-gray-300">{log.actorType}</span>
                {' · '}
                ID: <span className="font-mono text-gray-300">{log.actorId.slice(0, 8)}…</span>
              </div>
              <ExpandableMetadata metadata={log.metadata} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {total} logs · page {currentPage + 1}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) - 1 }))}
              className="rounded px-3 py-1.5 text-sm bg-white/5 border border-white/10 text-gray-200 disabled:opacity-40 hover:bg-white/10"
              aria-label="Page précédente"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) + 1 }))}
              className="rounded px-3 py-1.5 text-sm bg-white/5 border border-white/10 text-gray-200 disabled:opacity-40 hover:bg-white/10"
              aria-label="Page suivante"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
