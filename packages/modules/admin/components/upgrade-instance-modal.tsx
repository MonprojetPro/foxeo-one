'use client'

// Story 12.7 — Task 5: Modale upgrade instance One

import { useState, useTransition } from 'react'
import type { MonitoredInstance } from '../hooks/use-instances-monitoring'
import { upgradeInstance, type UpgradePlan } from '../actions/upgrade-instance'
import { showSuccess, showError } from '@foxeo/ui'

export interface UpgradeInstanceModalProps {
  instance: MonitoredInstance
  onClose: () => void
  /** Slot optionnel pour ouvrir le chat pré-rempli */
  onContactClient?: (instanceId: string, message: string) => void
}

interface PlanOption {
  id: UpgradePlan
  label: string
  description: string
  monthlyCost: number
  recommended: boolean
}

const PLANS: PlanOption[] = [
  {
    id: 'supabase_pro',
    label: 'Supabase Pro',
    description: '8 Go stockage, 100 Go bande passante, support prioritaire',
    monthlyCost: 25,
    recommended: false,
  },
  {
    id: 'vercel_pro',
    label: 'Vercel Pro',
    description: 'Bandwidth illimité, Edge Functions illimitées, support Pro',
    monthlyCost: 20,
    recommended: false,
  },
  {
    id: 'both',
    label: 'Supabase Pro + Vercel Pro',
    description: 'Upgrade complet des deux couches — recommandé pour une croissance durable',
    monthlyCost: 45,
    recommended: true,
  },
]

function getRecommendedPlan(instance: MonitoredInstance): UpgradePlan {
  const metrics = instance.usageMetrics
  const dbPct = (metrics.dbRows / 500_000) * 100
  const storagePct = (metrics.storageUsedMb / 1_024) * 100
  const bwPct = (metrics.bandwidthUsedGb / 2) * 100
  const edgePct = (metrics.edgeFunctionCalls / 500_000) * 100

  const supabaseMax = Math.max(dbPct, storagePct)
  const vercelMax = Math.max(bwPct, edgePct)

  if (supabaseMax > 50 && vercelMax > 50) return 'both'
  if (supabaseMax > vercelMax) return 'supabase_pro'
  if (vercelMax > supabaseMax) return 'vercel_pro'
  return 'both'
}

const CONTACT_MESSAGE_TEMPLATE = (slug: string, plan: string) =>
  `Bonjour,\n\nJe vous contacte concernant votre instance Foxeo One (${slug}).\n` +
  `Vos ressources approchent des limites du plan actuel. Je vous recommande de passer au plan ${plan} ` +
  `pour garantir la continuité de service.\n\nPouvez-vous me confirmer si vous souhaitez procéder à cet upgrade ?\n\nCordialement, MiKL`

export function UpgradeInstanceModal({ instance, onClose, onContactClient }: UpgradeInstanceModalProps) {
  const recommended = getRecommendedPlan(instance)
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlan>(recommended)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await upgradeInstance({ instanceId: instance.id, plan: selectedPlan })
      if (result.error) {
        showError(result.error.message)
      } else {
        showSuccess('Demande d\'upgrade enregistrée. L\'upgrade sera effectué manuellement.')
        onClose()
      }
    })
  }

  function handleContactClient() {
    const plan = PLANS.find((p) => p.id === selectedPlan)
    const message = CONTACT_MESSAGE_TEMPLATE(instance.slug, plan?.label ?? selectedPlan)
    if (onContactClient) {
      onContactClient(instance.id, message)
    }
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Initier un upgrade pour ${instance.slug}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded border border-white/10 bg-gray-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Initier un upgrade</h2>
            <p className="mt-0.5 text-sm text-gray-400">Instance : <span className="text-orange-400">{instance.slug}</span></p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Options de plan */}
        <div className="space-y-3" role="radiogroup" aria-label="Choisir un plan d'upgrade">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id
            const isRecommended = plan.id === recommended
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full rounded border p-4 text-left transition-colors ${
                  isSelected
                    ? 'border-orange-500/50 bg-orange-950/30'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isSelected ? 'text-orange-400' : 'text-white'}`}>
                      {plan.label}
                    </span>
                    {isRecommended && (
                      <span className="rounded bg-orange-800/50 px-1.5 py-0.5 text-xs text-orange-300">
                        Recommandé
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white">+{plan.monthlyCost}$/mois</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">{plan.description}</p>
              </button>
            )
          })}
        </div>

        {/* Coût estimé */}
        <div className="mt-4 rounded border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-gray-400">
            Coût additionnel estimé :{' '}
            <span className="font-semibold text-white">
              +{PLANS.find((p) => p.id === selectedPlan)?.monthlyCost ?? 0}$/mois
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
          >
            {isPending ? 'Enregistrement...' : 'Confirmer upgrade'}
          </button>
          <button
            type="button"
            onClick={handleContactClient}
            className="flex-1 rounded border border-white/10 px-4 py-2 text-sm text-gray-300 hover:text-white"
          >
            Contacter le client
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/10 px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
