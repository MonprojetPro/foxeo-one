'use client'

import { useState } from 'react'
import { Button, Skeleton } from '@monprojetpro/ui'
import { Plus } from 'lucide-react'
import {
  RemindersCalendar,
  ReminderDayList,
  RemindersFilter,
  CreateReminderDialog,
  EditReminderDialog,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rappels & Calendrier</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos rappels et deadlines
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau rappel
        </Button>
      </div>

      {/* Filter */}
      <RemindersFilter value={filter} onChange={setFilter} />

      {/* Calendar + Day List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-48" />
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
              <Skeleton className="h-[500px] w-full rounded-lg" />
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

        {/* Day List */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Rappels du jour</h3>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
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

      {/* Create Dialog */}
      <CreateReminderDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Edit Dialog */}
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
