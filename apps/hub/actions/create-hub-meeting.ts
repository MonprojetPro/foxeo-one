'use server'

import { createMeeting } from '@monprojetpro/module-visio'
import { createGoogleMeetSpace } from '../lib/google-meet-client'
import { describeGoogleMeetFailure } from '../lib/google-meet-error'
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
    const { meetSpaceName, meetUri } = await createGoogleMeetSpace()

    if (!meetUri) {
      console.error('[HUB:CREATE_HUB_MEETING] Google Meet a répondu sans meetingUri')
      return errorResponse(
        "Google Meet n'a pas renvoyé de lien de visio. Le rendez-vous n'a pas été créé — réessaie.",
        'GOOGLE_MEET_ERROR'
      )
    }

    return createMeeting({ ...input, meetSpaceName, meetUri })
  } catch (err) {
    // Même sonde que `sendMeetLink` (T-052) : les deux chemins qui créent une
    // salle doivent dire la MÊME chose, sinon l'un des deux reste aveugle —
    // c'est exactement le défaut de T-046, appliqué à un chemin et pas à l'autre.
    const failure = describeGoogleMeetFailure(err)
    console.error(`[HUB:CREATE_HUB_MEETING] Google Meet ${failure.kind}:`, failure.detail)
    // ⛔ PAS DE REPLI SILENCIEUX. Cette fonction créait auparavant le meeting
    // SANS lien Meet en cas d'échec Google, sans rien afficher : MiKL croyait
    // avoir planifié un rendez-vous joignable qui ne l'était pas, et le client
    // ne voyait aucun bouton « Rejoindre » (le bouton est conditionné à
    // `meetUri`). Un rendez-vous sans lien n'est pas un rendez-vous dégradé,
    // c'est une coquille vide — on remonte l'échec.
    return errorResponse(failure.message, 'GOOGLE_MEET_ERROR', {
      kind: failure.kind,
      detail: failure.detail,
    })
  }
}
