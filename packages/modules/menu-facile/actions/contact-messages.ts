'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import type { ContactMessage, ContactStatus } from '../types'

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
