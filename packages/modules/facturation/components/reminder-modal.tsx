'use client'

import { useState, useTransition } from 'react'
import type { CollectionReminderWithClient, ReminderChannel } from '../types/billing.types'
import { sendReminder } from '../actions/send-reminder'
import { cancelReminder } from '../actions/cancel-reminder'
import { showSuccess, showError } from '@monprojetpro/ui'

const LEVEL_LABELS: Record<number, string> = {
  1: 'J+7',
  2: 'J+14',
  3: 'J+30',
}

interface ReminderModalProps {
  reminder: CollectionReminderWithClient
  onClose: () => void
  onDone: () => void
}

export function ReminderModal({ reminder, onClose, onDone }: ReminderModalProps) {
  const [body, setBody] = useState(reminder.generated_body ?? '')
  const [channel, setChannel] = useState<ReminderChannel>('email')
  const [isSending, startSend] = useTransition()
  const [isCancelling, startCancel] = useTransition()

  function handleSend() {
    startSend(async () => {
      const result = await sendReminder({ reminderId: reminder.id, channel, body })
      if (result.error) {
        showError(`Erreur : ${result.error.message}`)
        return
      }
      showSuccess(`Relance envoyée à ${reminder.client_name.split(' ')[0]} ✓`)
      onDone()
    })
  }

  function handleCancel() {
    startCancel(async () => {
      const result = await cancelReminder(reminder.id)
      if (result.error) {
        showError(`Erreur : ${result.error.message}`)
        return
      }
      showSuccess('Relance annulée')
      onDone()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      data-testid="reminder-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-background rounded-xl border border-border shadow-xl w-full max-w-lg mx-4"
        data-testid="reminder-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-semibold">Relance impayée</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Facture {reminder.invoice_number} — {LEVEL_LABELS[reminder.reminder_level] ?? `Niveau ${reminder.reminder_level}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Destinataire */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Destinataire</p>
            <p className="text-sm font-medium" data-testid="recipient-email">{reminder.client_email}</p>
          </div>

          {/* Objet */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Objet</p>
            <p className="text-sm" data-testid="email-subject">
              Facture {reminder.invoice_number} — Rappel
            </p>
          </div>

          {/* Badge profil */}
          {reminder.has_communication_profile && (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium w-fit"
              data-testid="profile-badge"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Adapté au ton du client
            </div>
          )}

          {/* Corps modifiable */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Corps du message</p>
            <textarea
              data-testid="reminder-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Saisissez votre message de relance…"
            />
          </div>

          {/* Sélecteur canal */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Canal d'envoi</p>
            <div className="flex gap-2" data-testid="channel-selector">
              {(['email', 'chat', 'both'] as ReminderChannel[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  data-testid={`channel-${c}`}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium border transition-colors ${
                    channel === c
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {c === 'email' ? 'Email' : c === 'chat' ? 'Chat MonprojetPro' : 'Les deux'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-border">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isCancelling || isSending}
            data-testid="btn-cancel-reminder"
            className="text-sm text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          >
            {isCancelling ? 'Annulation…' : 'Annuler la relance'}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => document.querySelector<HTMLTextAreaElement>('[data-testid="reminder-body"]')?.focus()}
              className="px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || isCancelling || !body.trim()}
              data-testid="btn-send-reminder"
              className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSending ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
