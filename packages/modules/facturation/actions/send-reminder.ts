'use server'

import { assertOperator } from './assert-operator'
import { successResponse, errorResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import type { ReminderChannel } from '../types/billing.types'

export interface SendReminderInput {
  reminderId: string
  channel: ReminderChannel
  body: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildReminderEmailHtml(params: {
  body: string
  invoiceNumber: string
  clientName: string
}): string {
  const safeBody = escapeHtml(params.body)
  const safeInvoiceNumber = escapeHtml(params.invoiceNumber)
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #020402; padding: 24px 32px;">
      <p style="color: #2dd4bf; font-size: 18px; font-weight: 700; margin: 0;">MonprojetPro</p>
    </div>
    <div style="padding: 32px; color: #1a1a1a; line-height: 1.6; white-space: pre-wrap;">${safeBody}</div>
    <div style="padding: 16px 32px; background: #f8f9fa; border-top: 1px solid #e9ecef;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        Référence : Facture ${safeInvoiceNumber}
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function sendReminder(
  input: SendReminderInput
): Promise<ActionResponse<{ sent: boolean }>> {
  const { reminderId, channel, body } = input

  if (!reminderId) return errorResponse('reminderId requis', 'VALIDATION_ERROR')
  if (!channel || !['email', 'chat', 'both'].includes(channel)) {
    return errorResponse('Canal invalide (email | chat | both)', 'VALIDATION_ERROR')
  }
  if (!body || body.trim().length === 0) return errorResponse('Corps du message requis', 'VALIDATION_ERROR')

  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return errorResponse(authError?.message ?? 'Non authentifié', authError?.code ?? 'UNAUTHORIZED')

  // Récupérer la relance + infos client
  const { data: reminder, error: reminderError } = await supabase
    .from('collection_reminders')
    .select('*')
    .eq('id', reminderId)
    .eq('status', 'pending')
    .single()

  if (reminderError || !reminder) {
    return errorResponse('Relance introuvable ou déjà traitée', 'NOT_FOUND')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('email, name, auth_user_id')
    .eq('id', reminder.client_id)
    .single()

  if (!client) {
    return errorResponse('Client introuvable', 'NOT_FOUND')
  }

  // Mise à jour DB en premier (idempotence : évite les doublons si send échoue puis retry)
  // La relance passe à 'sent' avant l'envoi — un retry ne renvoie pas deux fois.
  const { error: updateError } = await supabase
    .from('collection_reminders')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      channel,
      generated_body: body,
    })
    .eq('id', reminderId)

  if (updateError) {
    return errorResponse('Erreur mise à jour relance', 'DB_ERROR', updateError)
  }

  // Envoi email si canal email ou both
  if (channel === 'email' || channel === 'both') {
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return errorResponse('Configuration email manquante (RESEND_API_KEY)', 'CONFIG_ERROR')
    }

    try {
      const html = buildReminderEmailHtml({
        body,
        invoiceNumber: reminder.invoice_number,
        clientName: client.name,
      })

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'MonprojetPro <noreply@monprojet-pro.com>',
          to: client.email,
          subject: `Facture ${reminder.invoice_number} — Rappel`,
          html,
        }),
      })

      if (!emailRes.ok) {
        const resendErr = await emailRes.json() as { message?: string }
        console.error('[SEND-REMINDER] Resend error:', resendErr.message)
        return errorResponse(`Erreur envoi email: ${resendErr.message ?? 'Erreur Resend'}`, 'EMAIL_ERROR')
      }
    } catch (emailErr) {
      console.error('[SEND-REMINDER] Fetch Resend failed:', emailErr)
      return errorResponse('Erreur envoi email', 'EMAIL_ERROR')
    }
  }

  // Envoi notification chat si canal chat ou both
  if (channel === 'chat' || channel === 'both') {
    if (client.auth_user_id) {
      const { error: notifError } = await supabase.from('notifications').insert({
        recipient_type: 'client',
        recipient_id: reminder.client_id,
        type: 'message',
        title: `Rappel facture ${reminder.invoice_number}`,
        body,
        is_read: false,
      })

      if (notifError) {
        console.error('[SEND-REMINDER] Notification insert error:', notifError.message)
      }
    }
  }

  return successResponse({ sent: true })
}
