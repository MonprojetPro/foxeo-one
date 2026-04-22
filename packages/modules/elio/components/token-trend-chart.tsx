'use client'

import type { TokenUsageSummary } from '../actions/get-token-usage-summary'

interface TokenTrendChartProps {
  weeklyData: TokenUsageSummary['weeklyData']
  isLoading?: boolean
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart)
  return `${date.getDate()}/${date.getMonth() + 1}`
}

export function TokenTrendChart({ weeklyData, isLoading }: TokenTrendChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-cyan-900/40 bg-black/60 p-5 space-y-3 animate-pulse">
        <div className="h-4 w-32 rounded bg-cyan-900/30" />
        <div className="flex items-end gap-2 h-20">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 rounded-t bg-cyan-900/30" style={{ height: `${i * 20}%` }} />
          ))}
        </div>
      </div>
    )
  }

  const maxTokens = Math.max(...weeklyData.map((w) => w.tokens), 1)

  return (
    <div className="rounded-xl border border-cyan-900/40 bg-black/60 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-cyan-400 text-lg">📈</span>
        <p className="text-xs text-cyan-400/70 font-medium uppercase tracking-wider">Tendance hebdo</p>
      </div>

      {weeklyData.length === 0 ? (
        <p className="text-xs text-muted-foreground">Pas encore de données</p>
      ) : (
        <div className="flex items-end gap-2 h-20" role="img" aria-label="Graphique de tendance hebdomadaire des tokens">
          {weeklyData.map((week) => {
            const heightPercent = (week.tokens / maxTokens) * 100
            return (
              <div key={week.week} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: 64 }}>
                  <div
                    className="w-full rounded-t bg-cyan-500/60 hover:bg-cyan-400/80 transition-colors cursor-default"
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                    title={`${formatTokens(week.tokens)} tokens`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {formatWeekLabel(week.week)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {weeklyData.length > 0 && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Min: {formatTokens(Math.min(...weeklyData.map((w) => w.tokens)))}</span>
          <span>Max: {formatTokens(maxTokens)}</span>
        </div>
      )}
    </div>
  )
}
