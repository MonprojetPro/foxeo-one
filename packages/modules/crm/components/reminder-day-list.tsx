'use client'

import { ReminderCard } from './reminder-card'
import type { Reminder } from '../types/crm.types'

interface ReminderDayListProps {
  reminders: Reminder[]
  selectedDate: Date
  onEdit?: (reminder: Reminder) => void
}

export function ReminderDayList({ reminders, selectedDate, onEdit }: ReminderDayListProps) {
  // Filtrer les rappels pour la date sélectionnée
  const dayReminders = reminders.filter((r) => {
    const reminderDate = new Date(r.dueDate)
    return (
      reminderDate.getDate() === selectedDate.getDate() &&
      reminderDate.getMonth() === selectedDate.getMonth() &&
      reminderDate.getFullYear() === selectedDate.getFullYear()
    )
  })

  // Empty state cockpit : fond transparent, texte discret
  if (dayReminders.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-500">Aucun rappel pour cette date</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Label de la date sélectionnée — ton secondaire discret */}
      <p className="text-xs font-medium text-gray-400 mb-3">
        {selectedDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
      {dayReminders.map((reminder) => (
        <ReminderCard key={reminder.id} reminder={reminder} onEdit={onEdit} />
      ))}
    </div>
  )
}
