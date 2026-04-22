'use client'

import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getTokenUsageSummary,
  getTokenBudgetAlert,
  setTokenBudgetAlert,
  TokenUsageCard,
  TokenCostCard,
  TokenByAgentCard,
  TokenByClientCard,
  TokenTrendChart,
} from '@monprojetpro/module-elio'
import type { TokenUsageSummary } from '@monprojetpro/module-elio'
import { showSuccess, showError } from '@monprojetpro/ui'

interface ElioLabTokenDashboardProps {
  initialSummary: TokenUsageSummary | null
  initialBudget: number | null
}

export function ElioLabTokenDashboard({ initialSummary, initialBudget }: ElioLabTokenDashboardProps) {
  const queryClient = useQueryClient()
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetInput, setBudgetInput] = useState(String(initialBudget ?? ''))
  const [isSavingBudget, setIsSavingBudget] = useState(false)
  const [currentBudget, setCurrentBudget] = useState<number | null>(initialBudget)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['elio-token-usage-summary'],
    queryFn: async () => {
      const result = await getTokenUsageSummary()
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    initialData: initialSummary ?? undefined,
    staleTime: 2 * 60 * 1000,
  })

  const { data: budgetData } = useQuery({
    queryKey: ['elio-token-budget'],
    queryFn: async () => {
      const result = await getTokenBudgetAlert()
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    initialData: initialBudget != null ? { budgetEur: initialBudget } : null,
    staleTime: 5 * 60 * 1000,
  })

  const budget = budgetData?.budgetEur ?? currentBudget
  const summary = summaryData

  const isNearBudget =
    budget != null && summary != null && summary.totalCostEur >= budget * 0.8

  async function handleSaveBudget() {
    const value = parseFloat(budgetInput.replace(',', '.'))
    if (isNaN(value) || value <= 0) {
      showError('Budget invalide. Entrez un montant en euros supérieur à 0.')
      return
    }

    setIsSavingBudget(true)
    try {
      const result = await setTokenBudgetAlert(value)
      if (result.error) {
        showError(result.error.message)
      } else {
        setCurrentBudget(value)
        queryClient.invalidateQueries({ queryKey: ['elio-token-budget'] })
        showSuccess(`Budget défini à ${value} €/mois`)
        setShowBudgetModal(false)
      }
    } finally {
      setIsSavingBudget(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Tokens & Coûts IA</h3>
          <p className="text-xs text-muted-foreground">Consommation clients Lab — mois en cours</p>
        </div>
        <button
          onClick={() => {
            setBudgetInput(String(budget ?? ''))
            setShowBudgetModal(true)
          }}
          className="text-xs px-3 py-1.5 rounded-lg border border-cyan-800/50 text-cyan-400 hover:bg-cyan-900/20 transition-colors"
        >
          Configurer le budget
        </button>
      </div>

      {isNearBudget && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-950/30 p-4 flex items-center gap-3">
          <span className="text-yellow-400 text-xl">⚠️</span>
          <p className="text-sm text-yellow-200">
            <strong>80% de ton budget IA mensuel atteint</strong> (
            {summary!.totalCostEur.toFixed(2)} € / {budget} €)
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TokenUsageCard
          totalTokens={summary?.totalTokens ?? 0}
          inputTokens={summary?.totalInputTokens ?? 0}
          outputTokens={summary?.totalOutputTokens ?? 0}
          isLoading={isLoading}
        />

        <TokenCostCard
          totalCostEur={summary?.totalCostEur ?? 0}
          budgetEur={budget}
          isLoading={isLoading}
          onConfigureBudget={() => {
            setBudgetInput(String(budget ?? ''))
            setShowBudgetModal(true)
          }}
        />

        <TokenTrendChart
          weeklyData={summary?.weeklyData ?? []}
          isLoading={isLoading}
        />

        <TokenByClientCard
          topClients={summary?.topClients ?? []}
          isLoading={isLoading}
        />
      </div>

      <TokenByAgentCard
        byAgent={summary?.byAgent ?? []}
        isLoading={isLoading}
      />

      {showBudgetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowBudgetModal(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowBudgetModal(false) }}
          role="presentation"
        >
          <div
            className="w-full max-w-sm mx-4 rounded-xl border border-cyan-900/40 bg-black/90 p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-modal-title"
          >
            <h3 id="budget-modal-title" className="text-base font-semibold text-foreground">Configurer le budget mensuel</h3>
            <p className="text-xs text-muted-foreground">
              Une alerte s&apos;affiche quand 80% du seuil est atteint.
            </p>

            <div className="space-y-2">
              <label htmlFor="budget-input" className="text-xs text-muted-foreground block">
                Budget mensuel (€)
              </label>
              <input
                id="budget-input"
                ref={inputRef}
                type="number"
                min="1"
                step="1"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget() }}
                placeholder="ex: 50"
                className="w-full rounded-lg border border-cyan-900/40 bg-cyan-950/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveBudget}
                disabled={isSavingBudget}
                className="flex-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                {isSavingBudget ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="flex-1 rounded-lg border border-cyan-900/40 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
