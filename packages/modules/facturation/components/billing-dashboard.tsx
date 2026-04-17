'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getClientsWithPennylane } from '../actions/get-clients'
import { useBillingMetrics } from '../hooks/use-billing'
import { triggerBillingSync } from '../actions/trigger-billing-sync'
import { RefreshCw } from 'lucide-react'

import { QuoteForm } from './quote-form'
import { QuotesList } from './quotes-list'
import { InvoicesList } from './invoices-list'
import { SubscriptionsList } from './subscriptions-list'
import { JustificatifsSection } from './justificatifs-section'
import { showSuccess, showError } from '@monprojetpro/ui'
import type { ClientWithPennylane } from '../types/billing.types'

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'devis' | 'nouveau-devis' | 'factures' | 'abonnements' | 'justificatifs'

const TABS: { id: Tab; label: string }[] = [
  { id: 'devis', label: 'Devis' },
  { id: 'nouveau-devis', label: '+ Nouveau devis' },
  { id: 'factures', label: 'Factures' },
  { id: 'abonnements', label: 'Abonnements' },
  { id: 'justificatifs', label: 'Justificatifs' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

// ── Metrics Section (AC #4) ───────────────────────────────────────────────────

function BillingMetricsSection() {
  const { data: metrics, isPending } = useBillingMetrics()

  const cards: { label: string; testId: string; value: string; sub?: string }[] = [
    {
      label: 'CA mensuel',
      testId: 'metric-monthly-revenue',
      value: isPending ? '…' : formatCurrency(metrics?.monthlyRevenue ?? 0),
      sub: 'mois en cours',
    },
    {
      label: 'En attente',
      testId: 'metric-pending-amount',
      value: isPending ? '…' : formatCurrency(metrics?.pendingAmount ?? 0),
      sub: 'factures impayées',
    },
    {
      label: 'Devis en cours',
      testId: 'metric-pending-quotes',
      value: isPending ? '…' : String(metrics?.pendingQuotesCount ?? 0),
      sub: 'devis en attente',
    },
    {
      label: 'MRR',
      testId: 'metric-mrr',
      value: isPending ? '…' : formatCurrency(metrics?.mrr ?? 0),
      sub: 'abonnements actifs',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-4" data-testid="billing-metrics">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-border p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{card.label}</span>
          <span
            className="text-xl font-semibold tabular-nums"
            data-testid={card.testId}
          >
            {card.value}
          </span>
          {card.sub && <span className="text-xs text-muted-foreground">{card.sub}</span>}
        </div>
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BillingDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('devis')
  const [isSyncing, startSync] = useTransition()
  const queryClient = useQueryClient()

  const { data: clients = [] } = useQuery<ClientWithPennylane[]>({
    queryKey: ['billing', 'clients-with-pennylane'],
    queryFn: async () => {
      const result = await getClientsWithPennylane()
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    staleTime: 5 * 60 * 1_000,
  })

  function handleSync() {
    startSync(async () => {
      const result = await triggerBillingSync()
      if (result.error) {
        showError(`Sync échouée : ${result.error.message}`)
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['billing'] })
      showSuccess('Données synchronisées depuis Pennylane')
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Comptabilité</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des devis, factures et abonnements via Pennylane
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Synchronisation…' : 'Synchroniser'}
        </button>
      </div>

      {/* Métriques financières (AC #4) */}
      <BillingMetricsSection />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'devis' && <QuotesList clients={clients} />}

        {activeTab === 'nouveau-devis' && (
          <QuoteForm
            clients={clients}
            onSuccess={() => setActiveTab('devis')}
          />
        )}

        {activeTab === 'factures' && <InvoicesList />}

        {activeTab === 'abonnements' && <SubscriptionsList />}

        {activeTab === 'justificatifs' && <JustificatifsSection />}
      </div>
    </div>
  )
}
