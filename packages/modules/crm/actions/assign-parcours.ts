'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import {
  AssignParcoursInput as AssignParcoursInputSchema,
  Parcours as ParcoursSchema,
} from '../types/crm.types'
import type { Parcours, AssignParcoursInput } from '../types/crm.types'

export async function assignParcours(input: AssignParcoursInput): Promise<ActionResponse<Parcours>> {
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
    const parsed = AssignParcoursInputSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.flatten()
      )
    }

    const { clientId, templateId, activeStages } = parsed.data

    // Get operator record to get operator_id
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // Check for existing active parcours (prevent duplicates)
    const { data: existingParcours } = await supabase
      .from('parcours')
      .select('id')
      .eq('client_id', clientId)
      .eq('status', 'en_cours')
      .limit(1)
      .maybeSingle()

    if (existingParcours) {
      return errorResponse(
        'Ce client a déjà un parcours en cours',
        'DUPLICATE_PARCOURS'
      )
    }

    // Fetch template name for parcours_config
    const { data: template, error: templateError } = await supabase
      .from('parcours_templates')
      .select('name')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return errorResponse('Template de parcours introuvable', 'NOT_FOUND')
    }

    // Build active_stages with default status
    const activeStagesWithStatus = activeStages.map((stage) => ({
      key: stage.key,
      active: stage.active,
      status: stage.active ? 'pending' : 'skipped',
    }))

    // Insert parcours
    const { data: parcours, error: insertError } = await supabase
      .from('parcours')
      .insert({
        client_id: clientId,
        template_id: templateId,
        operator_id: operator.id,
        active_stages: activeStagesWithStatus,
        status: 'en_cours',
      })
      .select()
      .single()

    if (insertError || !parcours) {
      console.error('[CRM:ASSIGN_PARCOURS] Insert error:', insertError)
      return errorResponse(
        'Impossible d\'assigner le parcours',
        'DATABASE_ERROR',
        insertError
      )
    }

    // Update client_configs: dashboard_type = 'lab', parcours_config with template name
    const { error: configError } = await supabase
      .from('client_configs')
      .update({
        dashboard_type: 'lab',
        parcours_config: {
          parcoursId: parcours.id,
          templateId,
          name: template.name,
        },
      })
      .eq('client_id', clientId)

    if (configError) {
      console.error('[CRM:ASSIGN_PARCOURS] Config update error:', configError)
      // Parcours created but config update failed — rollback parcours to maintain consistency
      await supabase.from('parcours').delete().eq('id', parcours.id)
      return errorResponse(
        'Impossible de mettre à jour la configuration client',
        'DATABASE_ERROR',
        configError
      )
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'parcours_assigned',
      entity_type: 'parcours',
      entity_id: parcours.id,
      metadata: { clientId, templateId, templateName: template.name },
    })

    const result = ParcoursSchema.parse({
      id: parcours.id,
      clientId: parcours.client_id,
      templateId: parcours.template_id,
      operatorId: parcours.operator_id,
      activeStages: parcours.active_stages,
      status: parcours.status,
      startedAt: parcours.started_at,
      suspendedAt: parcours.suspended_at,
      completedAt: parcours.completed_at,
      createdAt: parcours.created_at,
      updatedAt: parcours.updated_at,
    })

    return successResponse(result)
  } catch (error) {
    console.error('[CRM:ASSIGN_PARCOURS] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
