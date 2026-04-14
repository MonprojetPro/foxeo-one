'use client'

import { Tabs, TabsList, TabsTrigger } from '@monprojetpro/ui'
import type { ReminderFilter } from '../types/crm.types'

interface RemindersFilterProps {
  value: ReminderFilter
  onChange: (filter: ReminderFilter) => void
}

export function RemindersFilter({ value, onChange }: RemindersFilterProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as ReminderFilter)}>
      <TabsList>
        <TabsTrigger value="upcoming">À venir</TabsTrigger>
        <TabsTrigger value="overdue">En retard</TabsTrigger>
        <TabsTrigger value="completed">Complétés</TabsTrigger>
        <TabsTrigger value="all">Tous</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
