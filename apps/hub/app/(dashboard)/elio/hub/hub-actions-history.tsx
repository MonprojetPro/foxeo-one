'use client'

/**
 * Section Historique des actions Élio Hub — toutes conversations confondues.
 *
 * TanStack Query (listElioHubActions) + Realtime sur elio_hub_actions (table
 * dans la publication — migration 20260706123000) : le journal se met à jour
 * sans reload, y compris quand une décision vient du chat. Les pending offrent
 * Valider / Refuser (mêmes Server Actions que les cartes du chat).
 */

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X, Zap, Loader2, AlertTriangle, Clock } from 'lucide-react'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import {
  listElioHubActions,
  confirmElioHubAction,
  rejectElioHubAction,
} from '@monprojetpro/module-elio'
import type { ElioHubAction, ElioHubActionStatus } from '@monprojetpro/module-elio'
import { showError } from '@monprojetpro/ui'

const QUERY_KEY = ['elio-hub-actions-history']

const TOOL_LABELS: Record<string, string> = {
  send_chat_message: 'Message chat',
  send_email_to_client: 'Email client',
  launch_parcours: 'Parcours Lab',
  create_quote_draft: 'Devis',
  add_coaching_credits: 'Crédits coaching',
}

type FilterKey = 'all' | 'pending' | 'executed' | 'rejected' | 'failed'

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'executed', label: 'Exécutées' },
  { key: 'rejected', label: 'Refusées' },
  { key: 'failed', label: 'Échecs' },
]

function matchesFilter(status: ElioHubActionStatus, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'pending':
      return status === 'pending' || status === 'confirmed'
    case 'executed':
      return status === 'executed' || status === 'auto_executed'
    case 'rejected':
      return status === 'rejected'
    case 'failed':
      return status === 'failed'
  }
}

/** Badge de statut — style cockpit (teintes cohérentes avec le reste du Hub). */
function StatusBadge({ status }: { status: ElioHubActionStatus }) {
  const config: Record<ElioHubActionStatus, { label: string; className: string; Icon: typeof Check }> = {
    pending: { label: 'En attente', className: 'bg-amber-400/10 text-amber-300 border-amber-400/30', Icon: Clock },
    confirmed: { label: 'Validée…', className: 'bg-amber-400/10 text-amber-300 border-amber-400/30', Icon: Clock },
    executed: { label: 'Exécutée', className: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30', Icon: Check },
    auto_executed: { label: 'Exécutée (sans vérif)', className: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30', Icon: Zap },
    rejected: { label: 'Refusée', className: 'bg-white/[0.04] text-gray-500 border-white/10', Icon: X },
    failed: { label: 'Échec', className: 'bg-red-500/10 text-red-400 border-red-500/30', Icon: AlertTriangle },
  }
  const { label, className, Icon } = config[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

interface HubActionsHistoryProps {
  initialActions: ElioHubAction[]
}

export function HubActionsHistory({ initialActions }: HubActionsHistoryProps) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  const { data: actions } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await listElioHubActions()
      if (error) throw new Error(error.message)
      return data ?? []
    },
    initialData: initialActions,
    staleTime: 30 * 1000,
  })

  // Realtime : toute mutation de elio_hub_actions rafraîchit le journal.
  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel('elio-hub-actions:history')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'elio_hub_actions' },
        () => {
          void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient])

  async function handleDecision(actionId: string, decision: 'confirm' | 'reject') {
    if (busyId) return
    setBusyId(actionId)
    try {
      const { error } =
        decision === 'confirm'
          ? await confirmElioHubAction(actionId)
          : await rejectElioHubAction(actionId)
      if (error) showError(error.message)
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    } finally {
      setBusyId(null)
    }
  }

  const filtered = (actions ?? []).filter((a) => matchesFilter(a.status, filter))

  return (
    <section className="space-y-4" aria-labelledby="hub-actions-history-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Titre style cockpit */}
        <div>
          <h3
            id="hub-actions-history-title"
            className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500"
          >
            Historique des actions Élio
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Tout ce qu&apos;Élio a proposé ou exécuté (100 dernières). Les propositions en attente se valident aussi ici.
          </p>
        </div>

        {/* Pills de filtre — style cockpit */}
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrer par statut">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === key
                  ? 'border-cyan-500/60 text-cyan-300 bg-cyan-400/10'
                  : 'border-white/10 text-gray-500 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* État vide cockpit */}
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-gray-500 italic text-center">
          {filter === 'all'
            ? "Aucune action Élio pour l'instant — demande-lui quelque chose dans le chat."
            : 'Aucune action avec ce statut.'}
        </p>
      ) : (
        /* Table d’historique — lignes cockpit */
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <table className="w-full text-sm" role="list">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Résumé</th>
                <th className="px-4 py-2.5 font-medium text-right">Date</th>
                <th className="px-4 py-2.5 font-medium text-right">Décision</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((action) => {
                const isBusy = busyId === action.id
                return (
                  <tr
                    key={action.id}
                    className="border-b border-white/5 last:border-0 transition-colors hover:bg-white/[0.03]"
                    data-testid={`hub-history-${action.status}`}
                  >
                    {/* Outil + badge statut */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                          {TOOL_LABELS[action.toolName] ?? action.toolName}
                        </span>
                        <StatusBadge status={action.status} />
                      </div>
                    </td>

                    {/* Résumé */}
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-white truncate" title={action.summary}>
                        {action.summary}
                      </p>
                      {action.status === 'failed' && action.error && (
                        <p className="mt-0.5 text-xs text-red-400 flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {action.error}
                        </p>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-right text-xs text-gray-500 tabular-nums whitespace-nowrap">
                      {new Date(action.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Boutons décision (pending seulement) */}
                    <td className="px-4 py-3 text-right">
                      {action.status === 'pending' && (
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleDecision(action.id, 'confirm')}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-colors"
                            aria-label={`Valider : ${action.summary}`}
                          >
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Valider
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDecision(action.id, 'reject')}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50 transition-colors"
                            aria-label={`Refuser : ${action.summary}`}
                          >
                            <X className="h-3.5 w-3.5" />
                            Refuser
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
