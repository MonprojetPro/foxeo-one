'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { ToggleAccessInput as ToggleAccessInputSchema } from '../types/crm.types'
import type { ToggleAccessInput } from '../types/crm.types'

type ToggleAccessResult = {
  clientId: string
  accessType: 'lab' | 'one'
  enabled: boolean
  dashboardType: string
  parcoursSuspended?: boolean
  clientSuspended?: boolean
}

export async function toggleAccess(input: ToggleAccessInput): Promise<ActionResponse<ToggleAccessResult>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Validate input
    const parsed = ToggleAccessInputSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.flatten()
      )
    }

    const { clientId, accessType, enabled } = parsed.data

    // Get operator record
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // Get current client config
    const { data: config, error: configError } = await supabase
      .from('client_configs')
      .select('dashboard_type')
      .eq('client_id', clientId)
      .single()

    if (configError || !config) {
      return errorResponse('Configuration client non trouvée', 'NOT_FOUND')
    }

    // Derive current access state from dashboard_type
    // 'lab' means both Lab and One are accessible (Lab takes priority)
    // 'one' means only One is accessible
    // 'hub' means operator-only view — neither Lab nor One active for client
    const currentLabOn = config.dashboard_type === 'lab'
    const currentOneOn = config.dashboard_type === 'one' || config.dashboard_type === 'lab'

    // Apply toggle
    let newLabOn = currentLabOn
    let newOneOn = currentOneOn

    if (accessType === 'lab') {
      newLabOn = enabled
    } else {
      newOneOn = enabled
    }

    // Determine new dashboard_type from combined state
    let newDashboardType: string
    if (newLabOn) {
      // Lab ON always means dashboard_type = 'lab' (implies One access too)
      newDashboardType = 'lab'
    } else if (newOneOn) {
      newDashboardType = 'one'
    } else {
      // Both OFF — keep last dashboard_type but suspend client
      newDashboardType = 'one'
    }

    // Update client_configs
    const { error: updateError } = await supabase
      .from('client_configs')
      .update({ dashboard_type: newDashboardType })
      .eq('client_id', clientId)

    if (updateError) {
      console.error('[CRM:TOGGLE_ACCESS] Update error:', updateError)
      return errorResponse(
        'Impossible de modifier l\'accès',
        'DATABASE_ERROR',
        updateError
      )
    }

    // Handle Both-OFF: suspend the client
    let clientSuspended = false
    if (!newLabOn && !newOneOn) {
      const { error: suspendError } = await supabase
        .from('clients')
        .update({ status: 'suspended' })
        .eq('id', clientId)

      if (suspendError) {
        console.error('[CRM:TOGGLE_ACCESS] Client suspend error:', suspendError)
      } else {
        clientSuspended = true
      }
    }

    // Handle parcours suspension/reactivation when Lab is toggled
    let parcoursSuspended = false
    if (accessType === 'lab') {
      if (!enabled) {
        // Suspend active parcours
        const { data: updated } = await supabase
          .from('parcours')
          .update({
            status: 'suspendu',
            suspended_at: new Date().toISOString(),
          })
          .eq('client_id', clientId)
          .eq('status', 'en_cours')
          .select('id')

        parcoursSuspended = (updated?.length ?? 0) > 0
      } else {
        // Reactivate suspended parcours
        await supabase
          .from('parcours')
          .update({
            status: 'en_cours',
            suspended_at: null,
          })
          .eq('client_id', clientId)
          .eq('status', 'suspendu')
      }
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: `access_${accessType}_${enabled ? 'enabled' : 'disabled'}`,
      entity_type: 'client',
      entity_id: clientId,
      metadata: { accessType, enabled, newDashboardType, clientSuspended },
    })

    return successResponse({
      clientId,
      accessType,
      enabled,
      dashboardType: newDashboardType,
      parcoursSuspended,
      clientSuspended,
    })
  } catch (error) {
    console.error('[CRM:TOGGLE_ACCESS] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
