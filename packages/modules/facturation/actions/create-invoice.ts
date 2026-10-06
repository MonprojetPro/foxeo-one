'use server'

import { pennylaneClient } from '../config/pennylane'
import { toPennylaneLineItem } from '../utils/billing-mappers'
import { applyCommercialGesture } from '../utils/commercial-gesture'
import { sendByEmailWithRetry } from '../utils/send-by-email-with-retry'
import { triggerBillingSync } from './trigger-billing-sync'
import { assertOperator } from './assert-operator'
import { createPennylaneCustomer } from './billing-proxy'
import type { ActionResponse } from '@monprojetpro/types'
import type { LineItem, CreateInvoiceOptions } from '../types/billing.types'

// ============================================================
// createInvoice — emet une facture directe, sans passer par un devis
//
// T-036 — il n existait aucun chemin pour facturer une prestation PONCTUELLE
// DEJA EFFECTUEE : le seul moyen etait de fabriquer un devis puis de le
// convertir, ce qui est un contresens metier (on ne devise pas ce qui est
// livre) et laisse un devis fantome dans la comptabilite.
//
// Ecrit sur le modele V2 de sendLabInvoice — la seule emission de facture qui
// ait reellement tourne contre l API : corps PLAT (pas de wrapper
// `customer_invoice`), `invoice_lines` (pas `line_items`), `date` obligatoire,
// `customer_id` en entier.
// ============================================================

// Helper local, volontairement NON exporte : dans un fichier 'use server',
// tout export doit etre une fonction async — un export synchrone casse le build.
function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return false
  // Rejette les dates qui « roulent » (2026-02-31 → 2026-03-03)
  return parsed.toISOString().split('T')[0] === value
}

export type CreateInvoiceResult = {
  /** Identifiant Pennylane de la facture creee */
  pennylaneInvoiceId: string
  /** Numero de facture attribue par Pennylane (sequentiel, immuable) */
  invoiceNumber: string | null
  /** true si l email est reellement parti (retry inclus) */
  emailSent: boolean
  /** Total HT reellement du, apres gestes commerciaux */
  totalHt: number
  /** T-037 — total HT au tarif catalogue, avant tout geste */
  catalogTotalHt: number
  /** T-037 — valeur HT offerte (lignes offertes + remise globale) */
  totalGrantedHt: number
  /** T-037 — economie en pourcentage du tarif catalogue */
  savingsPercentage: number
}

