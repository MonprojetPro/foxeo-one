'use client'

import { useState } from 'react'
import { markProspectNotInterested } from '../actions/mark-prospect-not-interested'
import type { NotInterestedReason } from '../actions/mark-prospect-not-interested'
import { NotInterestedReasonValues } from '../actions/post-meeting-schemas'

const reasonLabels: Record<NotInterestedReason, string> = {
  budget: 'Budget insuffisant',
  timing: 'Pas le bon moment',
  competitor: 'Concurrent choisi',
  not_ready: 'Pas encore prêt',
  other: 'Autre raison',
}

interface NotInterestedFormProps {
  meetingId: string
  onSuccess: () => void
}

export function NotInterestedForm({ meetingId, onSuccess }: NotInterestedFormProps) {
  const [reason, setReason] = useState<NotInterestedReason | ''>('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsPending(true)
    const result = await markProspectNotInterested({
      meetingId,
      reason: reason || undefined,
    })
    setIsPending(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="not-interested-reason" className="text-sm font-medium">
          Raison (optionnelle)
        </label>
        <select
          id="not-interested-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as NotInterestedReason | '')}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
        >
          <option value="">Choisir une raison...</option>
          {NotInterestedReasonValues.map((r) => (
            <option key={r} value={r}>
              {reasonLabels[r]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? 'Enregistrement...' : 'Confirmer'}
        </button>
      </div>
    </form>
  )
}
