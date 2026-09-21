'use server'

import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { callMenuFacileAdmin, MenuFacileAdminError } from './admin-client'
import type {
  MenuFacileNotification,
  MenuFacileNotificationInput,
  NotificationAudienceCount,
} from '../types'

/**
 * Notifications in-app de l'appli MenuFacile (T-033).
 *
 * Contrat arrêté avec la session MenuFacile le 2026-09-21, APRÈS état des lieux
 * de leur dépôt — pas supposé : il n'existait aucun système de notification
 * réutilisable, et le push est hors de portée (PWA sans jeton d'appareil).
 *
 * Tout passe par `callMenuFacileAdmin` : le secret reste serveur.
 */

function toError(err: unknown): ActionResponse<never> {
  if (err instanceof MenuFacileAdminError) {
    return errorResponse(err.message, `MENUFACILE_HTTP_${err.status}`)
  }
  return errorResponse(
    err instanceof Error ? err.message : 'Erreur inconnue sur les notifications',
    'MENUFACILE_UNKNOWN',
  )
}

// Limites du contrat guichet — mêmes valeurs que la validation côté MenuFacile.
const MAX_TITLE = 120
const MAX_BODY = 2000

/** GET /notifications — les 50 derniers envois, du plus récent au plus ancien. */
export async function getNotifications(): Promise<
  ActionResponse<MenuFacileNotification[]>
> {
  try {
    const data = await callMenuFacileAdmin<MenuFacileNotification[]>('/notifications')
    return successResponse(data ?? [])
  } catch (err) {
    return toError(err)
  }
}

/**
 * GET /notifications/audience-count — combien d'utilisateurs seraient touchés.
 *
 * Appelé AVANT l'envoi pour que la confirmation nomme un nombre réel. Un envoi
 * de masse sans compteur préalable est un envoi à l'aveugle, et une notification
 * partie à toute la base ne se rattrape pas.
 */
export async function getNotificationAudienceCount(): Promise<ActionResponse<number>> {
  try {
    const data = await callMenuFacileAdmin<NotificationAudienceCount>(
      '/notifications/audience-count?audience=all',
    )
    return successResponse(data?.count ?? 0)
  } catch (err) {
    return toError(err)
  }
}

/**
 * POST /notifications — crée et diffuse la notification.
 *
 * La validation est doublée ici (elle existe aussi côté guichet) pour que MiKL
 * ait un message immédiat au lieu d'un aller-retour réseau pour rien.
 */
export async function sendNotification(
  input: MenuFacileNotificationInput,
): Promise<ActionResponse<MenuFacileNotification>> {
  const title = input.title.trim()
  const body = input.body.trim()

  if (!title) {
    return errorResponse('Le titre est obligatoire.', 'VALIDATION_ERROR')
  }
  if (title.length > MAX_TITLE) {
    return errorResponse(`Le titre dépasse ${MAX_TITLE} caractères.`, 'VALIDATION_ERROR')
  }
  if (!body) {
    return errorResponse('Le message est obligatoire.', 'VALIDATION_ERROR')
  }
  if (body.length > MAX_BODY) {
    return errorResponse(`Le message dépasse ${MAX_BODY} caractères.`, 'VALIDATION_ERROR')
  }

  const link = input.link_url?.trim()

  try {
    const data = await callMenuFacileAdmin<MenuFacileNotification>('/notifications', {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        // Champ omis plutôt qu'envoyé vide : le guichet le traite comme absent.
        ...(link ? { link_url: link } : {}),
        audience: 'all',
        channel: 'in_app',
      }),
    })
    return successResponse(data)
  } catch (err) {
    return toError(err)
  }
}

/**
 * DELETE /notifications/:id — retire la notification de chez TOUS les
 * utilisateurs, y compris ceux qui l'ont déjà lue. Suppression réelle, pas un
 * masquage : c'est ce qui permet de rattraper une faute ou un mauvais lien.
 */
export async function deleteNotification(id: string): Promise<ActionResponse<true>> {
  if (!id) {
    return errorResponse('Identifiant de notification manquant.', 'VALIDATION_ERROR')
  }
  try {
    await callMenuFacileAdmin(`/notifications/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    return successResponse(true)
  } catch (err) {
    return toError(err)
  }
}
