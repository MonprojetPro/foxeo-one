'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { generateResourceLinks } from '../utils/generate-resource-links'
import { SendProspectResourcesInput } from './post-meeting-schemas'
export type { SendProspectResourcesInput } from './post-meeting-schemas'

export interface ProspectResourcesResult {
  linksSent: number
}

export async function sendProspectResources(
  input: SendProspectResourcesInput
): Promise<ActionResponse<ProspectResourcesResult>> {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

  const parsed = SendProspectResourcesInput.safeParse(input)
  if (!parsed.success) {
    return errorResponse('Données invalides', 'VALIDATION_ERROR', parsed.error.issues)
  }

  const { meetingId, prospectEmail, documentIds } = parsed.data

  // Récupérer operator_id
  const { data: operator, error: operatorError } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (operatorError || !operator) {
    return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
  }

  // Récupérer client_id depuis le meeting (pour lier le rappel)
  const { data: meeting } = await supabase
    .from('meetings')
    .select('client_id')
    .eq('id', meetingId)
    .single()

  // Générer signed URLs (7 jours)
  const links = await generateResourceLinks(supabase, documentIds)

  // Envoyer email avec liens (non-bloquant)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && serviceRoleKey) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: prospectEmail,
          template: 'prospect-resources',
          data: { links },
        }),
      })
    } catch (emailErr) {
      console.error('[VISIO:POST_MEETING] Email failed (non-blocking):', emailErr)
    }
  }

  // Créer rappel MiKL dans 3 jours (adapté au vrai schéma reminders)
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  const { error: reminderError } = await supabase.from('reminders').insert({
    operator_id: operator.id,
    ...(meeting?.client_id ? { client_id: meeting.client_id } : {}),
    title: `Relancer prospect ${prospectEmail}`,
    description: `Ressources envoyées le ${new Date().toLocaleDateString('fr-FR')} — meeting: ${meetingId}`,
    due_date: dueDate,
  })

  if (reminderError) {
    console.error('[VISIO:POST_MEETING] Reminder creation failed (non-blocking):', reminderError)
  }

  console.log('[VISIO:POST_MEETING] Ressources envoyées:', links.length)

  return successResponse({ linksSent: links.length })
}
