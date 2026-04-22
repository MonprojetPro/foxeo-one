'use client'

import { useState, useTransition } from 'react'
import { createMeeting } from '../actions/create-meeting'
import type { ActionResponse } from '@monprojetpro/types'
import type { Meeting } from '../types/meeting.types'

type CreateMeetingFn = (input: {
  clientId: string
  operatorId: string
  title: string
  description?: string
  scheduledAt?: string
}) => Promise<ActionResponse<Meeting>>

interface MeetingScheduleDialogProps {
  clientId?: string
  operatorId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  createMeetingAction?: CreateMeetingFn
}

export function MeetingScheduleDialog({
  clientId = '',
  operatorId,
  open,
  onOpenChange,
  onSuccess,
  createMeetingAction = createMeeting,
}: MeetingScheduleDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createMeetingAction({
        ...(clientId ? { clientId } : {}),
        operatorId,
        title,
        description: description || undefined,
        scheduledAt: scheduledAt || undefined,
      })

      if (result.error) {
        setError(result.error.message)
        return
      }

      setTitle('')
      setDescription('')
      setScheduledAt('')
      onOpenChange(false)
      onSuccess?.()
    })
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-white/10 bg-background p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Planifier un meeting</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="meeting-title" className="text-sm font-medium">
              Titre *
            </label>
            <input
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Réunion de suivi..."
              required
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="meeting-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="meeting-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Points à aborder..."
              rows={3}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="meeting-scheduled-at" className="text-sm font-medium">
              Date et heure
            </label>
            <input
              id="meeting-scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-white/20 px-4 py-2 text-sm hover:bg-white/5"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? 'Planification...' : 'Planifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
