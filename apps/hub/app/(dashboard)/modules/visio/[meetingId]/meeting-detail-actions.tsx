'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startMeeting } from '@monprojetpro/module-visio'
import { endHubMeeting } from '../../../../../actions/end-hub-meeting'
import type { MeetingStatus } from '@monprojetpro/module-visio'

interface MeetingDetailActionsProps {
  meetingId: string
  status: MeetingStatus
}

export function MeetingDetailActions({ meetingId, status }: MeetingDetailActionsProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleStart() {
    startTransition(async () => {
      await startMeeting({ meetingId })
      router.refresh()
    })
  }

  function handleEnd() {
    startTransition(async () => {
      await endHubMeeting({ meetingId })
      router.refresh()
    })
  }

  if (status !== 'scheduled' && status !== 'in_progress') return null

  return (
    <div className="flex items-center gap-2">
      {status === 'scheduled' && (
        <button
          onClick={handleStart}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/10 disabled:opacity-50"
        >
          Démarrer
        </button>
      )}
      {status === 'in_progress' && (
        <button
          onClick={handleEnd}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          Terminer
        </button>
      )}
    </div>
  )
}
