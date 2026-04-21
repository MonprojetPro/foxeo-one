'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Bot, AlertCircle } from 'lucide-react'
import { ElioLabAgentCard } from './elio-lab-agent-card'
import { getElioLabAgents } from '../actions/get-elio-lab-agents'
import { syncElioLabAgents } from '../actions/sync-elio-lab-agents'
import { archiveElioLabAgent } from '../actions/archive-elio-lab-agent'
import { duplicateElioLabAgent } from '../actions/duplicate-elio-lab-agent'
import type { ElioLabAgent } from '../actions/sync-elio-lab-agents'

interface ElioLabCatalogueProps {
  initialAgents: ElioLabAgent[]
}

export function ElioLabCatalogue({ initialAgents }: ElioLabCatalogueProps) {
  const queryClient = useQueryClient()
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const { data: agents = initialAgents, isLoading } = useQuery({
    queryKey: ['elio-lab-agents', showArchived],
    queryFn: async () => {
      const res = await getElioLabAgents({ includeArchived: showArchived })
      if (res.error) throw new Error(res.error.message)
      return res.data ?? []
    },
    initialData: initialAgents,
    staleTime: 30_000,
  })

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await syncElioLabAgents()
      if (res.error) {
        setSyncError(res.error.message)
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['elio-lab-agents'] })
    } catch {
      setSyncError('Erreur lors de la synchronisation')
    } finally {
      setSyncing(false)
    }
  }, [queryClient])

  const handleArchive = useCallback(
    async (agentId: string) => {
      const res = await archiveElioLabAgent(agentId)
      if (res.error) throw new Error(res.error.message)
      await queryClient.invalidateQueries({ queryKey: ['elio-lab-agents'] })
    },
    [queryClient]
  )

  const handleDuplicate = useCallback(
    async (agentId: string) => {
      const res = await duplicateElioLabAgent(agentId)
      if (res.error) throw new Error(res.error.message)
      await queryClient.invalidateQueries({ queryKey: ['elio-lab-agents'] })
    },
    [queryClient]
  )

  // La DB filtre déjà les archivés selon showArchived — pas de double-filtre côté client
  const visibleAgents = agents
  const archivedCount = agents.filter((a) => a.archived).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Catalogue d'agents Élio Lab</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {agents.filter((a) => !a.archived).length} agent{agents.filter((a) => !a.archived).length !== 1 ? 's' : ''} actif{agents.filter((a) => !a.archived).length !== 1 ? 's' : ''}
            {archivedCount > 0 && ` · ${archivedCount} archivé${archivedCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {showArchived ? 'Masquer archivés' : 'Voir archivés'}
            </button>
          )}
          <button
            onClick={handleSync}
            disabled={syncing || isLoading}
            className="flex items-center gap-2 rounded-lg bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisation…' : 'Synchroniser les agents'}
          </button>
        </div>
      </div>

      {/* Erreur sync */}
      {syncError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {syncError}
        </div>
      )}

      {/* Grille agents */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-border/40 bg-card/40" />
          ))}
        </div>
      ) : visibleAgents.length === 0 ? (
        <ElioLabEmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAgents.map((agent) => (
            <ElioLabAgentCard
              key={agent.id}
              agent={agent}
              onArchive={handleArchive}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ElioLabEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/20 px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-muted">
        <Bot className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">Aucun agent Élio Lab</p>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
        Créez votre premier agent avec le <strong>skill-creator</strong> dans Claude Code, puis
        cliquez sur <strong>Synchroniser les agents</strong> pour l'importer ici.
      </p>
      <p className="mt-3 font-mono text-xs text-muted-foreground/60">
        packages/modules/elio/agents/lab/mon-agent.md
      </p>
    </div>
  )
}
