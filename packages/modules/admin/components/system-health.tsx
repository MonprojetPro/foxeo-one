'use client'

import { useSystemHealth, type GlobalStatus, type ServiceStatus } from '../hooks/use-system-health'

// ── Helpers visuels ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<GlobalStatus | ServiceStatus, string> = {
  ok: 'text-green-400 bg-green-400/10 border-green-400/30',
  degraded: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  error: 'text-red-400 bg-red-400/10 border-red-400/30',
}

const STATUS_DOT: Record<GlobalStatus | ServiceStatus, string> = {
  ok: 'bg-green-400',
  degraded: 'bg-yellow-400',
  error: 'bg-red-400',
}

const STATUS_LABEL: Record<GlobalStatus | ServiceStatus, string> = {
  ok: 'OK',
  degraded: 'Dégradé',
  error: 'Erreur',
}

const SERVICE_DISPLAY: Record<string, string> = {
  supabase_db: 'Supabase DB',
  supabase_storage: 'Supabase Storage',
  supabase_auth: 'Supabase Auth',
  supabase_realtime: 'Supabase Realtime',
  pennylane: 'Pennylane API',
  cal_com: 'Cal.com',
  open_vidu: 'OpenVidu',
}

function formatLatency(ms: number): string {
  if (ms === 0) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatCheckedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ── Composant principal ────────────────────────────────────────────────────────

export function SystemHealth() {
  const { data, isPending, isError, triggerRefresh, refreshing } = useSystemHealth()

  if (isPending) {
    return (
      <div className="space-y-3" aria-label="Chargement du monitoring">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400">
        Impossible de charger les données de monitoring. Vérifiez votre connexion et réessayez.
      </div>
    )
  }

  const globalStatus = data?.globalStatus ?? 'ok'
  const services = data?.services ?? {}
  const checkedAt = data?.checkedAt

  const serviceEntries = Object.entries(SERVICE_DISPLAY).map(([key, label]) => ({
    key,
    label,
    check: services[key] ?? null,
  }))

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Statut global */}
      <div
        className={`flex items-center justify-between rounded border px-4 py-3 ${STATUS_COLORS[globalStatus]}`}
        aria-label={`Statut global : ${STATUS_LABEL[globalStatus]}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`inline-block w-3 h-3 rounded-full ${STATUS_DOT[globalStatus]}`}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold">Statut global : {STATUS_LABEL[globalStatus]}</p>
            {checkedAt && (
              <p className="text-xs opacity-70">
                Dernière vérification : {formatCheckedAt(checkedAt)}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={triggerRefresh}
          disabled={refreshing}
          className="rounded px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
          aria-label="Rafraîchir les checks de santé"
        >
          {refreshing ? 'Vérification...' : 'Rafraîchir'}
        </button>
      </div>

      {/* Tableau des services */}
      <div className="rounded border border-white/10 overflow-hidden">
        <table className="w-full text-sm" aria-label="État des services">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400">Service</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400">Statut</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400">Latence</th>
            </tr>
          </thead>
          <tbody>
            {serviceEntries.map(({ key, label, check }) => {
              const status: ServiceStatus = check?.status ?? 'ok'
              const skipped = check?.error?.includes('skipped')

              return (
                <tr
                  key={key}
                  className="border-b border-white/5 last:border-0 hover:bg-white/5"
                >
                  <td className="px-4 py-2.5 text-gray-300">{label}</td>
                  <td className="px-4 py-2.5">
                    {check ? (
                      skipped ? (
                        <span className="text-xs text-gray-500">Non configuré</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium`}
                          aria-label={`${label} : ${STATUS_LABEL[status]}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`}
                            aria-hidden="true"
                          />
                          <span className={status === 'ok' ? 'text-green-400' : status === 'degraded' ? 'text-yellow-400' : 'text-red-400'}>
                            {STATUS_LABEL[status]}
                          </span>
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 tabular-nums">
                    {check && !skipped ? formatLatency(check.latencyMs) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Légende */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" aria-hidden="true" /> OK</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" aria-hidden="true" /> Dégradé</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" aria-hidden="true" /> Erreur</span>
      </div>
    </div>
  )
}
