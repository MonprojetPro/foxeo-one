'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTokenUsageByAgent } from '../actions/get-token-usage-by-agent'
import { formatCostEur } from '../utils/token-cost-calculator'
import type { TokenUsageSummary } from '../actions/get-token-usage-summary'

interface TokenByAgentCardProps {
  byAgent: TokenUsageSummary['byAgent']
  isLoading?: boolean
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function AgentDetail({ agentId }: { agentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['elio-token-agent-detail', agentId],
    queryFn: async () => {
      const result = await getTokenUsageByAgent(agentId)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    staleTime: 2 * 60 * 1000,
  })

  if (isLoading) {
    return <p className="text-xs text-muted-foreground animate-pulse">Chargement...</p>
  }

  if (!data) return null

  return (
    <div className="mt-2 p-3 rounded-lg bg-cyan-950/30 border border-cyan-900/20 space-y-1 text-xs">
      <div className="flex justify-between text-muted-foreground">
        <span>Conversations</span>
        <span className="text-foreground font-medium">{data.conversationCount}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Tokens / conversation</span>
        <span className="text-foreground font-medium">{formatTokens(data.avgTokensPerConversation)}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>Coût total agent</span>
        <span className="text-cyan-300 font-medium">{formatCostEur(data.totalCostEur)}</span>
      </div>
    </div>
  )
}

export function TokenByAgentCard({ byAgent, isLoading }: TokenByAgentCardProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="rounded-xl border border-cyan-900/40 bg-black/60 p-5 space-y-3 animate-pulse">
        <div className="h-4 w-32 rounded bg-cyan-900/30" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-full rounded bg-cyan-900/20" />
        ))}
      </div>
    )
  }

  const maxTokens = Math.max(...byAgent.map((a) => a.tokens), 1)

  return (
    <div className="rounded-xl border border-cyan-900/40 bg-black/60 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-cyan-400 text-lg">🤖</span>
        <p className="text-xs text-cyan-400/70 font-medium uppercase tracking-wider">Par agent</p>
      </div>

      {byAgent.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucune utilisation ce mois</p>
      )}

      <div className="space-y-2">
        {byAgent.map((agent) => (
          <div key={agent.agentId ?? 'no-agent'}>
            <button
              onClick={() =>
                setSelectedAgent(selectedAgent === agent.agentId ? null : (agent.agentId ?? null))
              }
              className="w-full text-left space-y-1 hover:opacity-80 transition-opacity"
            >
              <div className="flex justify-between items-center text-xs">
                <span className="text-foreground font-medium truncate max-w-[60%]">{agent.agentName}</span>
                <span className="text-muted-foreground tabular-nums">{formatTokens(agent.tokens)}</span>
              </div>
              <div className="w-full h-1 rounded-full bg-cyan-900/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                  style={{ width: `${(agent.tokens / maxTokens) * 100}%` }}
                />
              </div>
            </button>

            {selectedAgent === agent.agentId && agent.agentId && (
              <AgentDetail agentId={agent.agentId} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
