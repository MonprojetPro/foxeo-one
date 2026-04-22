'use client'

import { formatCostEur } from '../utils/token-cost-calculator'

interface TokenCostCardProps {
  totalCostEur: number
  budgetEur?: number | null
  isLoading?: boolean
  onConfigureBudget?: () => void
}

export function TokenCostCard({ totalCostEur, budgetEur, isLoading, onConfigureBudget }: TokenCostCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-cyan-900/40 bg-black/60 p-5 space-y-3 animate-pulse">
        <div className="h-4 w-24 rounded bg-cyan-900/30" />
        <div className="h-10 w-28 rounded bg-cyan-900/30" />
        <div className="h-3 w-full rounded bg-cyan-900/20" />
      </div>
    )
  }

  const hasBudget = budgetEur != null && budgetEur > 0
  const usagePercent = hasBudget ? Math.min(100, (totalCostEur / budgetEur!) * 100) : 0
  const isWarning = hasBudget && usagePercent >= 80
  const isCritical = hasBudget && usagePercent >= 100

  const barColor = isCritical
    ? 'bg-red-500'
    : isWarning
    ? 'bg-yellow-400'
    : 'bg-cyan-400'

  return (
    <div className="rounded-xl border border-cyan-900/40 bg-black/60 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-lg">💶</span>
          <p className="text-xs text-cyan-400/70 font-medium uppercase tracking-wider">Coût estimé</p>
        </div>
        {isWarning && (
          <span className="text-xs text-yellow-400 font-medium">
            ⚠️ {Math.round(usagePercent)}%
          </span>
        )}
      </div>

      <p className="text-4xl font-bold text-cyan-300 tabular-nums">{formatCostEur(totalCostEur)}</p>

      {hasBudget && (
        <div className="space-y-1">
          <div className="w-full h-1.5 rounded-full bg-cyan-900/30 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCostEur(totalCostEur)} / {formatCostEur(budgetEur!)} budget
          </p>
        </div>
      )}

      {onConfigureBudget && (
        <button
          onClick={onConfigureBudget}
          className="text-xs text-cyan-500 hover:text-cyan-300 underline underline-offset-2 transition-colors"
        >
          {hasBudget ? 'Modifier le budget' : 'Configurer le budget'}
        </button>
      )}
    </div>
  )
}
