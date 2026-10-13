'use server'

import { createMeeting } from '@monprojetpro/module-visio'
import { getGoogleMeetClient } from '../lib/google-meet-client'
import { type ActionResponse, errorResponse } from '@monprojetpro/types'
import type { Meeting } from '@monprojetpro/module-visio'

export async function createHubMeeting(input: {
  clientId: string
  operatorId: string
  title: string
  description?: string
  scheduledAt?: string
}): Promise<ActionResponse<Meeting>> {
  try {
    const meetClient = getGoogleMeetClient()
    const spaceRes = await meetClient.spaces.create({
      requestBody: {
        config: {
          accessType: 'TRUSTED',
        },
      },
    })

    const meetSpaceName = spaceRes.data.name ?? undefined
    const meetUri = spaceRes.data.meetingUri ?? undefined

    if (!meetUri) {
      console.error('[HUB:CREATE_HUB_MEETING] Google Meet a répondu sans meetingUri')
      return errorResponse(
        "Google Meet n'a pas renvoyé de lien de visio. Le rendez-vous n'a pas été créé — réessaie.",
        'GOOGLE_MEET_ERROR'
      )
    }

    return createMeeting({ ...input, meetSpaceName, meetUri })
  } catch (err) {
    console.error('[HUB:CREATE_HUB_MEETING] Google Meet API error:', err)
    // ⛔ PAS DE REPLI SILENCIEUX. Cette fonction créait auparavant le meeting
    // SANS lien Meet en cas d'échec Google, sans rien afficher : MiKL croyait
    // avoir planifié un rendez-vous joignable qui ne l'était pas, et le client
    // ne voyait aucun bouton « Rejoindre » (le bouton est conditionné à
    // `meetUri`). Un rendez-vous sans lien n'est pas un rendez-vous dégradé,
    // c'est une coquille vide — on remonte l'échec.
    return errorResponse(
      "Impossible de créer la salle Google Meet — la connexion Google est peut-être à renouveler. Le rendez-vous n'a pas été créé.",
      'GOOGLE_MEET_ERROR',
      err instanceof Error ? err.message : err
    )
  }
}
