'use server'

import { pennylaneClient } from '../config/pennylane'
import { toPennylaneLineItem } from '../utils/billing-mappers'
import { triggerBillingSync } from './trigger-billing-sync'
import { assertOperator } from './assert-operator'
import {
  PLAN_MONTHLY_PRICE,
  PLAN_LABEL,
  PLAN_COMMERCIAL_NAME,
  PLAN_TIER,
  type SubscriptionPlan,
  type RecurringPeriod,
  type PaymentMethod,
} from '../config/subscription-plans'
import type { ActionResponse } from '@monprojetpro/types'
import type { LineItem, PennylaneBillingSubscription } from '../types/billing.types'

// ============================================================
// createSubscription — crée un abonnement récurrent Pennylane
// Grille v2 (Contrat 6) : One 49 € (essentiel), One+ 99 € (agentique).
// Constantes de grille : ../config/subscription-plans.ts
// (fichier 'use server' = exports async uniquement)
// ============================================================

export type CreateSubscriptionInput = {
  clientId: string
  plan: SubscriptionPlan
  frequency: RecurringPeriod
  startDate: string // YYYY-MM-DD
  paymentMethod: PaymentMethod
  customAmount?: number | null // pour plan ponctuel (montant variable)
}

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<ActionResponse<string>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  // Récupérer le client pour obtenir pennylane_customer_id
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, company, email, auth_user_id, pennylane_customer_id')
    .eq('id', input.clientId)
    .single()

  if (clientError || !client) {
    return {
      data: null,
      error: { message: 'Client introuvable', code: 'CLIENT_NOT_FOUND', details: clientError },
    }
  }

  let pennylaneCustomerId = client.pennylane_customer_id as string | null

  // ID corrompu ('undefined', non-numérique) → re-création automatique
  if (pennylaneCustomerId && isNaN(parseInt(pennylaneCustomerId, 10))) {
    await supabase.from('clients').update({ pennylane_customer_id: null }).eq('id', input.clientId)
    pennylaneCustomerId = null
  }

  // Story G — Auto-créer le compte Pennylane si absent
  if (!pennylaneCustomerId) {
    const clientEmail = client.email as string | null
    if (!clientEmail) {
      return {
        data: null,
        error: { message: 'Email client manquant — impossible de créer le compte Pennylane', code: 'MISSING_EMAIL' },
      }
    }
    const customerResult = await pennylaneClient.post<{ id: number }>('/company_customers', {
      name: (client.company as string | null) ?? (client.name as string),
      emails: [clientEmail],
      billing_address: { address: '', postal_code: '', city: '', country_alpha2: 'FR' },
    })
    if (customerResult.error || !customerResult.data) {
      return { data: null, error: customerResult.error ?? { message: 'Échec création Pennylane', code: 'PENNYLANE_ERROR' } }
    }
    pennylaneCustomerId = String(customerResult.data.id)
    await supabase.from('clients').update({ pennylane_customer_id: pennylaneCustomerId }).eq('id', input.clientId)
  }

  // Construire les line_items — grille v2 : une seule ligne (plus d'extras)
  const basePrice = PLAN_MONTHLY_PRICE[input.plan] ?? (input.customAmount ?? 0)
  const lineItems: LineItem[] = [
    {
      label: PLAN_LABEL[input.plan],
      description: null,
      quantity: 1,
      unit: 'mois',
      unitPrice: basePrice,
      vatRate: 'FR_200',
      total: basePrice,
    },
  ]

  // POST /billing_subscriptions
  const subscriptionResult = await pennylaneClient.post<{
    billing_subscription: PennylaneBillingSubscription
  }>('/billing_subscriptions', {
    billing_subscription: {
      customer_id: pennylaneCustomerId,
      start_date: input.startDate,
      recurring_period: input.frequency,
      payment_method: input.paymentMethod,
      line_items: lineItems.map(toPennylaneLineItem),
    },
  })

  if (subscriptionResult.error) return { data: null, error: subscriptionResult.error }
  if (!subscriptionResult.data) {
    return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }
  }

  const createdSub = subscriptionResult.data.billing_subscription

  // Mettre à jour client_configs.subscription_tier + pending_billing_update: false
  const { error: configError } = await supabase
    .from('client_configs')
    .update({
      subscription_tier: PLAN_TIER[input.plan],
      pending_billing_update: false,
    })
    .eq('client_id', input.clientId)

  if (configError) {
    console.warn('[FACTURATION:CREATE_SUBSCRIPTION] client_configs update failed:', configError)
  }

  // Notification in-app pour le client
  const clientAuthUserId = client.auth_user_id as string | null
  if (clientAuthUserId) {
    const { error: notifError } = await supabase.from('notifications').insert({
      type: 'payment',
      title: `Abonnement ${PLAN_COMMERCIAL_NAME[input.plan]} activé`,
      body: `Votre abonnement ${PLAN_COMMERCIAL_NAME[input.plan]} ${input.frequency === 'monthly' ? 'mensuel' : input.frequency === 'quarterly' ? 'trimestriel' : 'annuel'} est actif.`,
      recipient_type: 'client',
      recipient_id: clientAuthUserId,
      link: '/modules/facturation',
    })
    if (notifError) {
      console.warn('[FACTURATION:CREATE_SUBSCRIPTION] Notification insert failed:', notifError)
    }
  }

  // Sync immédiat billing_sync
  await triggerBillingSync(input.clientId)

  // Activity log
  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'subscription_created',
    entity_type: 'subscription',
    entity_id: input.clientId,
    metadata: {
      pennylane_subscription_id: createdSub.id,
      client_id: input.clientId,
      plan: input.plan,
      frequency: input.frequency,
      payment_method: input.paymentMethod,
    },
  })
  if (logError) {
    console.warn('[FACTURATION:CREATE_SUBSCRIPTION] Activity log insert failed:', logError)
  }

  return { data: createdSub.id, error: null }
}
