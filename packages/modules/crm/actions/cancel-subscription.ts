'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { z } from 'zod'

/**
 * Résiliation d'abonnement — le déclencheur de l'accès dégradé.
 *
 * RÈGLE MÉTIER
 * Passer un client en `subscription_cancelled` ne l'expulse pas : son espace devient
 * consultable (Lab figé, documents téléchargeables), il garde les modules de famille
 * « relation » et surtout il peut toujours écrire à MiKL. C'est une porte laissée
 * ouverte, pas une punition — d'où la réversibilité assurée par `reactivateSubscription`.
 *
 * Le verrou d'écriture réel est en base (RLS, migration 20260726170000) : cette action
 * ne fait que poser le statut qui l'active.
 */

const CancelSubscriptionInputSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
  reason: z.string().max(500, 'Raison trop longue').optional(),
})

export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionInputSchema>

const ReactivateSubscriptionInputSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
})

export type ReactivateSubscriptionInput = z.infer<typeof ReactivateSubscriptionInputSchema>

/** Statuts depuis lesquels une résiliation a du sens (le client est encore servi). */
const CANCELLABLE_STATUSES = ['active', 'suspended']

/** Statuts de fin d'abonnement — miroir du CHECK de `clients.status`. */
const CANCELLED_STATUSES = ['subscription_cancelled', 'handed_off']

/**
 * Résout l'opérateur connecté. `operators.id` ≠ `auth.uid()` : la confusion entre les
 * deux est un piège récurrent du projet (elle produit un « accès interdit » silencieux).
 */
async function resolveOperator(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
): Promise<{ operatorId: string } | { error: ReturnType<typeof errorResponse> }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: errorResponse('Non authentifié', 'UNAUTHORIZED') }
  }

  const { data: operator, error: opError } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (opError || !operator) {
    return { error: errorResponse('Opérateur non trouvé', 'NOT_FOUND') }
  }

  return { operatorId: (operator as { id: string }).id }
}

export async function cancelSubscription(
  input: CancelSubscriptionInput
): Promise<ActionResponse<{ success: true }>> {
  try {
    const parsed = CancelSubscriptionInputSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'INVALID_INPUT', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()

    const resolved = await resolveOperator(supabase)
    if ('error' in resolved) return resolved.error
    const { operatorId } = resolved

    const { clientId, reason } = parsed.data

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, status')
      .eq('id', clientId)
      .eq('operator_id', operatorId)
      .maybeSingle()

    if (clientError) {
      console.error('[CRM:CANCEL_SUBSCRIPTION] Client check error:', clientError)
      return errorResponse(
        'Erreur lors de la vérification du client',
        'DATABASE_ERROR',
        clientError
      )
    }

    if (!client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    const currentStatus = (client as { status: string }).status

    if (CANCELLED_STATUSES.includes(currentStatus)) {
      return errorResponse('L\'abonnement est déjà résilié', 'ALREADY_CANCELLED')
    }

    if (!CANCELLABLE_STATUSES.includes(currentStatus)) {
      return errorResponse(
        'Seul un client actif ou suspendu peut voir son abonnement résilié',
        'INVALID_STATUS'
      )
    }

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        status: 'subscription_cancelled',
        // Mémorise l'état d'où l'on vient : la réactivation doit rendre exactement
        // l'accès qu'avait le client, pas un « actif » par défaut.
        previous_status: currentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .eq('operator_id', operatorId)

    if (updateError) {
      console.error('[CRM:CANCEL_SUBSCRIPTION] Update error:', updateError)
      return errorResponse(
        'Erreur lors de la résiliation de l\'abonnement',
        'DATABASE_ERROR',
        updateError
      )
    }

    // Journal — action sensible, comme la suspension et la clôture.
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operatorId,
      action: 'subscription_cancelled',
      entity_type: 'client',
      entity_id: clientId,
      metadata: { reason: reason || null, previous_status: currentStatus },
    })

    if (logError) {
      console.error('[CRM:CANCEL_SUBSCRIPTION] Activity log error:', logError)
      // Le journal ne doit jamais faire échouer l'action métier.
    }

    revalidatePath('/modules/crm')
    revalidatePath(`/modules/crm/clients/${clientId}`)

    return successResponse({ success: true })
  } catch (error) {
    console.error('[CRM:CANCEL_SUBSCRIPTION] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}

/**
 * Réactivation — le client revient. On restaure le statut d'avant la résiliation
 * (`active` par défaut) : l'espace redevient pleinement modifiable et les modules
 * cockpit réapparaissent, puisqu'ils n'ont jamais été retirés de sa configuration.
 */
export async function reactivateSubscription(
  input: ReactivateSubscriptionInput
): Promise<ActionResponse<{ success: true }>> {
  try {
    const parsed = ReactivateSubscriptionInputSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'INVALID_INPUT', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()

    const resolved = await resolveOperator(supabase)
    if ('error' in resolved) return resolved.error
    const { operatorId } = resolved

    const { clientId } = parsed.data

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, status, previous_status')
      .eq('id', clientId)
      .eq('operator_id', operatorId)
      .maybeSingle()

    if (clientError) {
      console.error('[CRM:REACTIVATE_SUBSCRIPTION] Client check error:', clientError)
      return errorResponse(
        'Erreur lors de la vérification du client',
        'DATABASE_ERROR',
        clientError
      )
    }

    if (!client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    const typedClient = client as { status: string; previous_status: string | null }

    if (!CANCELLED_STATUSES.includes(typedClient.status)) {
      return errorResponse(
        'Cet abonnement n\'est pas résilié',
        'INVALID_STATUS'
      )
    }

    // On ne restaure `suspended` que s'il était bien l'état de départ ; tout le reste
    // revient à `active`, jamais à un statut de blocage qu'on n'a pas choisi ici.
    const restoredStatus =
      typedClient.previous_status === 'suspended' ? 'suspended' : 'active'

    const { error: updateError } = await supabase
      .from('clients')
      .update({
        status: restoredStatus,
        previous_status: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .eq('operator_id', operatorId)

    if (updateError) {
      console.error('[CRM:REACTIVATE_SUBSCRIPTION] Update error:', updateError)
      return errorResponse(
        'Erreur lors de la réactivation de l\'abonnement',
        'DATABASE_ERROR',
        updateError
      )
    }

    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operatorId,
      action: 'subscription_reactivated',
      entity_type: 'client',
      entity_id: clientId,
      metadata: { restored_status: restoredStatus },
    })

    if (logError) {
      console.error('[CRM:REACTIVATE_SUBSCRIPTION] Activity log error:', logError)
    }

    revalidatePath('/modules/crm')
    revalidatePath(`/modules/crm/clients/${clientId}`)

    return successResponse({ success: true })
  } catch (error) {
    console.error('[CRM:REACTIVATE_SUBSCRIPTION] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
