'use client'

import { useState } from 'react'
import { Bot } from 'lucide-react'
import type { ElioLabAgent } from '../actions/sync-elio-lab-agents'

interface ElioLabAgentCardProps {
  agent: ElioLabAgent
  onDeactivate: (agentId: string) => Promise<void>
  onActivate: (agentId: string) => Promise<void>
}

const MODEL_LABELS: Record<string, string> = {
  'claude-haiku-4-5-20251001': 'Haiku',
  'claude-sonnet-4-6': 'Sonnet',
  'claude-opus-4-6': 'Opus',
}

export function ElioLabAgentCard({ agent, onDeactivate, onActivate }: ElioLabAgentCardProps) {
  const [loading, setLoading] = useState(false)
  const [imgError, setImgError] = useState(false)

  async function handleToggle() {
    setLoading(true)
    try {
      if (agent.archived) {
        await onActivate(agent.id)
      } else {
        await onDeactivate(agent.id)
      }
    } finally {
      setLoading(false)
    }
  }

  const modelLabel = MODEL_LABELS[agent.model] ?? agent.model

  return (
    <div
      className={`relative flex flex-col gap-4 rounded-xl border p-5 transition-colors ${
        agent.archived
          ? 'border-border/30 bg-card/20 opacity-50'
          : 'border-border/60 bg-card hover:border-cyan-500/40'
      }`}
    >
      {/* Badge statut */}
      <div className="absolute right-4 top-4">
        {agent.archived ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Inactif
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
      <div className="flex items-center justify-end pt-1">
        <button
          onClick={handleToggle}
          disabled={loading}
          className="rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {loading ? '…' : agent.archived ? 'Activer' : 'Désactiver'}
        </button>
      </div>
    </div>
  )
}
