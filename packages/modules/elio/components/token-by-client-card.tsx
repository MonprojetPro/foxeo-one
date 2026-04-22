'use client'

import { formatCostEur } from '../utils/token-cost-calculator'
import type { TokenUsageSummary } from '../actions/get-token-usage-summary'

interface TokenByClientCardProps {
  topClients: TokenUsageSummary['topClients']
  isLoading?: boolean
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function TokenByClientCard({ topClients, isLoading }: TokenByClientCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-cyan-900/40 bg-black/60 p-5 space-y-3 animate-pulse">
        <div className="h-4 w-32 rounded bg-cyan-900/30" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-28 rounded bg-cyan-900/20" />
            <div className="h-4 w-16 rounded bg-cyan-900/20" />
          </div>
        ))}
      </div>
    )
  }

  const maxTokens = Math.max(...topClients.map((c) => c.tokens), 1)

  return (
    <div className="rounded-xl border border-cyan-900/40 bg-black/60 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-cyan-400 text-lg">👥</span>
        <p className="text-xs text-cyan-400/70 font-medium uppercase tracking-wider">Top 5 clients</p>
      </div>

      {topClients.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucune utilisation ce mois</p>
      )}

      <div className="space-y-3">
        {topClients.map((client, idx) => (
          <div key={client.clientId ?? `no-client-${idx}`} className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground tabular-nums w-4">#{idx + 1}</span>
                <span className="text-foreground font-medium truncate max-w-[130px]">{client.clientName}</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-muted-foreground tabular-nums">{formatTokens(client.tokens)}</span>
                <span className="text-cyan-400/60 text-[10px]">{formatCostEur(client.costEur)}</span>
              </div>
            </div>
            <div className="w-full h-1 rounded-full bg-cyan-900/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-600/70 transition-all duration-500"
                style={{ width: `${(client.tokens / maxTokens) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
