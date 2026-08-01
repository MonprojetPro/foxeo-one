'use client'

import { useState } from 'react'
import { Button, CockpitHeader, BlockSkeleton } from '@monprojetpro/ui'
import { Plus, CalendarDays } from 'lucide-react'
import {
  RemindersCalendar,
  ReminderDayList,
  RemindersFilter,
  CreateReminderDialog,
  EditReminderDialog,
  CrmSubNav,
  useReminders,
} from '@monprojetpro/modules-crm'
import type { ReminderFilter, Reminder } from '@monprojetpro/modules-crm'

export default function RemindersPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [filter, setFilter] = useState<ReminderFilter>('upcoming')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)

  const currentMonth = selectedDate.getMonth() + 1
  const currentYear = selectedDate.getFullYear()

  const { data: reminders = [], isLoading } = useReminders({
    filter,
    month: currentMonth,
    year: currentYear,
  })

  const handleMonthChange = (month: number, year: number) => {
    // Clamp day to last day of target month to avoid date overflow
    const maxDay = new Date(year, month, 0).getDate()
    const clampedDay = Math.min(selectedDate.getDate(), maxDay)
    setSelectedDate(new Date(year, month - 1, clampedDay))
  }

  return (
    <div className="space-y-6">
      {/* En-tête cockpit Hub avec accent cyan */}
      <CockpitHeader
        icon={CalendarDays}
        title="Rappels & Calendrier"
        subtitle="Gérez vos rappels et deadlines"
        tone="cyan"
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau rappel
          </Button>
        }
      />

      {/* Sous-navigation CRM — sans elle, cette page était un cul-de-sac :
          on ne pouvait ni y arriver au clic, ni en repartir. */}
      <CrmSubNav />

      {/* Filtre de période */}
      <RemindersFilter value={filter} onChange={setFilter} />

      {/* Grille calendrier + liste du jour */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendrier mensuel */}
        <div className="lg:col-span-2">
          {isLoading ? (
            /* Skeleton cockpit : animate-pulse sans Skeleton shadcn */
            <div className="space-y-4">
              <BlockSkeleton className="h-8 w-48" />
              <BlockSkeleton className="h-[500px] w-full" />
            </div>
          ) : (
            <RemindersCalendar
              reminders={reminders}
              month={currentMonth}
              year={currentYear}
              onMonthChange={handleMonthChange}
              onDayClick={setSelectedDate}
              selectedDate={selectedDate}
            />
          )}
        </div>

        {/* Panneau rappels du jour — style cockpit sombre */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            {/* Label section en majuscules comme les autres cartes Hub */}
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Rappels du jour
            </h3>
            {isLoading ? (
              /* Skeletons cockpit pour les cartes de rappel */
              <div className="space-y-3">
                <BlockSkeleton className="h-20 w-full" />
                <BlockSkeleton className="h-20 w-full" />
                <BlockSkeleton className="h-20 w-full" />
              </div>
            ) : (
              <ReminderDayList
                reminders={reminders}
                selectedDate={selectedDate}
                onEdit={(reminder) => setEditingReminder(reminder)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dialog création */}
      <CreateReminderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Dialog édition */}
      <EditReminderDialog
        open={editingReminder !== null}
        onOpenChange={(open) => {
          if (!open) setEditingReminder(null)
        }}
        reminder={editingReminder}
      />
    </div>
  )
}
