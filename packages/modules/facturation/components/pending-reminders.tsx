'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPendingReminders, getReminderHistory } from '../actions/get-pending-reminders'
import { ReminderModal } from './reminder-modal'
import type { CollectionReminderWithClient } from '../types/billing.types'

const LEVEL_LABELS: Record<number, string> = {
  1: 'J+7 — Rappel doux',
  2: 'J+14 — Relance directe',
  3: 'J+30 — Relance ferme',
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  chat: 'Chat',
  both: 'Email + Chat',
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

// ── Section Relances en attente ───────────────────────────────────────────────

export function PendingReminders() {
  const [activeReminder, setActiveReminder] = useState<CollectionReminderWithClient | null>(null)
  const queryClient = useQueryClient()

  const { data: pending = [], isPending } = useQuery({
    queryKey: ['billing', 'reminders', 'pending'],
    queryFn: async () => {
      const result = await getPendingReminders()
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    staleTime: 1000 * 30,
  })

  const { data: history = [] } = useQuery({
    queryKey: ['billing', 'reminders', 'history'],
    queryFn: async () => {
      const result = await getReminderHistory()
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    staleTime: 1000 * 60,
  })

  function handleDone() {
    setActiveReminder(null)
    queryClient.invalidateQueries({ queryKey: ['billing', 'reminders'] })
  }

  return (
    <>
      {/* Section relances en attente */}
      <div className="flex flex-col gap-4" data-testid="pending-reminders">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Relances en attente
            {pending.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs min-w-[1.25rem] h-5 px-1 font-bold">
                {pending.length > 99 ? '99+' : pending.length}
              </span>
            )}
          </h2>
        </div>

        {isPending ? (
          <div className="space-y-2" data-testid="reminders-skeleton">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div
            className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center border border-dashed border-border rounded-lg"
            data-testid="reminders-empty"
          >
            <span>✓</span>
            <span>Aucune relance en attente</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2" data-testid="reminders-list">
            {pending.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3 gap-4"
                data-testid={`reminder-item-${reminder.id}`}
              >
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{reminder.client_name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {LEVEL_LABELS[reminder.reminder_level] ?? `Niveau ${reminder.reminder_level}`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Facture {reminder.invoice_number} · {formatAmount(reminder.invoice_amount)} · émise le {formatDate(reminder.invoice_date)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveReminder(reminder)}
                  data-testid={`btn-open-reminder-${reminder.id}`}
                  className="shrink-0 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  Voir &amp; Envoyer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section historique */}
      {history.length > 0 && (
        <div className="flex flex-col gap-3 mt-6" data-testid="reminders-history">
          <h2 className="text-base font-semibold text-muted-foreground">Historique des relances</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-1.5 pr-3 font-medium">Client</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Facture</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Niveau</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Canal</th>
                  <th className="text-left py-1.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    <td className="py-1.5 pr-3">{r.client_name}</td>
                    <td className="py-1.5 pr-3">{r.invoice_number}</td>
                    <td className="py-1.5 pr-3">Niv. {r.reminder_level}</td>
                    <td className="py-1.5 pr-3">{r.channel ? CHANNEL_LABELS[r.channel] : '—'}</td>
                    <td className="py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-medium ${
                        r.status === 'sent'
                          ? 'bg-green-500/15 text-green-600'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {r.status === 'sent'
                          ? `Envoyé ${r.sent_at ? formatDate(r.sent_at) : ''}`
                          : 'Annulé'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {activeReminder && (
        <ReminderModal
          reminder={activeReminder}
          onClose={() => setActiveReminder(null)}
          onDone={handleDone}
        />
      )}
    </>
  )
}
