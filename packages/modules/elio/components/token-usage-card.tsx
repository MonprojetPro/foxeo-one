'use client'

interface TokenUsageCardProps {
  totalTokens: number
  inputTokens: number
  outputTokens: number
  isLoading?: boolean
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function TokenUsageCard({ totalTokens, inputTokens, outputTokens, isLoading }: TokenUsageCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-cyan-900/40 bg-black/60 p-5 space-y-3 animate-pulse">
        <div className="h-4 w-24 rounded bg-cyan-900/30" />
        <div className="h-10 w-32 rounded bg-cyan-900/30" />
        <div className="h-3 w-full rounded bg-cyan-900/20" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-cyan-900/40 bg-black/60 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-cyan-400 text-lg">⚡</span>
        <p className="text-xs text-cyan-400/70 font-medium uppercase tracking-wider">Tokens ce mois</p>
      </div>

      <p className="text-4xl font-bold text-cyan-300 tabular-nums">{formatTokens(totalTokens)}</p>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>↑ {formatTokens(inputTokens)} in</span>
        <span>↓ {formatTokens(outputTokens)} out</span>
      </div>
    </div>
  )
}
