'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getClientsWithPennylane } from '../actions/get-clients'
import { useBillingMetrics } from '../hooks/use-billing'
import { triggerBillingSync } from '../actions/trigger-billing-sync'
import {
  RefreshCw,
  Receipt,
  TrendingUp,
  Clock,
  FileText,
  Repeat2,
  FolderArchive,
  Plus,
} from 'lucide-react'

import {
  CockpitHeader,
  PillTabs,
  HeroStatGrid,
  HeroStat,
  HeroStatSkeleton,
} from '@monprojetpro/ui'
import type { PillTab } from '@monprojetpro/ui'

import { QuoteForm } from './quote-form'
import { QuotesList } from './quotes-list'
import { InvoicesList } from './invoices-list'
import { SubscriptionsList } from './subscriptions-list'
import { SubscriptionForm } from './subscription-form'
import { JustificatifsSection } from './justificatifs-section'
import { PendingReminders } from './pending-reminders'
import { AccountantNotifications } from './accountant-notifications'
import { showSuccess, showError } from '@monprojetpro/ui'
import type { ClientWithPennylane } from '../types/billing.types'

// ── Types d'onglets ──────────────────────────────────────────────────────────

type Tab = 'devis' | 'nouveau-devis' | 'factures' | 'abonnements' | 'justificatifs'

const TABS: PillTab<Tab>[] = [
  { key: 'devis',         label: 'Devis',          icon: FileText },
  { key: 'nouveau-devis', label: '+ Nouveau devis', icon: Plus },
  { key: 'factures',      label: 'Factures',        icon: Receipt },
  { key: 'abonnements',   label: 'Abonnements',     icon: Repeat2 },
  { key: 'justificatifs', label: 'Justificatifs',   icon: FolderArchive },
]

// ── Formatage monétaire ──────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

// ── Section métriques financières ────────────────────────────────────────────

function BillingMetricsSection() {
  const { data: metrics, isPending } = useBillingMetrics()

  if (isPending) {
    return (
      <HeroStatGrid>
        <HeroStatSkeleton />
        <HeroStatSkeleton />
        <HeroStatSkeleton />
        <HeroStatSkeleton />
      </HeroStatGrid>
    )
  }

  return (
    <div data-testid="billing-metrics">
      <HeroStatGrid>
        {/* CA mensuel — ton cyan (neutre, chiffre clé) */}
        <div data-testid="metric-monthly-revenue">
          <HeroStat
            icon={TrendingUp}
            label="CA mensuel"
            value={formatCurrency(metrics?.monthlyRevenue ?? 0)}
            tone="cyan"
            sub="mois en cours"
          />
        </div>

        {/* En attente (impayés) — ton red pour alerter, gray si RAS */}
        <div data-testid="metric-pending-amount">
          <HeroStat
            icon={Clock}
            label="En attente"
            value={formatCurrency(metrics?.pendingAmount ?? 0)}
            tone={(metrics?.pendingAmount ?? 0) > 0 ? 'red' : 'gray'}
            sub="factures impayées"
          />
        </div>

        {/* Devis en cours — ton amber (intermédiaire) */}
        <div data-testid="metric-pending-quotes">
          <HeroStat
            icon={FileText}
            label="Devis en cours"
            value={metrics?.pendingQuotesCount ?? 0}
            tone={(metrics?.pendingQuotesCount ?? 0) > 0 ? 'amber' : 'gray'}
            sub="devis en attente"
          />
        </div>

        {/* MRR — ton emerald (revenu récurrent positif) */}
        <div data-testid="metric-mrr">
          <HeroStat
            icon={Repeat2}
            label="MRR"
            value={formatCurrency(metrics?.mrr ?? 0)}
            tone="emerald"
            sub="abonnements actifs"
          />
        </div>
      </HeroStatGrid>
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────

export function BillingDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('devis')
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false)
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

      {/* ── En-tête cockpit ── */}
      <CockpitHeader
        icon={Receipt}
        title="Comptabilité"
        subtitle="Devis, factures et abonnements via Pennylane"
        tone="cyan"
        actions={
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-gray-400 transition-all hover:border-white/20 hover:text-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronisation…' : 'Synchroniser'}
          </button>
        }
      />

      {/* ── Relances impayées en attente (Story 13-8) ── */}
      <PendingReminders />

      {/* ── Notifications comptable (Story 13-9) ── */}
      <AccountantNotifications />

      {/* ── Métriques financières ── */}
      <BillingMetricsSection />

      {/* ── Navigation pills ── */}
      <PillTabs
        tabs={TABS}
        active={activeTab}
        onChange={setActiveTab}
        tone="cyan"
      />

      {/* ── Contenu de l'onglet actif ── */}
      <div>
        {activeTab === 'devis' && <QuotesList clients={clients} />}

        {activeTab === 'nouveau-devis' && (
          <QuoteForm
            clients={clients}
            onSuccess={() => setActiveTab('devis')}
          />
        )}

        {activeTab === 'factures' && <InvoicesList clients={clients} />}

        {activeTab === 'abonnements' && (
          <div className="flex flex-col gap-4">
            {/* Bouton nouvel abonnement */}
            <div className="flex justify-end">
              <button
                type="button"
                data-testid="toggle-subscription-form"
                onClick={() => setShowSubscriptionForm((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                  showSubscriptionForm
                    ? 'border border-white/10 bg-white/[0.02] text-gray-500 hover:border-white/20 hover:text-gray-300'
                    : 'border border-cyan-400/25 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20'
                }`}
              >
                {showSubscriptionForm ? 'Annuler' : '+ Nouvel abonnement'}
              </button>
            </div>

            {/* Formulaire abonnement — panneau cockpit */}
            {showSubscriptionForm && (
              <div
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                data-testid="subscription-form-panel"
              >
                <h2 className="text-base font-semibold text-white mb-4">Nouvel abonnement</h2>
                <SubscriptionForm
                  clients={clients}
                  onSuccess={() => {
                    setShowSubscriptionForm(false)
                    // createSubscription déclenche déjà triggerBillingSync côté serveur ;
                    // on invalide le cache pour rafraîchir la liste + les métriques (MRR).
                    void queryClient.invalidateQueries({ queryKey: ['billing'] })
                  }}
                />
              </div>
            )}

            <SubscriptionsList />
          </div>
        )}

        {activeTab === 'justificatifs' && <JustificatifsSection />}
      </div>
    </div>
  )
}
