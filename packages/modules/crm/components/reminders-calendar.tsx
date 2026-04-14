'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Badge } from '@monprojetpro/ui'
import type { Reminder } from '../types/crm.types'

interface RemindersCalendarProps {
  reminders: Reminder[]
  month: number // 1-12
  year: number
  onMonthChange: (month: number, year: number) => void
  onDayClick: (date: Date) => void
  selectedDate?: Date
}

export function RemindersCalendar({
  reminders,
  month,
  year,
  onMonthChange,
  onDayClick,
  selectedDate,
}: RemindersCalendarProps) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 // Lundi = 0

  const previousMonth = () => {
    if (month === 1) {
      onMonthChange(12, year - 1)
    } else {
      onMonthChange(month - 1, year)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      onMonthChange(1, year + 1)
    } else {
      onMonthChange(month + 1, year)
    }
  }

  const getRemindersForDay = (day: number) => {
    return reminders.filter((r) => {
      const reminderDate = new Date(r.dueDate)
      return (
        reminderDate.getDate() === day &&
        reminderDate.getMonth() === month - 1 &&
        reminderDate.getFullYear() === year
      )
    })
  }

  // Compute once per render instead of per-day iteration
  const now = new Date()
  const todayStr = now.toDateString()

  const getRemindersStats = (dayReminders: Reminder[]) => {
    const upcoming = dayReminders.filter((r) => !r.completed && new Date(r.dueDate) >= now).length
    const overdue = dayReminders.filter((r) => !r.completed && new Date(r.dueDate) < now).length
    const completed = dayReminders.filter((r) => r.completed).length

    return { upcoming, overdue, completed, total: dayReminders.length }
  }

  const isSelectedDay = (day: number) => {
    if (!selectedDate) return false
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month - 1 &&
      selectedDate.getFullYear() === year
    )
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">{monthName}</h3>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-muted">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: adjustedFirstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="border-t border-r p-2 h-24 bg-muted/30" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayReminders = getRemindersForDay(day)
            const stats = getRemindersStats(dayReminders)
            const isSelected = isSelectedDay(day)
            const isToday = todayStr === new Date(year, month - 1, day).toDateString()

            return (
              <button
                key={day}
                onClick={() => onDayClick(new Date(year, month - 1, day))}
                className={`border-t border-r p-2 h-24 text-left hover:bg-accent/50 transition-colors ${
                  isSelected ? 'bg-accent' : ''
                } ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                    {day}
                  </span>
                  {stats.total > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-5 px-1 text-xs">
                      {stats.total}
                    </Badge>
                  )}
                </div>

                {/* Reminder indicators */}
                <div className="flex flex-wrap gap-1">
                  {stats.overdue > 0 && (
                    <div className="h-2 w-2 rounded-full bg-destructive" title={`${stats.overdue} en retard`} />
                  )}
                  {stats.upcoming > 0 && (
                    <div className="h-2 w-2 rounded-full bg-primary" title={`${stats.upcoming} à venir`} />
                  )}
                  {stats.completed > 0 && (
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" title={`${stats.completed} complétés`} />
                  )}
                </div>
              </button>
            )
          })}

          {/* Empty cells after last day to complete grid */}
          {Array.from({
            length: 7 - ((adjustedFirstDay + daysInMonth) % 7 || 7),
          }).map((_, i) => (
            <div key={`empty-end-${i}`} className="border-t border-r p-2 h-24 bg-muted/30" />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span>À venir</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-destructive" />
          <span>En retard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-muted-foreground" />
          <span>Complétés</span>
        </div>
      </div>
    </div>
  )
}
