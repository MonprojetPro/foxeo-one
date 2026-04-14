'use client'

// Calendar stub — remplacera par react-day-picker quand installé
import * as React from 'react'
import { cn } from '@monprojetpro/utils'

interface CalendarProps {
  mode?: 'single' | 'multiple' | 'range'
  selected?: Date | Date[] | undefined
  onSelect?: (date: Date | undefined) => void
  className?: string
  disabled?: (date: Date) => boolean
  initialFocus?: boolean
}

export function Calendar({ className, selected, onSelect }: CalendarProps) {
  const today = new Date()
  const [viewDate, setViewDate] = React.useState(
    selected instanceof Date ? selected : today
  )

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const monthName = new Date(year, month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days: (number | null)[] = []
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const selectedDay = selected instanceof Date ? selected.getDate() : null
  const selectedMonth = selected instanceof Date ? selected.getMonth() : null
  const selectedYear = selected instanceof Date ? selected.getFullYear() : null

  return (
    <div className={cn('p-3 w-fit', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          ‹
        </button>
        <span className="text-sm font-medium capitalize">{monthName}</span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          ›
        </button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => (
          <div key={d} className="text-center text-[0.7rem] text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      {/* Days */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const isSelected = day === selectedDay && month === selectedMonth && year === selectedYear
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect?.(new Date(year, month, day))}
              className={cn(
                'h-8 w-8 rounded-md text-sm transition-colors mx-auto flex items-center justify-center',
                isSelected && 'bg-primary text-primary-foreground',
                !isSelected && isToday && 'border border-primary text-primary',
                !isSelected && !isToday && 'hover:bg-accent'
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
