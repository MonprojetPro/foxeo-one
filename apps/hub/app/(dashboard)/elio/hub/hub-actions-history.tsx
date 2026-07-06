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

function StatusBadge({ status }: { status: ElioHubActionStatus }) {
  const config: Record<ElioHubActionStatus, { label: string; className: string; Icon: typeof Check }> = {
    pending: { label: 'En attente', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40', Icon: Clock },
    confirmed: { label: 'Validée…', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40', Icon: Clock },
    executed: { label: 'Exécutée', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40', Icon: Check },
    auto_executed: { label: 'Exécutée (sans vérif)', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40', Icon: Zap },
    rejected: { label: 'Refusée', className: 'bg-muted text-muted-foreground border-border', Icon: X },
    failed: { label: 'Échec', className: 'bg-red-500/10 text-red-400 border-red-500/40', Icon: AlertTriangle },
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
        <div>
          <h3 id="hub-actions-history-title" className="text-base font-semibold text-foreground">
            Historique des actions Élio
          </h3>
          <p className="text-xs text-muted-foreground">
            Tout ce qu&apos;Élio a proposé ou exécuté (100 dernières). Les propositions en attente se valident aussi ici.
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Filtrer par statut">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === key
                  ? 'border-cyan-500/60 text-cyan-300 bg-cyan-900/30'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-card/50 px-4 py-6 text-sm text-muted-foreground italic text-center">
          {filter === 'all'
            ? 'Aucune action Élio pour l’instant — demande-lui quelque chose dans le chat.'
            : 'Aucune action avec ce statut.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((action) => {
            const isBusy = busyId === action.id
            return (
              <li
                key={action.id}
                className="rounded-xl border border-border bg-card/50 p-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                data-testid={`hub-history-${action.status}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {TOOL_LABELS[action.toolName] ?? action.toolName}
                    </span>
                    <StatusBadge status={action.status} />
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(action.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground truncate" title={action.summary}>
                    {action.summary}
                  </p>
                  {action.status === 'failed' && action.error && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {action.error}
                    </p>
                  )}
                </div>

                {action.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDecision(action.id, 'confirm')}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      aria-label={`Valider : ${action.summary}`}
                    >
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Valider
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision(action.id, 'reject')}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors"
                      aria-label={`Refuser : ${action.summary}`}
                    >
                      <X className="h-3.5 w-3.5" />
                      Refuser
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
