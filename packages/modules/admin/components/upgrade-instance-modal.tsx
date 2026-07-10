'use client'

// Story 12.7 — Task 5: Modale upgrade instance One

import { useState, useTransition } from 'react'
import type { MonitoredInstance } from '../hooks/use-instances-monitoring'
import { upgradeInstance, type UpgradePlan } from '../actions/upgrade-instance'
import { showSuccess, showError } from '@monprojetpro/ui'

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
  `Bonjour,\n\nJe vous contacte concernant votre instance MonprojetPro One (${slug}).\n` +
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Carte modale cockpit */}
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 shadow-2xl">
        {/* En-tête */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Initier un upgrade</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Instance : <span className="text-amber-400">{instance.slug}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Sélection du plan — radio cockpit */}
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
                className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_20px_-8px_rgb(245_158_11/0.3)]'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                      {plan.label}
                    </span>
                    {isRecommended && (
                      <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300 ring-1 ring-amber-500/20">
                        Recommandé
                      </span>
                    )}
                  </div>
                  <span className="tabular-nums text-sm font-semibold text-white">
                    +{plan.monthlyCost}$/mois
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">{plan.description}</p>
              </button>
            )
          })}
        </div>

        {/* Récap coût cockpit */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
          <p className="text-xs text-gray-500">
            Coût additionnel estimé :{' '}
            <span className="tabular-nums font-semibold text-white">
              +{PLANS.find((p) => p.id === selectedPlan)?.monthlyCost ?? 0}$/mois
            </span>
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="mt-6 flex gap-3">
          {/* Confirmer — accent amber */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:border-amber-400/50 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Enregistrement…' : 'Confirmer upgrade'}
          </button>
          {/* Contacter le client */}
          <button
            type="button"
            onClick={handleContactClient}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-gray-300 transition-colors hover:border-white/20 hover:text-white"
          >
            Contacter le client
          </button>
          {/* Annuler */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-gray-500 transition-colors hover:border-white/20 hover:text-gray-300"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
