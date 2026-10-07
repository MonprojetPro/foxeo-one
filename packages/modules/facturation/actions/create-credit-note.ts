'use server'

import { z } from 'zod'
import { pennylaneClient } from '../config/pennylane'
import { toPennylaneLineItem } from '../utils/billing-mappers'
import { sendByEmailWithRetry } from '../utils/send-by-email-with-retry'
import { triggerBillingSync } from './trigger-billing-sync'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'
import type { LineItem } from '../types/billing.types'

// ============================================================
// createCreditNote — emet un AVOIR qui annule une facture.
//
// 🔴 REECRIT LE 2026-10-06 (T-041). L'action precedente etait ecrite en API V1
// — wrapper `{ customer_invoice: … }`, champs `currency_amount` et
// `linked_to_invoice_number` — alors que le client HTTP tape V2. Exactement la
// maladie de `convert-quote-to-invoice` (T-036). Elle n'etait en outre branchee
// sur AUCUN bouton : l'avoir existait dans le code et etait injoignable.
//
// 🔑 CE QUE DIT LA DOCUMENTATION PENNYLANE V2, verifie avant d'ecrire une ligne
// (changelog « Deprecation Credit Notes and Draft Invoices endpoints ») :
// les endpoints dedies aux avoirs sont SUPPRIMES. Un avoir se cree desormais
// par le meme `POST /customer_invoices` qu'une facture, avec des **montants
// negatifs**, et se rattache a sa facture d'origine par `credited_invoice_id`.
//
// ⚠️ `credited_invoice_id` n'apparait que dans le changelog, pas dans la page
// de reference de l'endpoint. Il est donc envoye avec un REPLI AUTOMATIQUE :
// si Pennylane le refuse, on reemet sans lui plutot que d'echouer — l'avoir
// reste comptablement valide, seul le lien machine est perdu, et la reference
// de la facture est de toute facon imprimee sur le document.
//
// POURQUOI L'AVOIR COMPTE : une facture finalisee ne se supprime pas
// (numerotation sequentielle, obligation legale). L'avoir est la SEULE facon
// de dire « celle-la est fausse, en voici une autre ».
// ============================================================

const CreateCreditNoteSchema = z.object({
  invoiceId: z.string().uuid('ID facture invalide'),
  reason: z.string().trim().min(1, 'Le motif est requis'),
  amount: z.number().positive('Le montant doit être positif').nullable().optional(),
})

export type CreateCreditNoteOptions = {
  /** Motif imprime sur l'avoir. Obligatoire — un avoir sans motif est inexploitable. */
  reason: string
  /**
   * Montant HT a crediter. Absent = AVOIR TOTAL : on reprend les lignes de la
   * facture d'origine et on les inverse, ce qui est ce qu'attend un comptable
   * (l'avoir doit refleter ce qu'il annule, pas une somme opaque).
   */
  amount?: number | null
  /** Envoyer l'avoir au client par email juste apres creation. Defaut : non. */
  sendNow?: boolean
}

export type CreateCreditNoteResult = {
  pennylaneCreditNoteId: string
  creditNoteNumber: string | null
  /** Montant HT reellement credite, en euros */
  amountHt: number
  /** true si l'avoir annule la totalite de la facture */
  isFullCredit: boolean
  /** false si Pennylane a refuse `credited_invoice_id` et qu'on a reemis sans */
  linkedToInvoice: boolean
  emailSent: boolean
}

