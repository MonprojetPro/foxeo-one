'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import { z } from 'zod'
import type { ValidationRequest } from '../types/validation.types'

const startDevSchema = z.object({
  requestId: z.string().uuid('requestId doit être un UUID valide'),
  clientId: z.string().uuid('clientId doit être un UUID valide'),
  requestTitle: z.string().min(1, 'Le titre est requis'),
})

export type StartDevResult = {
  request: ValidationRequest
  cursorUrl: string | null
}

export async function startDev(
  requestId: string,
  clientId: string,
  requestTitle: string
): Promise<ActionResponse<StartDevResult>> {
  try {
    const validated = startDevSchema.safeParse({ requestId, clientId, requestTitle })
    if (!validated.success) {
      return errorResponse('Données invalides', 'VALIDATION_ERROR', validated.error)
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // 1. Approve the request
    const { data, error } = await supabase
      .from('validation_requests')
      .update({
        status: 'approved',
        reviewer_comment: 'Pris en charge — développement direct',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('[VALIDATION-HUB:START-DEV] Error updating request:', error)
      return errorResponse('Erreur lors de la prise en charge', 'DB_ERROR', error)
    }

    // 2. Get client bmad_project_path
    const { data: clientData } = await supabase
      .from('clients')
      .select('auth_user_id, bmad_project_path')
      .eq('id', clientId)
      .single()

    const bmadProjectPath = clientData?.bmad_project_path ?? null

    // 3. Notify client
    if (clientData?.auth_user_id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          recipient_type: 'client',
          recipient_id: clientData.auth_user_id,
          type: 'validation',
          title: `Votre demande '${requestTitle}' est prise en charge par MiKL`,
          link: '/modules/core-dashboard',
        })
        .select('id')
        .single()

      if (notifError) {
        console.error('[VALIDATION-HUB:START-DEV] Error creating notification:', notifError)
        // Non-blocking
      }
    }

    const cursorUrl = bmadProjectPath ? `cursor://${bmadProjectPath}` : null

    return successResponse({
      request: toCamelCase(data) as ValidationRequest,
      cursorUrl,
    })
  } catch (err) {
    console.error('[VALIDATION-HUB:START-DEV] Unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}
