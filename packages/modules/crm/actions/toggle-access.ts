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

    // Get current client config — on lit les VRAIS flags (plus de dérivation depuis dashboard_type)
    const { data: config, error: configError } = await supabase
      .from('client_configs')
      .select('dashboard_type, lab_mode_available, one_mode_available, elio_lab_enabled')
      .eq('client_id', clientId)
      .single()

    if (configError || !config) {
      return errorResponse('Configuration client non trouvée', 'NOT_FOUND')
    }

    // Modèle 3 leviers (cf. docs/lab-one-lifecycle.md) :
    //  - accessType 'lab'  = AGENTS Lab (couper / réactiver la communication). L'espace Lab
    //    (has_lab = lab_mode_available) est PERMANENT une fois accordé — jamais remis à false.
    //  - accessType 'one'  = ouvrir / fermer l'accès One (réversible).
    const newOneOn = accessType === 'one' ? enabled : config.one_mode_available
    // dashboard_type = mode par défaut au login : One s'il est ouvert, sinon Lab.
    const newDashboardType = newOneOn ? 'one' : 'lab'

    const configUpdate: {
      dashboard_type: string
      lab_mode_available?: boolean
      one_mode_available?: boolean
      elio_lab_enabled?: boolean
    } = { dashboard_type: newDashboardType }

    if (accessType === 'one') {
      // Ouvrir / fermer le One.
      configUpdate.one_mode_available = enabled
    } else {
      // Agents Lab : couper (off) ou réactiver (on) la communication.
      configUpdate.elio_lab_enabled = enabled
      // Réactiver implique que le client a un Lab → on garantit has_lab.
      // On NE remet JAMAIS lab_mode_available à false (permanence : l'espace + l'historique restent à vie).
      if (enabled) {
        configUpdate.lab_mode_available = true
      }
    }

    const { error: updateError } = await supabase
      .from('client_configs')
      .update(configUpdate)
      .eq('client_id', clientId)

    if (updateError) {
      console.error('[CRM:TOGGLE_ACCESS] Update error:', updateError)
      return errorResponse(
        'Impossible de modifier l\'accès',
        'DATABASE_ERROR',
        updateError
      )
    }

    // Permanence : l'espace Lab restant toujours accessible (historique à vie), il n'y a
    // plus de cas « aucun accès » → plus de suspension auto. La suspension d'un client est
    // une action de cycle de vie distincte (ClientLifecycleActions).
    const clientSuspended = false

    // Handle parcours suspension/reactivation when Lab agents are toggled
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
