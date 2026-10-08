'use server'

import { sendByEmailWithRetry } from '../utils/send-by-email-with-retry'
import { assertOperator } from './assert-operator'
import { resolveBillingRecipients } from './resolve-billing-recipients'
import type { ActionResponse } from '@monprojetpro/types'

// ============================================================
// sendInvoiceByEmail — T-044
//
// MiKL le 08-10 : « comment je fais pour envoyer une facture quand elle a ete
// generee ? ». Reponse d'alors : il ne pouvait pas. L'envoi n'existait QU'AU
// MOMENT de la creation (`createInvoice` avec `sendNow`), et la liste des
// factures n'avait aucun bouton — alors que les devis en avaient un depuis
// toujours (`sendQuoteByEmail`). Une facture creee « sans envoyer » etait donc
// definitive ET injoignable depuis le Hub.
//
// Vaut pour les FACTURES ET LES AVOIRS : les deux partent par le meme endpoint
// Pennylane (`/customer_invoices/{id}/send_by_email`), et un avoir qui reste
// dans un tiroir ne previent pas le client que sa facture est annulee.
// ============================================================

export type SendInvoiceResult = {
  sent: boolean
  /** Horodatage ecrit en base, pour que l'ecran puisse l'afficher sans recharger */
  sentAt: string
  /** Adresses reellement servies (carnet de contacts T-039), pour le dire a MiKL */
  sentTo: string[]
  /** true si aucun contact n'etait coche « recoit les factures » */
  usedFallbackRecipient: boolean
}

export async function sendInvoiceByEmail(
  pennylaneInvoiceId: string
): Promise<ActionResponse<SendInvoiceResult>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  if (!pennylaneInvoiceId) {
    return { data: null, error: { message: 'Identifiant de facture requis', code: 'VALIDATION_ERROR' } }
  }

  // On lit la ligne AVANT d'envoyer : elle porte le client, donc les
  // destinataires, et elle permet de refuser un identifiant inconnu plutot que
  // de taper chez Pennylane a l'aveugle.
  const { data: row, error: rowError } = await supabase
    .from('billing_sync')
    .select('entity_type, client_id, last_sent_at, data')
    .eq('pennylane_id', pennylaneInvoiceId)
    .in('entity_type', ['invoice', 'credit_note'])
    .maybeSingle()

  if (rowError) {
    return {
      data: null,
      error: { message: 'Lecture du document impossible', code: 'DATABASE_ERROR', details: rowError },
    }
  }
  if (!row) {
    return {
      data: null,
      error: {
        message: 'Document introuvable dans le Hub — lance « Rafraîchir » puis réessaie',
        code: 'NOT_FOUND',
      },
    }
  }

  // T-039 — aligne les destinataires du compte Pennylane sur le carnet AVANT
  // l'envoi : sans ca, un renvoi partirait aux adresses enregistrees la premiere
  // fois, meme si MiKL a corrige le carnet depuis.
  const recipientsResult = await resolveBillingRecipients(row.client_id as string)
  const recipients = recipientsResult.data

  const result = await sendByEmailWithRetry(pennylaneInvoiceId, 'customer_invoices')

  if (!result.sent) {
    if (result.lastError?.code === 'PENNYLANE_409') {
      return {
        data: null,
        error: {
          message: `Le PDF n'est toujours pas prêt après ${result.attempts} tentatives. Réessaie dans 30 secondes.`,
          code: 'PDF_NOT_READY',
          details: result.lastError,
        },
      }
    }
    return {
      data: null,
      error: result.lastError ?? { message: "Échec de l'envoi", code: 'SEND_FAILED' },
    }
  }

  const sentAt = new Date().toISOString()

  // ⚠️ La date va dans une COLONNE, pas dans `data` : le cron billing-sync
  // reecrit `data` en entier a chaque passage, la date y disparaitrait en silence.
  const { error: stampError } = await supabase
    .from('billing_sync')
    .update({ last_sent_at: sentAt })
    .eq('pennylane_id', pennylaneInvoiceId)
    .eq('entity_type', row.entity_type as string)

  if (stampError) {
    // L'email EST parti : on ne transforme pas ca en echec. Mais on le dit, sinon
    // l'ecran affichera « jamais envoye » sur un document deja envoye, et MiKL
    // enverra deux fois.
    console.error('[FACTURATION:SEND_INVOICE] last_sent_at update failed:', stampError)
  }

  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: row.entity_type === 'credit_note' ? 'credit_note_sent_by_email' : 'invoice_sent_by_email',
    entity_type: row.entity_type as string,
    metadata: {
      pennylane_invoice_id: pennylaneInvoiceId,
      client_id: row.client_id,
      attempts: result.attempts,
      recipients: recipients?.emails ?? [],
      used_fallback_recipient: recipients?.usedFallback ?? true,
      // Un renvoi est legitime (relance manuelle) mais doit rester tracable.
      was_resend: row.last_sent_at != null,
      stamped: stampError == null,
    },
  })
  if (logError) {
    console.warn('[FACTURATION:SEND_INVOICE] Activity log insert failed:', logError)
  }

  return {
    data: {
      sent: true,
      sentAt,
      sentTo: recipients?.emails ?? [],
      usedFallbackRecipient: recipients?.usedFallback ?? true,
    },
    error: null,
  }
}
