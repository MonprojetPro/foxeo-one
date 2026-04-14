'use client'

import { Input } from '@monprojetpro/ui'
import { Search } from 'lucide-react'

interface FaqSearchProps {
  value: string
  onChange: (value: string) => void
}

export function FaqSearch({ value, onChange }: FaqSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Rechercher dans la FAQ..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}
