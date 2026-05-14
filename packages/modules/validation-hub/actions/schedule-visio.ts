'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import { z } from 'zod'
import type { ValidationRequest } from '../types/validation.types'

const scheduleVisioSchema = z.object({
  requestId: z.string().uuid('requestId doit être un UUID valide'),
  clientId: z.string().uuid('clientId doit être un UUID valide'),
})

export type ScheduleVisioResult = {
  request: ValidationRequest
  calComUrl: string
  clientName: string
  clientEmail: string
}

export async function scheduleVisio(
  requestId: string,
  clientId: string
): Promise<ActionResponse<ScheduleVisioResult>> {
  try {
    const validated = scheduleVisioSchema.safeParse({ requestId, clientId })
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

    // 1. Read operator's Cal.com URL from calendar_integrations
    const { data: calcomIntegration } = await supabase
      .from('calendar_integrations')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('provider', 'calcom')
      .eq('connected', true)
      .maybeSingle()

    const rawCalcomUrl = (calcomIntegration?.metadata as { url?: string } | null)?.url
    if (!rawCalcomUrl) {
      return errorResponse(
        "Cal.com n'est pas configuré. Renseigne ton URL Cal.com dans Agenda → Synchronisation Calendriers.",
        'CALCOM_NOT_CONFIGURED'
      )
    }

    // 2. Update reviewer_comment (request stays pending)
    const { data, error } = await supabase
      .from('validation_requests')
      .update({
        reviewer_comment: 'Visio à programmer',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('[VALIDATION-HUB:SCHEDULE-VISIO] Error updating request:', error)
      return errorResponse('Erreur lors de la mise à jour', 'DB_ERROR', error)
    }

    // 3. Get client info for Cal.com URL
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('auth_user_id, name, email')
      .eq('id', clientId)
      .single()

    if (clientError || !clientData) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    // 4. Notify client
    if (clientData.auth_user_id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          recipient_type: 'client',
          recipient_id: clientData.auth_user_id,
          type: 'validation',
          title: "MiKL souhaite en discuter en visio — un RDV va être proposé",
          link: '/modules/agenda',
        })
        .select('id')
        .single()

      if (notifError) {
        console.error('[VALIDATION-HUB:SCHEDULE-VISIO] Error creating notification:', notifError)
        // Non-blocking
      }
    }

    const clientName = clientData.name ?? ''
    const clientEmail = clientData.email ?? ''

    // Normalize stored URL: accepts "cal.com/x/y", "https://cal.com/x/y", "http://..."
    const trimmed = rawCalcomUrl.trim().replace(/\/+$/, '')
    const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const separator = normalizedUrl.includes('?') ? '&' : '?'
    const calComUrl = `${normalizedUrl}${separator}name=${encodeURIComponent(clientName)}&email=${encodeURIComponent(clientEmail)}`

    return successResponse({
      request: toCamelCase(data) as ValidationRequest,
      calComUrl,
      clientName,
      clientEmail,
    })
  } catch (err) {
    console.error('[VALIDATION-HUB:SCHEDULE-VISIO] Unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}
