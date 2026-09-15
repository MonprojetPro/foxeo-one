'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import type {
  ContactMessage,
  ContactStatus,
  ContactThread,
  ContactAttachmentUploadTicket,
} from '../types'

/** Réponse du guichet au renouvellement d'une URL de pièce jointe. */
interface RefreshedAttachmentUrl {
  url: string
  expires_at: string
}

function toError(err: unknown): ActionResponse<never> {
  if (err instanceof MenuFacileAdminError) {
    return errorResponse(err.message, `MENUFACILE_HTTP_${err.status}`)
  }
  return errorResponse(
    err instanceof Error ? err.message : 'Erreur inconnue sur les messages de contact',
    'MENUFACILE_UNKNOWN',
  )
}

/** GET /contact-messages?status= — liste des messages Aide & Contact. */
export async function getContactMessages(
  status?: ContactStatus,
): Promise<ActionResponse<ContactMessage[]>> {
  try {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    const data = await callMenuFacileAdmin<ContactMessage[]>(`/contact-messages${qs}`)
    return successResponse(data ?? [])
  } catch (err) {
    return toError(err)
  }
}

/**
 * DELETE /contact-messages/:id — retire le message de la boîte Hub (masquage
 * côté Hub uniquement ; l'utilisateur conserve sa copie).
 */
export async function deleteContactMessage(id: string): Promise<ActionResponse<true>> {
  try {
    await callMenuFacileAdmin(`/contact-messages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    return successResponse(true)
  } catch (err) {
    return toError(err)
  }
}

/** GET /contact-messages/:id — fil complet (message initial + réponses). */
export async function getContactThread(id: string): Promise<ActionResponse<ContactThread>> {
  try {
    const data = await callMenuFacileAdmin<ContactThread>(
      `/contact-messages/${encodeURIComponent(id)}`,
    )
    return successResponse(data)
  } catch (err) {
    return toError(err)
  }
}

/**
 * GET /contact-messages/:id/attachments/:attachmentId/url — renouvelle l'URL
 * signée d'une pièce jointe.
 *
 * Les URL rendues avec le fil expirent au bout d'une heure. Sans ce renouvellement,
 * un fil resté ouvert (ou rouvert depuis le cache React Query) afficherait des
 * images cassées, et MiKL croirait la pièce jointe perdue.
 */
export async function refreshContactAttachmentUrl(input: {
  threadId: string
  attachmentId: string
}): Promise<ActionResponse<RefreshedAttachmentUrl>> {
  try {
    const data = await callMenuFacileAdmin<RefreshedAttachmentUrl>(
      `/contact-messages/${encodeURIComponent(input.threadId)}/attachments/${encodeURIComponent(
        input.attachmentId,
      )}/url`,
    )
    return successResponse(data)
  } catch (err) {
    return toError(err)
  }
}

/** POST /contact-messages/resolve — change le statut d'un message. */
export async function resolveContactMessage(input: {
  id: string
  status: ContactStatus
}): Promise<ActionResponse<true>> {
  try {
    await callMenuFacileAdmin('/contact-messages/resolve', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return successResponse(true)
  } catch (err) {
    return toError(err)
  }
}

/**
 * POST /contact-messages/:id/attachments/upload-url — demande l'autorisation de
 * déposer un fichier dans le dossier Storage du destinataire (guichet v16).
 *
 * Ne dépose RIEN : rend seulement une URL signée que le navigateur utilisera
 * ensuite en direct. C'est ce qui permet de dépasser la limite de taille des
 * Server Actions — le fichier ne passe jamais par notre serveur.
 *
 * Refus possibles, tous explicites côté guichet : 415 (type), 413 (poids),
 * 404 (fil inexistant), 409 (fil sans destinataire — cas réel des fils créés
 * avant que MenuFacile exige un compte : ils ont `user_id` NULL, donc aucun
 * dossier où déposer).
 */
export async function createContactAttachmentUploadUrl(input: {
  threadId: string
  fileName: string
  mimeType: string
  sizeBytes: number
}): Promise<ActionResponse<ContactAttachmentUploadTicket>> {
  try {
    const data = await callMenuFacileAdmin<ContactAttachmentUploadTicket>(
      `/contact-messages/${encodeURIComponent(input.threadId)}/attachments/upload-url`,
      {
        method: 'POST',
        body: JSON.stringify({
          file_name: input.fileName,
          mime_type: input.mimeType,
          size_bytes: input.sizeBytes,
        }),
      },
    )
    return successResponse(data)
  } catch (err) {
    return toError(err)
  }
}

/**
 * POST /contact-messages/:id/reply — envoie une réponse in-app à l'utilisateur
 * (v7). La réponse arrive en temps réel dans son app ; le fil repasse en `read`.
 *
 * `attachmentIds` (v16) cite des pièces DÉJÀ déposées. Le guichet refuse en 409
 * une pièce citée mais jamais uploadée, plutôt que d'envoyer une réponse
 * amputée — on ne peut donc pas se retrouver avec un message qui promet une
 * capture absente.
 *
 * Depuis v16, `body` peut être vide À CONDITION qu'une pièce jointe
 * l'accompagne : envoyer une capture seule est un usage normal. Vide des deux
 * côtés reste un refus.
 */
export async function replyToContactMessage(input: {
  id: string
  body: string
  attachmentIds?: string[]
}): Promise<ActionResponse<true>> {
  try {
    await callMenuFacileAdmin(`/contact-messages/${encodeURIComponent(input.id)}/reply`, {
      method: 'POST',
      body: JSON.stringify(
        // On n'envoie `attachment_ids` que s'il y en a : garder l'appel
        // identique à celui d'avant v16 quand il n'y a pas de fichier.
        input.attachmentIds?.length
          ? { body: input.body, attachment_ids: input.attachmentIds }
          : { body: input.body },
      ),
    })
    return successResponse(true)
  } catch (err) {
    return toError(err)
  }
}
