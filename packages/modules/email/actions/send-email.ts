'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { getValidAccessToken, sendGmailMessage } from '../utils/gmail-api'
import { SendEmailInput } from '../types/email.types'

export async function sendEmail(input: SendEmailInput): Promise<ActionResponse<void>> {
  const parsed = SendEmailInput.safeParse(input)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? 'Données invalides', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'AUTH_ERROR')

  const { data: integration } = await supabase
    .from('gmail_integrations')
    .select('gmail_email')
    .eq('operator_id', user.id)
    .maybeSingle()

  if (!integration) return errorResponse('Gmail non connecté', 'AUTH_ERROR')

  const accessToken = await getValidAccessToken(supabase, user.id)
  if (!accessToken) return errorResponse('Token Gmail invalide', 'AUTH_ERROR')

  const { to, subject, body, threadId, inReplyTo, references } = parsed.data

  try {
    const ok = await sendGmailMessage(accessToken, {
      from: integration.gmail_email,
      to,
      subject,
      body,
      threadId,
      inReplyTo,
      references,
    })
    if (!ok) return errorResponse('Echec de l\'envoi via Gmail', 'SEND_ERROR')
    return successResponse(undefined)
  } catch (err) {
    return errorResponse('Erreur lors de l\'envoi du mail', 'SEND_ERROR', err)
  }
}
