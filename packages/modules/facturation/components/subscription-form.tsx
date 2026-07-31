'use client'

import { useState } from 'react'
import { showSuccess, showError } from '@monprojetpro/ui'
import { createSubscription } from '../actions/create-subscription'
import {
  PLAN_MONTHLY_PRICE,
  PLAN_COMMERCIAL_NAME,
  type SubscriptionPlan,
  type RecurringPeriod,
  type PaymentMethod,
} from '../config/subscription-plans'
import type { ClientWithPennylane } from '../types/billing.types'

// ── Labels — grille v2 (One 49 € / One+ 99 €) ─────────────────────────────────

const PLAN_DISPLAY: Record<SubscriptionPlan, { label: string; price: string }> = {
  ponctuel: { label: PLAN_COMMERCIAL_NAME.ponctuel, price: 'Variable (devis)' },
  essentiel: { label: PLAN_COMMERCIAL_NAME.essentiel, price: `${PLAN_MONTHLY_PRICE.essentiel} €/mois` },
  agentique: { label: PLAN_COMMERCIAL_NAME.agentique, price: `${PLAN_MONTHLY_PRICE.agentique} €/mois` },
}

const FREQUENCY_LABELS: Record<RecurringPeriod, string> = {
  monthly: 'Mensuelle',
  quarterly: 'Trimestrielle',
  yearly: 'Annuelle',
}

const FREQUENCY_MULTIPLIER: Record<RecurringPeriod, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cb: 'CB (Stripe / Pennylane)',
  virement: 'Virement IBAN',
  sepa: 'Prélèvement SEPA',
}

// ── Props ─────────────────────────────────────────────────────────────────────

type SubscriptionFormProps = {
  clients: ClientWithPennylane[]
  onSuccess?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SubscriptionForm({ clients, onSuccess }: SubscriptionFormProps) {
  const [clientId, setClientId] = useState('')
  const [plan, setPlan] = useState<SubscriptionPlan>('essentiel')
  const [frequency, setFrequency] = useState<RecurringPeriod>('monthly')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cb')
  const [customAmount, setCustomAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calcul total en temps réel — grille v2, une seule ligne (plus d'extras)
  const totalMonthly = PLAN_MONTHLY_PRICE[plan] ?? (Number(customAmount) || 0)
  const totalForPeriod = totalMonthly * FREQUENCY_MULTIPLIER[frequency]

  async function handleSubmit() {
    if (!clientId) {
      showError('Sélectionnez un client')
      return
    }
    if (plan === 'ponctuel' && (!customAmount || Number(customAmount) <= 0)) {
      showError('Saisissez un montant pour le forfait ponctuel')
      return
    }
    if (!startDate) {
      showError('Saisissez une date de début')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createSubscription({
        clientId,
        plan,
        frequency,
        startDate,
        paymentMethod,
        customAmount: plan === 'ponctuel' ? Number(customAmount) : null,
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      const clientName = clients.find((c) => c.id === clientId)?.name ?? 'le client'
      showSuccess(`Abonnement ${PLAN_COMMERCIAL_NAME[plan]} créé pour ${clientName}`)
      // Reset
      setClientId('')
      setPlan('essentiel')
      setFrequency('monthly')
      setStartDate(new Date().toISOString().split('T')[0])
      setPaymentMethod('cb')
      setCustomAmount('')
      onSuccess?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Client */}
      <div className="flex flex-col gap-1">
        <label htmlFor="sub-clientId" className="text-sm font-medium">
          Client
        </label>
        <select
          id="sub-clientId"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          data-testid="client-select"
        >
          <option value="">Sélectionner un client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company ?? c.name} ({c.email})
            </option>
          ))}
        </select>
        {clients.length === 0 && (
          <span className="text-xs text-muted-foreground">
            Aucun client avec un compte Pennylane.
          </span>
        )}
      </div>

      {/* Offre */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Offre</span>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(PLAN_DISPLAY) as SubscriptionPlan[]).map((p) => (
            <button
              key={p}
              type="button"
              data-testid={`plan-${p}`}
              onClick={() => setPlan(p)}
              className={`flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors ${
                plan === p
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              <span className="text-sm font-medium">{PLAN_DISPLAY[p].label}</span>
              <span className="text-xs">{PLAN_DISPLAY[p].price}</span>
            </button>
          ))}
        </div>

        {/* Montant variable pour ponctuel */}
        {plan === 'ponctuel' && (
          <div className="flex flex-col gap-1 mt-1">
            <label htmlFor="custom-amount" className="text-xs text-muted-foreground">
              Montant (€ HT)
            </label>
            <input
              id="custom-amount"
              type="number"
              min="0"
              step="0.01"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Ex: 500"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm w-48"
              data-testid="custom-amount"
            />
          </div>
        )}
      </div>

      {/* Fréquence */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Fréquence de facturation</span>
        <div className="flex gap-2">
          {(Object.keys(FREQUENCY_LABELS) as RecurringPeriod[]).map((f) => (
            <button
              key={f}
              type="button"
              data-testid={`frequency-${f}`}
              onClick={() => setFrequency(f)}
              className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                frequency === f
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              {FREQUENCY_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Date de début */}
      <div className="flex flex-col gap-1">
        <label htmlFor="start-date" className="text-sm font-medium">
          Date de début
        </label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm w-48"
          data-testid="start-date"
        />
      </div>

      {/* Mode de paiement */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Mode de paiement</span>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((pm) => (
            <button
              key={pm}
              type="button"
              data-testid={`payment-${pm}`}
              onClick={() => setPaymentMethod(pm)}
              className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                paymentMethod === pm
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              {PAYMENT_LABELS[pm]}
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span>Total mensuel</span>
          <span className="font-semibold" data-testid="total-monthly">
            {totalMonthly.toFixed(2)} €/mois
          </span>
        </div>
        <div className="flex justify-between font-semibold border-t border-border pt-2">
          <span>
            Total{' '}
            {frequency === 'monthly'
              ? 'mensuel'
              : frequency === 'quarterly'
              ? 'trimestriel'
              : 'annuel'}
          </span>
          <span data-testid="total-period">{totalForPeriod.toFixed(2)} €</span>
        </div>
      </div>

      {/* Action */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleSubmit}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        data-testid="create-subscription-btn"
      >
        {isSubmitting ? 'Création...' : "Créer l'abonnement"}
      </button>
    </div>
  )
}
