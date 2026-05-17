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

    // Approve via la RPC : elle propage le statut à client_parcours_agents,
    // step_submissions, step_feedback_injections et crée la notification client.
    // Wording de notif personnalisé pour la sémantique "prise en charge dev direct".
    const { data, error } = await supabase.rpc('approve_validation_request', {
      p_request_id: requestId,
      p_comment: 'Pris en charge — développement direct',
      p_operator_id: operator.id,
      p_notification_title: `MiKL a tous les éléments — début du développement de ton projet — ${requestTitle}`,
      p_notification_body: 'MiKL dispose de tous les éléments et commence le développement de ton projet.',
    })

    if (error) {
      console.error('[VALIDATION-HUB:START-DEV] Error approving request:', error)
      return errorResponse('Erreur lors de la prise en charge', 'DB_ERROR', error)
    }

    // Récupère bmad_project_path pour le deeplink Cursor côté Hub
    const { data: clientData } = await supabase
      .from('clients')
      .select('bmad_project_path')
      .eq('id', clientId)
      .single()

    const bmadProjectPath = clientData?.bmad_project_path ?? null
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
