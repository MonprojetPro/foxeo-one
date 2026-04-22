'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { endMeeting } from '@monprojetpro/module-visio'
import { getGoogleMeetClient } from '../lib/google-meet-client'
import type { ActionResponse } from '@monprojetpro/types'
import type { Meeting } from '@monprojetpro/module-visio'

export async function endHubMeeting(input: {
  meetingId: string
}): Promise<ActionResponse<Meeting>> {
  try {
    // Récupérer meet_space_name par ID direct (pas N+1)
    const supabase = await createServerSupabaseClient()
    const { data: meeting } = await supabase
      .from('meetings')
      .select('meet_space_name')
      .eq('id', input.meetingId)
      .single()

    if (meeting?.meet_space_name) {
      const meetClient = getGoogleMeetClient()
      await meetClient.spaces.endActiveConference({
        name: meeting.meet_space_name,
      }).catch((err) => {
        console.error('[HUB:END_HUB_MEETING] endActiveConference error (non-blocking):', err)
      })
    }
  } catch (err) {
    console.error('[HUB:END_HUB_MEETING] Google Meet API error (non-blocking):', err)
  }

  return endMeeting(input)
}
