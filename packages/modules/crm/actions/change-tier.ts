'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse, type ActionResponse } from '@monprojetpro/types'
import { mapTierToElio, isDowngradeFromOnePlus, isUpgradeToOnePlus } from '../utils/tier-helpers'
import type { SubscriptionTier } from '../types/subscription.types'

const ChangeTierInputSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
  newTier: z.enum(['base', 'essentiel', 'agentique'], {
    message: 'Tier invalide — valeurs acceptées : base, essentiel, agentique',
  }),
})

export async function changeClientTier(input: {
  clientId: string
  newTier: SubscriptionTier
}): Promise<ActionResponse<null>> {
  // 1. Validation Zod
  const parsed = ChangeTierInputSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
    return errorResponse(firstError, 'INVALID_INPUT', parsed.error.issues)
  }

  const { clientId, newTier } = parsed.data

  try {
    const supabase = await createServerSupabaseClient()

    // 2. Auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // 3. Lookup operator
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const operatorId = operator.id

    // 4. Check client exists and belongs to this operator
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, operator_id')
      .eq('id', clientId)
      .eq('operator_id', operatorId)
      .single()

    if (clientError || !client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    // 5. Fetch current client_config
    const { data: config, error: configError } = await supabase
      .from('client_configs')
      .select('id, subscription_tier, elio_tier, elio_proactive_alerts')
      .eq('client_id', clientId)
      .single()

    if (configError || !config) {
      console.error('[CRM:CHANGE_TIER] Config not found:', configError)
      return errorResponse('Configuration client introuvable', 'NOT_FOUND')
    }

    // 6. Check same tier
    const oldTier = (config.subscription_tier as SubscriptionTier | null) ?? 'base'
    if (oldTier === newTier) {
      return errorResponse(
        `Le client est déjà en tier ${newTier}`,
        'TIER_UNCHANGED'
      )
    }

    // 7. Determine proactive alerts based on transition
    const upgradeToOnePlus = isUpgradeToOnePlus(oldTier, newTier)
    const downgradeFromOnePlus = isDowngradeFromOnePlus(oldTier, newTier)
    const newElioTier = mapTierToElio(newTier)

    // 8. Update client_configs
    const updatePayload: Record<string, unknown> = {
      subscription_tier: newTier,
      elio_tier: newElioTier,
      tier_changed_at: new Date().toISOString(),
      pending_billing_update: true,
    }

    if (upgradeToOnePlus) {
      updatePayload.elio_proactive_alerts = true
    } else if (downgradeFromOnePlus) {
      updatePayload.elio_proactive_alerts = false
    }

    const { error: updateError } = await supabase
      .from('client_configs')
      .update(updatePayload)
      .eq('client_id', clientId)
      .eq('id', config.id)

    if (updateError) {
      console.error('[CRM:CHANGE_TIER] Update error:', updateError)
      return errorResponse('Erreur lors du changement de tier', 'DATABASE_ERROR', updateError)
    }

    // 9. Log activity
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operatorId,
      action: 'tier_changed',
      entity_type: 'client',
      entity_id: clientId,
      metadata: {
        oldTier,
        newTier,
        changedBy: operatorId,
      },
    })

    if (logError) {
      console.error('[CRM:CHANGE_TIER] Activity log error:', logError)
      // Log failure is non-fatal
    }

    // 10. Revalidate
    revalidatePath('/crm')
    revalidatePath(`/crm/clients/${clientId}`)

    return successResponse(null)
  } catch (error) {
    console.error('[CRM:CHANGE_TIER] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