export async function createInvoice(
  clientId: string,
  lineItems: LineItem[],
  options: CreateInvoiceOptions = {}
): Promise<ActionResponse<CreateInvoiceResult>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  if (!clientId) {
    return { data: null, error: { message: 'Client requis', code: 'VALIDATION_ERROR' } }
  }
  if (!lineItems || lineItems.length === 0) {
    return { data: null, error: { message: 'Au moins une ligne de facturation est requise', code: 'VALIDATION_ERROR' } }
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, company, email, auth_user_id, pennylane_customer_id')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return {
      data: null,
      error: { message: 'Client introuvable', code: 'CLIENT_NOT_FOUND', details: clientError },
    }
  }

  let pennylaneCustomerId = client.pennylane_customer_id as string | null

  // ID corrompu ('undefined', non-numerique) → traite comme absent, re-creation
  if (pennylaneCustomerId && isNaN(parseInt(pennylaneCustomerId, 10))) {
    console.warn(
      `[FACTURATION:CREATE_INVOICE] pennylane_customer_id corrompu ("${pennylaneCustomerId}") pour client ${clientId} — re-creation`
    )
    await supabase.from('clients').update({ pennylane_customer_id: null }).eq('id', clientId)
    pennylaneCustomerId = null
  }

  // Auto-creation du compte Pennylane si absent (meme logique que create-quote /
  // create-subscription / send-lab-invoice). La brique reprend l adresse de
  // facturation de la fiche client, remplie par le rapprochement SIRET.
  if (!pennylaneCustomerId) {
    const clientEmail = client.email as string | null
    if (!clientEmail) {
      return {
        data: null,
        error: { message: 'Email client manquant — impossible de créer le compte Pennylane', code: 'MISSING_EMAIL' },
      }
    }
    const customerResult = await createPennylaneCustomer(
      clientId,
      (client.company as string | null) ?? (client.name as string),
      clientEmail,
    )
    if (customerResult.error || !customerResult.data) {
      return {
        data: null,
        error: customerResult.error ?? { message: 'Échec création du compte Pennylane', code: 'PENNYLANE_ERROR' },
      }
    }
    pennylaneCustomerId = customerResult.data
  }

  // Dates — la date d emission par defaut est aujourd hui. Pennylane impose une
  // numerotation sequentielle : une date anterieure a la derniere facture emise
  // peut etre refusee par l API, on ne la force donc jamais en douce.
  //
  // Les dates sont VALIDEES ici et pas seulement dans le formulaire : cette
  // action est exportee et appelable ailleurs (outils Elio Hub, scripts). Sans
  // cette garde, une date mal formee faisait lever une RangeError par
  // toISOString() — donc un `throw` dans une Server Action, ce que le contrat
  // { data, error } interdit.
  const date = options.date ?? new Date().toISOString().split('T')[0]
  if (!isIsoDate(date)) {
    return {
      data: null,
      error: { message: `Date d'émission invalide (attendu AAAA-MM-JJ) : ${date}`, code: 'VALIDATION_ERROR' },
    }
  }

  let deadlineStr = options.deadline
  if (deadlineStr) {
    if (!isIsoDate(deadlineStr)) {
      return {
        data: null,
        error: { message: `Échéance invalide (attendu AAAA-MM-JJ) : ${deadlineStr}`, code: 'VALIDATION_ERROR' },
      }
    }
    if (deadlineStr < date) {
      return {
        data: null,
        error: {
          message: "L'échéance de paiement ne peut pas précéder la date d'émission",
          code: 'VALIDATION_ERROR',
        },
      }
    }
  } else {
    const deadline = new Date(`${date}T00:00:00Z`)
    deadline.setDate(deadline.getDate() + 30)
    deadlineStr = deadline.toISOString().split('T')[0]
  }

  // T-037 — gestes commerciaux (lignes offertes + remise globale) appliques AVANT
  // l envoi. La brique pose les contre-lignes ; le tarif catalogue reste visible.
  const gesture = applyCommercialGesture(lineItems, {
    targetTotalHt: options.targetTotalHt,
    label: options.gestureLabel,
  })
  if (gesture.error || !gesture.data) {
    return { data: null, error: gesture.error ?? { message: 'Geste commercial invalide', code: 'VALIDATION_ERROR' } }
  }

  const finalLines = gesture.data.lineItems
  const totalHt = gesture.data.finalTotalHt

  // POST /customer_invoices — V2 : corps plat, invoice_lines, date obligatoire
  const invoiceResult = await pennylaneClient.post<Record<string, unknown>>('/customer_invoices', {
    customer_id: parseInt(pennylaneCustomerId, 10),
    date,
    deadline: deadlineStr,
    invoice_lines: finalLines.map(toPennylaneLineItem),
    pdf_invoice_free_text: options.publicNotes ?? null,
  })

  if (invoiceResult.error) {
    console.error('[FACTURATION:CREATE_INVOICE] Pennylane error details:', invoiceResult.error.details)
    return { data: null, error: invoiceResult.error }
  }
  if (!invoiceResult.data) {
    return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }
  }

  // V2 : reponse soit plate { id }, soit wrappee { customer_invoice: { id } }
  const rawInvoice = invoiceResult.data
  const createdInvoice =
    (rawInvoice.customer_invoice as Record<string, unknown> | undefined) ?? rawInvoice

  if (createdInvoice.id == null) {
    return {
      data: null,
      error: { message: 'Identifiant Pennylane absent de la réponse', code: 'INVALID_RESPONSE', details: rawInvoice },
    }
  }

  const pennylaneInvoiceId = String(createdInvoice.id)
  const invoiceNumber = (createdInvoice.invoice_number as string | null | undefined) ?? null

  // Miroir immediat dans billing_sync — meme raison que pour les devis
  // (create-quote.ts:152-156) : la liste du Hub doit se rafraichir sans attendre
  // le cron billing-sync, qui peut ne pas tourner.
  const amountRaw = createdInvoice.amount
  const amountCents =
    amountRaw != null ? Math.round(parseFloat(String(amountRaw)) * 100) : Math.round(totalHt * 100)

  const { error: billingSyncError } = await supabase.from('billing_sync').upsert(
    {
      entity_type: 'invoice',
      pennylane_id: pennylaneInvoiceId,
      client_id: clientId,
      status: (createdInvoice.status as string | undefined) ?? 'pending',
      data: {
        ...createdInvoice,
        // `original_line_items` porte les lignes REELLEMENT ENVOYEES, contre-lignes
        // comprises — c est ce que lit le repli de convertQuoteToInvoice, qui ne
        // repasse pas par le geste commercial et doublerait donc la remise.
        original_line_items: finalLines,
        // Les lignes telles que saisies sont gardees a part : seule trace de
        // l intention (quelle prestation a ete offerte, et pas juste « -2200 »).
        submitted_line_items: lineItems,
        commercial_gesture: {
          catalog_total_ht: gesture.data.catalogTotalHt,
          offered_total_ht: gesture.data.offeredTotalHt,
          discount_ht: gesture.data.discountHt,
          final_total_ht: gesture.data.finalTotalHt,
          savings_percentage: gesture.data.savingsPercentage,
          label: options.gestureLabel ?? null,
        },
        created_from: 'hub_direct_invoice',
      },
      amount: Number.isFinite(amountCents) ? amountCents : null,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: 'entity_type,pennylane_id' }
  )
  if (billingSyncError) {
    console.warn('[FACTURATION:CREATE_INVOICE] billing_sync upsert failed:', billingSyncError)
  }

  // Envoi email via Pennylane, avec retry sur le 409 PDF_NOT_READY
  let emailSent = false
  if (options.sendNow === true) {
    const sendResult = await sendByEmailWithRetry(pennylaneInvoiceId, 'customer_invoices')
    emailSent = sendResult.sent
    if (!sendResult.sent) {
      console.warn(
        `[FACTURATION:CREATE_INVOICE] send_by_email echoue apres ${sendResult.attempts} tentatives:`,
        sendResult.lastError
      )
    }
  }

  // Notification in-app pour le client — recipient_id = auth_user_id (jamais clients.id)
  const clientAuthUserId = client.auth_user_id as string | null
  if (clientAuthUserId) {
    const totalLabel = (
      amountRaw != null ? parseFloat(String(amountRaw)) : totalHt
    ).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

    const { error: notifError } = await supabase.from('notifications').insert({
      type: 'payment',
      title: `Nouvelle facture de MiKL — ${totalLabel}`,
      body: options.publicNotes ?? null,
      recipient_type: 'client',
      recipient_id: clientAuthUserId,
      link: '/modules/facturation',
    })
    if (notifError) {
      console.warn('[FACTURATION:CREATE_INVOICE] Notification insert failed:', notifError)
    }
  }

  // Sync Edge Function (best effort — ne bloque pas si non deployee)
  try {
    await triggerBillingSync(clientId)
  } catch (syncErr) {
    console.warn('[FACTURATION:CREATE_INVOICE] triggerBillingSync skipped:', syncErr)
  }

  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'invoice_created',
    entity_type: 'invoice',
    metadata: {
      pennylane_invoice_id: pennylaneInvoiceId,
      invoice_number: invoiceNumber,
      client_id: clientId,
      total_ht: totalHt,
      catalog_total_ht: gesture.data.catalogTotalHt,
      offered_total_ht: gesture.data.offeredTotalHt,
      discount_ht: gesture.data.discountHt,
      date,
      deadline: deadlineStr,
      send_now: options.sendNow ?? false,
      email_sent: emailSent,
    },
  })
  if (logError) {
    console.warn('[FACTURATION:CREATE_INVOICE] Activity log insert failed:', logError)
  }

  return {
    data: {
      pennylaneInvoiceId,
      invoiceNumber,
      emailSent,
      totalHt,
      catalogTotalHt: gesture.data.catalogTotalHt,
      totalGrantedHt: Math.round((gesture.data.offeredTotalHt + gesture.data.discountHt) * 100) / 100,
      savingsPercentage: gesture.data.savingsPercentage,
    },
    error: null,
  }
}
