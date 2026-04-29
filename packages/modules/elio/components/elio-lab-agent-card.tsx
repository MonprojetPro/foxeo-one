'use client'

import { useState } from 'react'
import { Bot, X } from 'lucide-react'
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
  const [showPrompt, setShowPrompt] = useState(false)

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
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
    <>
      <div
        onClick={() => setShowPrompt(true)}
        className={`relative flex cursor-pointer flex-col gap-4 rounded-xl border p-5 transition-colors ${
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

      {/* Modal prompt complet */}
      {showPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowPrompt(false)}
        >
          <div
            className="relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-border/60 bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-muted">
                  <Bot className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{modelLabel} · temp {agent.temperature}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrompt(false)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="overflow-y-auto px-6 py-4">
              {agent.description && (
                <p className="mb-4 text-sm text-muted-foreground">{agent.description}</p>
              )}
              {agent.systemPrompt ? (
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">
                  {agent.systemPrompt}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">Aucun system prompt défini.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
