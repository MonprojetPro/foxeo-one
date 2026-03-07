'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getClientsWithPennylane } from '../actions/get-clients'
import { QuoteForm } from './quote-form'
import { QuotesList } from './quotes-list'
import type { ClientWithPennylane } from '../types/billing.types'

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'devis' | 'nouveau-devis' | 'factures' | 'abonnements'

const TABS: { id: Tab; label: string }[] = [
  { id: 'devis', label: 'Devis' },
  { id: 'nouveau-devis', label: '+ Nouveau devis' },
  { id: 'factures', label: 'Factures' },
  { id: 'abonnements', label: 'Abonnements' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function BillingDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('devis')

  const { data: clients = [] } = useQuery<ClientWithPennylane[]>({
    queryKey: ['billing', 'clients-with-pennylane'],
    queryFn: async () => {
      const result = await getClientsWithPennylane()
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    staleTime: 5 * 60 * 1_000,
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Facturation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestion des devis, factures et abonnements via Pennylane
        </p>
      </div>

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

        {activeTab === 'factures' && (
          <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
            Gestion des factures — Story 11.5
          </div>
        )}

        {activeTab === 'abonnements' && (
          <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
            Gestion des abonnements — Story 11.4
          </div>
        )}
      </div>
    </div>
  )
}
