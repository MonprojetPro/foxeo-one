'use server'

import { pennylaneClient } from '../config/pennylane'
import { toPennylaneLineItem } from '../utils/billing-mappers'
import { triggerBillingSync } from './trigger-billing-sync'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'
import type { LineItem, PennylaneBillingSubscription } from '../types/billing.types'

// ============================================================
// Constantes locales — évite import inter-module depuis CRM
// ============================================================

export type SubscriptionPlan = 'ponctuel' | 'essentiel' | 'agentique'
export type RecurringPeriod = 'monthly' | 'quarterly' | 'yearly'
export type PaymentMethod = 'cb' | 'virement' | 'sepa'

// Prix mensuel de base par plan (null = ponctuel variable)
export const PLAN_MONTHLY_PRICE: Record<SubscriptionPlan, number | null> = {
  ponctuel: null,
  essentiel: 49,
  agentique: 99,
}

// Mapping plan MonprojetPro → label Pennylane (1ère ligne)
export const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  ponctuel: 'Forfait ponctuel',
  essentiel: 'Abonnement Essentiel',
  agentique: 'Abonnement Agentique',
}

export type ExtraModule = {
  id: string
  label: string
  monthlyPrice: number
}

export const AVAILABLE_EXTRAS: ExtraModule[] = [
  { id: 'visio', label: 'Module Visio', monthlyPrice: 19 },
  { id: 'crm', label: 'Module CRM avancé', monthlyPrice: 15 },
  { id: 'documents', label: 'Module Documents+', monthlyPrice: 10 },
  { id: 'analytics', label: 'Module Analytics', monthlyPrice: 20 },
]

// ============================================================
// createSubscription — crée un abonnement récurrent Pennylane
// ============================================================

export type CreateSubscriptionInput = {
  clientId: string
  plan: SubscriptionPlan
  frequency: RecurringPeriod
  startDate: string // YYYY-MM-DD
  extras: string[] // IDs des modules extras sélectionnés
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

  // Construire les line_items
  const basePrice = PLAN_MONTHLY_PRICE[input.plan] ?? (input.customAmount ?? 0)
  const lineItems: LineItem[] = []

  // Ligne 1 : forfait de base
  lineItems.push({
    label: PLAN_LABEL[input.plan],
    description: null,
    quantity: 1,
    unit: 'mois',
    unitPrice: basePrice,
    vatRate: 'FR_200',
    total: basePrice,
  })

  // Lignes extras : 1 ligne par module sélectionné
  for (const extraId of input.extras) {
    const extra = AVAILABLE_EXTRAS.find((e) => e.id === extraId)
    if (!extra) continue
    lineItems.push({
      label: extra.label,
      description: null,
      quantity: 1,
      unit: 'mois',
      unitPrice: extra.monthlyPrice,
      vatRate: 'FR_200',
      total: extra.monthlyPrice,
    })
  }

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
  const tierMap: Record<SubscriptionPlan, string> = {
    ponctuel: 'base',
    essentiel: 'essentiel',
    agentique: 'agentique',
  }

  const { error: configError } = await supabase
    .from('client_configs')
    .update({
      subscription_tier: tierMap[input.plan],
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
      title: `Abonnement créé — ${PLAN_LABEL[input.plan]}`,
      body: `Votre abonnement ${input.frequency === 'monthly' ? 'mensuel' : input.frequency === 'quarterly' ? 'trimestriel' : 'annuel'} est actif.`,
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
      extras: input.extras,
      payment_method: input.paymentMethod,
    },
  })
  if (logError) {
    console.warn('[FACTURATION:CREATE_SUBSCRIPTION] Activity log insert failed:', logError)
  }

  return { data: createdSub.id, error: null }
}
