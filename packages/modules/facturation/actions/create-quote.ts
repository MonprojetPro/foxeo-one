'use server'

import { pennylaneClient } from '../config/pennylane'
import { toPennylaneLineItem } from '../utils/billing-mappers'
import { applyCommercialGesture } from '../utils/commercial-gesture'
import { findZeroAmountLines, describeZeroAmountLines } from '../utils/zero-amount-lines'
import { sendByEmailWithRetry } from '../utils/send-by-email-with-retry'
import { triggerBillingSync } from './trigger-billing-sync'
import { assertOperator } from './assert-operator'
import { createPennylaneCustomer } from './billing-proxy'
import type { ActionResponse } from '@monprojetpro/types'
import type { LineItem, PennylaneQuote, CreateQuoteOptions } from '../types/billing.types'

// ============================================================
// createAndSendQuote — crée un devis Pennylane pour un client
// ============================================================

export async function createAndSendQuote(
  clientId: string,
  lineItems: LineItem[],
  options: CreateQuoteOptions
): Promise<ActionResponse<string>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  // T-043 — meme garde que la facture : un devis a ligne vide produit le meme
  // PDF bancal, et il se convertit en facture definitive. Controle sur les
  // lignes SOUMISES : la deduction Lab et les contre-lignes du geste commercial
  // sont negatives, donc jamais signalees.
  if (options.allowZeroAmountLines !== true) {
    const zeroLines = findZeroAmountLines(lineItems)
    if (zeroLines.length > 0) {
      return {
        data: null,
        error: {
          message: `${describeZeroAmountLines(zeroLines, 'ce devis')}. Retire ces lignes, ou confirme qu'elles sont voulues.`,
          code: 'ZERO_AMOUNT_LINE',
          details: { zeroLines },
        },
      }
    }
  }

  // Récupérer le client pour obtenir pennylane_customer_id et auth_user_id
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, company, email, auth_user_id, pennylane_customer_id, lab_paid')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return {
      data: null,
      error: { message: 'Client introuvable', code: 'CLIENT_NOT_FOUND', details: clientError },
    }
  }

  let pennylaneCustomerId = client.pennylane_customer_id as string | null

  // ID corrompu ('undefined', non-numérique) → re-création automatique
  if (pennylaneCustomerId && isNaN(parseInt(pennylaneCustomerId, 10))) {
    await supabase.from('clients').update({ pennylane_customer_id: null }).eq('id', clientId)
    pennylaneCustomerId = null
  }

  // Story G — Auto-créer le compte Pennylane si absent
  if (!pennylaneCustomerId) {
    const clientEmail = client.email as string | null
    if (!clientEmail) {
      return {
        data: null,
        error: { message: 'Email client manquant — impossible de créer le compte Pennylane', code: 'MISSING_EMAIL' },
      }
    }
    // T-035 — passe par la brique commune : elle reprend l'adresse de facturation
    // de la fiche client (remplie par le SIRET) et enregistre l'identifiant en base.
    // Le bloc inline d'avant envoyait toujours une adresse vide.
    const customerResult = await createPennylaneCustomer(
      clientId,
      (client.company as string | null) ?? (client.name as string),
      clientEmail,
    )
    if (customerResult.error || !customerResult.data) {
      return { data: null, error: customerResult.error ?? { message: 'Échec création Pennylane', code: 'PENNYLANE_ERROR' } }
    }
    pennylaneCustomerId = customerResult.data
  }

  // Deadline = aujourd'hui + 30 jours
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 30)
  const deadlineStr = deadline.toISOString().split('T')[0]

  // T-037 — gestes commerciaux (lignes offertes + remise globale), identiques a
  // ceux de la facture : « c'est censé etre le prolongement de la facture »
  // (MiKL, 06-10). Meme brique, pas de logique recopiee.
  const gesture = applyCommercialGesture(lineItems, {
    targetTotalHt: options.targetTotalHt,
    label: options.gestureLabel,
  })
  if (gesture.error || !gesture.data) {
    return { data: null, error: gesture.error ?? { message: 'Geste commercial invalide', code: 'VALIDATION_ERROR' } }
  }
  const gesturedLineItems = gesture.data.lineItems

  // Story 11.6 — Déduction forfait Lab si applicable.
  // Elle s applique APRES le geste commercial : c est un du contractuel (les
  // 199 € deja payes), pas une remise — les deux se cumulent donc, et la
  // deduction porte sur le prix reellement du, pas sur le tarif catalogue.
  const clientLabPaid = client.lab_paid as boolean | null
  const applyLabDeduction = options.labDeduction === true && clientLabPaid === true

  // Calcul déduction plafonnée (AC#3: si setup < 199€, net = 0€, pas de remboursement)
  const setupTotalHt = gesture.data.finalTotalHt
  const cappedDeduction = Math.min(199, setupTotalHt)

  const allLineItems = applyLabDeduction && cappedDeduction > 0
    ? [
        ...gesturedLineItems,
        {
          label: 'Déduction forfait Lab MonprojetPro',
          description: 'Le forfait Lab (199€) est déduit du setup One, comme convenu.',
          quantity: 1,
          unitPrice: -cappedDeduction,
          vatRate: 'FR_200',
          unit: 'piece',
          total: -cappedDeduction,
        },
      ]
    : gesturedLineItems

  // Mapping LineItems → PennylaneLineItems
  const pennylaneLineItems = allLineItems.map(toPennylaneLineItem)

  const today = new Date().toISOString().split('T')[0]

  // V2 API : pas de wrapper, invoice_lines au lieu de line_items, date obligatoire
  // Les devis sont créés en status "pending" par défaut — pas besoin de finalize
  const quoteResult = await pennylaneClient.post<PennylaneQuote>('/quotes', {
    customer_id: parseInt(pennylaneCustomerId, 10),
    date: today,
    deadline: deadlineStr,
    invoice_lines: pennylaneLineItems,
    pdf_invoice_free_text: applyLabDeduction
      ? `${options.publicNotes ?? ''} [LAB_DEDUCTION:19900]`.trim()
      : (options.publicNotes ?? null),
  })

  if (quoteResult.error) return { data: null, error: quoteResult.error }
  if (!quoteResult.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  // V2 : réponse directe (pas de { quote: ... } wrapper)
  const createdQuote = quoteResult.data

  // Notification in-app pour le client
  const clientAuthUserId = client.auth_user_id as string | null
  if (clientAuthUserId) {
    const totalTtc = (createdQuote.amount ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
    const { error: notifError } = await supabase.from('notifications').insert({
      type: 'payment',
      title: `Nouveau devis de MiKL — ${totalTtc}`,
      body: options.publicNotes ?? null,
      recipient_type: 'client',
      recipient_id: clientAuthUserId,
      link: '/modules/facturation',
    })
    if (notifError) {
      console.warn('[FACTURATION:CREATE_QUOTE] Notification insert failed:', notifError)
    }
  }

  // Story 13.4 — Persist quote metadata (quote_type, idempotence anchor for webhook)
  if (options.quoteType) {
    const totalHtNumeric = Number(createdQuote.currency_amount_before_tax ?? 0) || setupTotalHt
    const { error: metadataError } = await supabase.from('quote_metadata').insert({
      pennylane_quote_id: String(createdQuote.id),
      client_id: clientId,
      quote_type: options.quoteType,
      total_amount_ht: totalHtNumeric,
    })
    if (metadataError) {
      // Non-bloquant : le devis est deja cree cote Pennylane. On log et on alerte.
      console.error('[FACTURATION:CREATE_QUOTE] quote_metadata insert failed:', metadataError)
    }
  }

  // Patch 2026-04-15 — INSERT direct dans billing_sync pour visibilite immediate
  // dans la liste des devis du Hub. L Edge Function billing-sync (cron) ne sync que
  // les invoices/customers cote Pennylane et de toute facon n etait pas deployee :
  // les devis n apparaissaient JAMAIS dans le Hub. Fix : on miroir le devis
  // immediatement a la creation pour que la liste se rafraichisse sans Edge Function.
  const amountCents = Math.round(parseFloat(String(createdQuote.amount ?? '0')) * 100)
  const { error: billingSyncError } = await supabase.from('billing_sync').upsert(
    {
      entity_type: 'quote',
      pennylane_id: String(createdQuote.id),
      client_id: clientId,
      status: createdQuote.status ?? 'draft',
      data: {
        ...(createdQuote as unknown as Record<string, unknown>),
        original_line_items: allLineItems,
      },
      amount: Number.isFinite(amountCents) ? amountCents : null,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: 'entity_type,pennylane_id' }
  )
  if (billingSyncError) {
    console.warn('[FACTURATION:CREATE_QUOTE] billing_sync upsert failed:', billingSyncError)
  }

  // Sync Edge Function (best effort, ne bloque pas si non deployee)
  try {
    await triggerBillingSync(clientId)
  } catch (syncErr) {
    console.warn('[FACTURATION:CREATE_QUOTE] triggerBillingSync skipped:', syncErr)
  }

  // Patch 2026-04-15 — Si sendNow=true, declencher l envoi par email cote Pennylane
  // Le helper sendByEmailWithRetry retry jusqu a 5x avec delai croissant pour
  // gerer le 409 PDF_NOT_READY (Pennylane prend ~5s a generer le PDF).
  let emailSent = false
  if (options.sendNow === true) {
    const sendResult = await sendByEmailWithRetry(String(createdQuote.id))
    if (sendResult.sent) {
      emailSent = true
      // Tracer sent_at dans quote_metadata pour le workflow de modification
      const { error: sentAtError } = await supabase
        .from('quote_metadata')
        .update({ sent_at: new Date().toISOString() })
        .eq('pennylane_quote_id', String(createdQuote.id))
      if (sentAtError) {
        console.warn('[FACTURATION:CREATE_QUOTE] quote_metadata.sent_at update failed:', sentAtError)
      }
    } else {
      console.warn(
        `[FACTURATION:CREATE_QUOTE] send_by_email failed apres ${sendResult.attempts} tentatives:`,
        sendResult.lastError
      )
    }
  }

  // Activity log
  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'quote_created',
    entity_type: 'quote',
    metadata: {
      pennylane_quote_id: createdQuote.id,
      quote_number: createdQuote.quote_number,
      client_id: clientId,
      quote_type: options.quoteType ?? null,
      send_now: options.sendNow ?? false,
      email_sent: emailSent,
    },
  })
  if (logError) {
    console.warn('[FACTURATION:CREATE_QUOTE] Activity log insert failed:', logError)
  }

  return { data: String(createdQuote.id), error: null }
}