export async function createCreditNote(
  invoiceId: string,
  options: CreateCreditNoteOptions
): Promise<ActionResponse<CreateCreditNoteResult>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  const parsed = CreateCreditNoteSchema.safeParse({
    invoiceId,
    reason: options.reason,
    amount: options.amount ?? null,
  })
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: parsed.error.issues[0]?.message ?? 'Données invalides',
        code: 'VALIDATION_ERROR',
        details: parsed.error.issues,
      },
    }
  }

  const reason = parsed.data.reason

  // ── 1. La facture d'origine ──────────────────────────────────────────────
  const { data: syncRow, error: syncError } = await supabase
    .from('billing_sync')
    .select('pennylane_id, client_id, amount, data')
    .eq('id', invoiceId)
    .eq('entity_type', 'invoice')
    .single()

  if (syncError || !syncRow) {
    return {
      data: null,
      error: { message: 'Facture introuvable', code: 'INVOICE_NOT_FOUND', details: syncError },
    }
  }

  const originalPennylaneId = syncRow.pennylane_id as string
  const invoiceData = (syncRow.data ?? {}) as Record<string, unknown>
  const invoiceNumber = (invoiceData.invoice_number as string | undefined) ?? originalPennylaneId

  const clientId = syncRow.client_id as string | null
  if (!clientId) {
    return {
      data: null,
      error: { message: 'Client introuvable pour cette facture', code: 'CLIENT_NOT_FOUND' },
    }
  }

  // ── 2. Garde anti-double-avoir ───────────────────────────────────────────
  // Crediter deux fois la meme facture creerait un avoir de trop, impossible a
  // retirer a son tour. On refuse AVANT tout appel a Pennylane.
  const { data: existing } = await supabase
    .from('billing_sync')
    .select('pennylane_id, data')
    .eq('entity_type', 'credit_note')
    .eq('client_id', clientId)

  const alreadyCredited = (existing ?? []).find(
    (row) =>
      ((row.data ?? {}) as Record<string, unknown>).credited_invoice_pennylane_id ===
      originalPennylaneId
  )
  if (alreadyCredited) {
    return {
      data: null,
      error: {
        message: `Cette facture a déjà un avoir (${alreadyCredited.pennylane_id}). Pour une correction supplémentaire, émets une nouvelle facture.`,
        code: 'ALREADY_CREDITED',
      },
    }
  }

  // ── 3. Le client Pennylane ───────────────────────────────────────────────
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('pennylane_customer_id, auth_user_id, name')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return {
      data: null,
      error: { message: 'Client introuvable', code: 'CLIENT_NOT_FOUND', details: clientError },
    }
  }

  const pennylaneCustomerId = client.pennylane_customer_id as string | null
  if (!pennylaneCustomerId || isNaN(parseInt(pennylaneCustomerId, 10))) {
    return {
      data: null,
      error: { message: 'Client sans compte Pennylane valide', code: 'NO_PENNYLANE_ID' },
    }
  }

  // ── 4. Les lignes de l'avoir ─────────────────────────────────────────────
  const invoiceAmountCents = (syncRow.amount as number | null) ?? 0
  const originalLines = (invoiceData.original_line_items as LineItem[] | undefined) ?? []
  const requestedAmount = parsed.data.amount ?? null

  let creditLines: LineItem[]
  let amountHt: number
  let isFullCredit: boolean

  if (requestedAmount == null) {
    // AVOIR TOTAL — on inverse les lignes d'origine. Un avoir doit refleter ce
    // qu'il annule : le comptable doit retrouver les memes libelles en face.
    if (originalLines.length === 0) {
      return {
        data: null,
        error: {
          message:
            "Les lignes de la facture d'origine sont introuvables — précise un montant pour émettre un avoir partiel",
          code: 'ORIGINAL_LINES_MISSING',
        },
      }
    }
    creditLines = originalLines.map((line) => ({
      ...line,
      unitPrice: -line.unitPrice,
      total: -(line.quantity * line.unitPrice),
      offered: undefined,
    }))
    amountHt = Math.round(originalLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100
    isFullCredit = true
  } else {
    // AVOIR PARTIEL — une seule ligne negative du montant demande.
    const amountCents = Math.round(requestedAmount * 100)
    if (invoiceAmountCents > 0 && amountCents > invoiceAmountCents) {
      return {
        data: null,
        error: {
          message: `Le montant de l'avoir (${requestedAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €) ne peut pas dépasser celui de la facture (${(invoiceAmountCents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €)`,
          code: 'AMOUNT_EXCEEDS_INVOICE',
        },
      }
    }
    const vatRate = originalLines[0]?.vatRate ?? 'FR_200'
    creditLines = [
      {
        label: `Avoir sur facture ${invoiceNumber}`,
        description: reason,
        quantity: 1,
        unit: 'u',
        unitPrice: -requestedAmount,
        vatRate,
        total: -requestedAmount,
      },
    ]
    amountHt = requestedAmount
    isFullCredit = false
  }

  // ── 5. Emission ──────────────────────────────────────────────────────────
  const date = new Date().toISOString().split('T')[0]

  // La reference de la facture est imprimee sur le document, et pas seulement
  // portee par `credited_invoice_id` : c'est ce que lira un humain, et c'est ce
  // qui survit si le lien machine est refuse par l'API.
  const freeText = `Avoir sur facture ${invoiceNumber} — ${reason}`

  const basePayload: Record<string, unknown> = {
    customer_id: parseInt(pennylaneCustomerId, 10),
    date,
    deadline: date,
    invoice_lines: creditLines.map(toPennylaneLineItem),
    pdf_invoice_free_text: freeText,
  }

  const linkedId = parseInt(originalPennylaneId, 10)
  let linkedToInvoice = !isNaN(linkedId)

  let result = await pennylaneClient.post<Record<string, unknown>>('/customer_invoices', {
    ...basePayload,
    ...(linkedToInvoice ? { credited_invoice_id: linkedId } : {}),
  })

  // Repli : si Pennylane refuse le rattachement, on reemet sans lui plutot que
  // d'echouer. L'avoir reste valide, seul le lien machine est perdu.
  //
  // T-041a — le repli n'ecoutait que le 422 annonce par la documentation. Le
  // premier avoir reel a echoue en **400**, donc il n'a pas joue et MiKL s'est
  // retrouve avec un refus sec. Les deux codes sont desormais couverts : un
  // champ inconnu se refuse indifferemment en 400 ou en 422 selon l'endpoint.
  const REJECTED_FIELD_CODES = ['PENNYLANE_400', 'PENNYLANE_422']
  if (result.error && linkedToInvoice && REJECTED_FIELD_CODES.includes(result.error.code)) {
    console.warn(
      '[FACTURATION:CREDIT_NOTE] credited_invoice_id refuse par Pennylane, nouvel essai sans :',
      result.error.details
    )
    linkedToInvoice = false
    result = await pennylaneClient.post<Record<string, unknown>>('/customer_invoices', basePayload)
  }

  if (result.error) {
    console.error('[FACTURATION:CREDIT_NOTE] Pennylane error details:', result.error.details)
    return { data: null, error: result.error }
  }
  if (!result.data) {
    return { data: null, error: { message: 'Aucune donnée retournée', code: 'EMPTY_RESPONSE' } }
  }

  const raw = result.data
  const created = (raw.customer_invoice as Record<string, unknown> | undefined) ?? raw

  if (created.id == null) {
    return {
      data: null,
      error: { message: 'Identifiant Pennylane absent de la réponse', code: 'INVALID_RESPONSE', details: raw },
    }
  }

  const creditNoteId = String(created.id)
  const creditNoteNumber = (created.invoice_number as string | null | undefined) ?? null

  // ── 6. Miroir billing_sync ───────────────────────────────────────────────
  // Absent de l'ancienne version : l'avoir n'apparaissait nulle part dans le Hub.
  // C'est aussi cette ligne que relit la garde anti-double-avoir.
  const { error: mirrorError } = await supabase.from('billing_sync').upsert(
    {
      entity_type: 'credit_note',
      pennylane_id: creditNoteId,
      client_id: clientId,
      status: (created.status as string | undefined) ?? 'credit_note',
      amount: -Math.round(amountHt * 100),
      data: {
        ...created,
        credited_invoice_pennylane_id: originalPennylaneId,
        credited_invoice_number: invoiceNumber,
        reason,
        is_full_credit: isFullCredit,
        linked_to_invoice: linkedToInvoice,
        original_line_items: creditLines,
      },
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: 'entity_type,pennylane_id' }
  )
  if (mirrorError) {
    console.warn('[FACTURATION:CREDIT_NOTE] billing_sync upsert failed:', mirrorError)
  }

  // ── 7. Envoi, notification, journal ──────────────────────────────────────
  let emailSent = false
  if (options.sendNow === true) {
    const sendResult = await sendByEmailWithRetry(creditNoteId, 'customer_invoices')
    emailSent = sendResult.sent
    if (!sendResult.sent) {
      console.warn(
        `[FACTURATION:CREDIT_NOTE] send_by_email echoue apres ${sendResult.attempts} tentatives:`,
        sendResult.lastError
      )
    }
  }

  const clientAuthUserId = client.auth_user_id as string | null
  if (clientAuthUserId) {
    const formatted = amountHt.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
    const { error: notifError } = await supabase.from('notifications').insert({
      type: 'payment',
      title: `Avoir de ${formatted} sur la facture ${invoiceNumber}`,
      body: reason,
      recipient_type: 'client',
      recipient_id: clientAuthUserId,
      link: '/modules/facturation',
    })
    if (notifError) {
      console.warn('[FACTURATION:CREDIT_NOTE] Notification insert failed:', notifError)
    }
  }

  try {
    await triggerBillingSync(clientId)
  } catch (syncErr) {
    console.warn('[FACTURATION:CREDIT_NOTE] triggerBillingSync skipped:', syncErr)
  }

  const { error: logError } = await supabase.from('activity_logs').insert({
    actor_type: 'operator',
    actor_id: userId,
    action: 'credit_note_created',
    entity_type: 'invoice',
    metadata: {
      pennylane_credit_note_id: creditNoteId,
      credit_note_number: creditNoteNumber,
      original_invoice_pennylane_id: originalPennylaneId,
      original_invoice_number: invoiceNumber,
      client_id: clientId,
      amount_ht: amountHt,
      is_full_credit: isFullCredit,
      linked_to_invoice: linkedToInvoice,
      reason,
      email_sent: emailSent,
    },
  })
  if (logError) {
    console.warn('[FACTURATION:CREDIT_NOTE] Activity log insert failed:', logError)
  }

  return {
    data: {
      pennylaneCreditNoteId: creditNoteId,
      creditNoteNumber,
      amountHt,
      isFullCredit,
      linkedToInvoice,
      emailSent,
    },
    error: null,
  }
}
