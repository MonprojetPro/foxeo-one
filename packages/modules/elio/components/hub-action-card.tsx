'use client'

/**
 * Cartes d'action Élio Hub (garde-fou — Contrat 4).
 *
 * Rendues dans le fil du chat Hub sous le message assistant qui les a créées :
 * résumé lisible, détail de l'input (repliable), boutons ✅ Valider / ❌ Refuser.
 * L'état se met à jour via TanStack + Realtime (useElioHubActions) + refetch
 * après confirm/reject. Une action auto_executed s'affiche comme déjà exécutée.
 */

import { useState } from 'react'
import { Check, X, Zap, Loader2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { confirmElioHubAction, rejectElioHubAction } from '../actions/elio-hub-agent'
import { useElioHubActions } from '../hooks/use-elio-hub-actions'
import type { ElioHubAction } from '../types/elio-hub-agent.types'

const TOOL_LABELS: Record<string, string> = {
  send_chat_message: 'Message chat',
  send_email_to_client: 'Email client',
  launch_parcours: 'Parcours Lab',
  create_quote_draft: 'Devis',
  add_coaching_credits: 'Crédits coaching',
}

/** Détail input sans les clés internes de résolution. */
function displayInput(input: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith('_resolved_') || key === 'client') continue
    cleaned[key] = value
  }
  return cleaned
}

function HubActionCard({ action }: { action: ElioHubAction }) {
  const queryClient = useQueryClient()
  const [isBusy, setIsBusy] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['elio-hub-actions', action.conversationId] })

  const handleConfirm = async () => {
    if (isBusy) return
    setIsBusy(true)
    setActionError(null)
    const { error } = await confirmElioHubAction(action.id)
    if (error) setActionError(error.message)
    await invalidate()
    setIsBusy(false)
  }

  const handleReject = async () => {
    if (isBusy) return
    setIsBusy(true)
    setActionError(null)
    const { error } = await rejectElioHubAction(action.id)
    if (error) setActionError(error.message)
    await invalidate()
    setIsBusy(false)
  }

  const toolLabel = TOOL_LABELS[action.toolName] ?? action.toolName
  const detail = displayInput(action.toolInput)
  const hasDetail = Object.keys(detail).length > 0
  const clientName = action.toolInput._resolved_client_name

  const borderClass =
    action.status === 'pending'
      ? 'border-yellow-500/40 bg-yellow-500/5'
      : action.status === 'failed'
        ? 'border-red-500/40 bg-red-500/5'
        : action.status === 'rejected'
          ? 'border-border bg-muted/40'
          : 'border-emerald-500/40 bg-emerald-500/5'

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${borderClass}`}
      role="status"
      aria-live="polite"
      data-testid={`hub-action-card-${action.status}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
            {toolLabel}
            {typeof clientName === 'string' && clientName ? ` · ${clientName}` : ''}
          </p>
          <p className="text-foreground">{action.summary}</p>
        </div>
      </div>

      {hasDetail && (
        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={showDetail}
        >
          {showDetail ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Détail
        </button>
      )}
      {showDetail && hasDetail && (
        <pre className="mt-1 max-h-40 overflow-auto rounded bg-card p-2 text-xs text-muted-foreground whitespace-pre-wrap break-words">
          {JSON.stringify(detail, null, 2)}
        </pre>
      )}

      {actionError && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {actionError}
        </p>
      )}

      <div className="mt-2">
        {action.status === 'pending' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              aria-label={`Valider : ${action.summary}`}
            >
              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Valider
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors"
              aria-label={`Refuser : ${action.summary}`}
            >
              <X className="h-3.5 w-3.5" />
              Refuser
            </button>
          </div>
        )}
        {(action.status === 'executed' || action.status === 'confirmed') && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Action exécutée
            {action.executedAt ? ` · ${new Date(action.executedAt).toLocaleString('fr-FR')}` : ''}
          </p>
        )}
        {action.status === 'auto_executed' && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Zap className="h-3.5 w-3.5" /> Exécutée sans vérification, à ta demande
          </p>
        )}
        {action.status === 'rejected' && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Refusée — rien n&apos;a été envoyé
          </p>
        )}
        {action.status === 'failed' && (
          <p className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" /> Échec : {action.error ?? 'erreur inconnue'}
          </p>
        )}
      </div>
    </div>
  )
}

interface HubActionCardsProps {
  conversationId: string | null
  /** Ids des actions à afficher sous CE message (metadata.hubActionIds). */
  actionIds: string[]
}

/**
 * Conteneur : charge les actions de la conversation (TanStack + Realtime) et
 * rend les cartes correspondant aux ids attachés au message.
 */
export function HubActionCards({ conversationId, actionIds }: HubActionCardsProps) {
  const { actions } = useElioHubActions(conversationId)
  const toShow = actions.filter((a) => actionIds.includes(a.id))

  if (toShow.length === 0) return null

  return (
    <div className="mt-2 space-y-2">
      {toShow.map((action) => (
        <HubActionCard key={action.id} action={action} />
      ))}
    </div>
  )
}
