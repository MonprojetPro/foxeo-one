'use client'

import { useState } from 'react'
import { Archive, Copy, Bot } from 'lucide-react'
import type { ElioLabAgent } from '../actions/sync-elio-lab-agents'



interface ElioLabAgentCardProps {
  agent: ElioLabAgent
  onArchive: (agentId: string) => Promise<void>
  onDuplicate: (agentId: string) => Promise<void>
}

const MODEL_LABELS: Record<string, string> = {
  'claude-haiku-4-5-20251001': 'Haiku',
  'claude-sonnet-4-6': 'Sonnet',
  'claude-opus-4-6': 'Opus',
}

export function ElioLabAgentCard({ agent, onArchive, onDuplicate }: ElioLabAgentCardProps) {
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [loadingArchive, setLoadingArchive] = useState(false)
  const [loadingDuplicate, setLoadingDuplicate] = useState(false)
  const [imgError, setImgError] = useState(false)

  async function handleArchive() {
    if (!confirmArchive) {
      setConfirmArchive(true)
      return
    }
    setLoadingArchive(true)
    try {
      await onArchive(agent.id)
    } finally {
      setLoadingArchive(false)
      setConfirmArchive(false)
    }
  }

  async function handleDuplicate() {
    setLoadingDuplicate(true)
    try {
      await onDuplicate(agent.id)
    } finally {
      setLoadingDuplicate(false)
    }
  }

  const modelLabel = MODEL_LABELS[agent.model] ?? agent.model

  return (
    <div
      className={`relative flex flex-col gap-4 rounded-xl border p-5 transition-colors ${
        agent.archived
          ? 'border-border/40 bg-card/40 opacity-60'
          : 'border-border/60 bg-card hover:border-cyan-500/40'
      }`}
    >
      {/* Badge statut */}
      <div className="absolute right-4 top-4">
        {agent.archived ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Archivé
          </span>
        ) : (
          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-400">
            Actif
          </span>
        )}
      </div>

      {/* Header — avatar + nom */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-muted">
          {agent.imagePath && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.imagePath}
              alt={agent.name}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <Bot className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 pr-16">
          <p className="truncate text-sm font-semibold text-foreground">{agent.name}</p>
          <p className="text-xs text-muted-foreground">{modelLabel} · temp {agent.temperature}</p>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {agent.description}
        </p>
      )}

      {/* Aperçu system prompt */}
      {agent.systemPrompt && (
        <div className="rounded-md border border-border/30 bg-muted/30 p-2">
          <p className="line-clamp-2 font-mono text-xs text-muted-foreground">
            {agent.systemPrompt}
          </p>
        </div>
      )}

      {/* Actions */}
      {!agent.archived && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleDuplicate}
            disabled={loadingDuplicate}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" />
            {loadingDuplicate ? 'Copie…' : 'Dupliquer'}
          </button>

          {confirmArchive ? (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-xs text-amber-400">Confirmer ?</span>
              <button
                onClick={handleArchive}
                disabled={loadingArchive}
                className="rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
              >
                {loadingArchive ? '…' : 'Oui'}
              </button>
              <button
                onClick={() => setConfirmArchive(false)}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
              >
                Non
              </button>
            </div>
          ) : (
            <button
              onClick={handleArchive}
              className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Archive className="h-3.5 w-3.5" />
              Archiver
            </button>
          )}
        </div>
      )}
    </div>
  )
}
