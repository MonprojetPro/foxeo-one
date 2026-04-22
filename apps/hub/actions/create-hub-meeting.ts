'use server'

import { createMeeting } from '@monprojetpro/module-visio'
import { getGoogleMeetClient } from '../lib/google-meet-client'
import type { ActionResponse } from '@monprojetpro/types'
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

    return createMeeting({ ...input, meetSpaceName, meetUri })
  } catch (err) {
    console.error('[HUB:CREATE_HUB_MEETING] Google Meet API error:', err)
    // Fallback : créer le meeting sans lien Meet (non-bloquant)
    return createMeeting(input)
  }
}
