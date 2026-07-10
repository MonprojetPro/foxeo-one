'use client'

import {
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@monprojetpro/ui'
import type { ClientFilters, ClientType, ClientStatus } from '../types/crm.types'

interface ClientFiltersPanelProps {
  filters: ClientFilters
  onFiltersChange: (filters: ClientFilters) => void
}

const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: 'complet', label: 'Complet' },
  { value: 'direct_one', label: 'Direct One' },
  { value: 'ponctuel', label: 'Ponctuel' },
]

const CLIENT_STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'active', label: 'Actif' },
  { value: 'suspended', label: 'Suspendu' },
  { value: 'archived', label: 'Archivé' },
  { value: 'deleted', label: 'Supprimé' },
]

const ALL_VALUE = '__all__'

export function ClientFiltersPanel({ filters, onFiltersChange }: ClientFiltersPanelProps) {
  const hasActiveFilters =
    (filters.clientType && filters.clientType.length > 0) ||
    (filters.status && filters.status.length > 0) ||
    (filters.sector && filters.sector.length > 0)

  const handleReset = () => {
    onFiltersChange({})
  }

  const handleTypeChange = (value: string) => {
    if (value === ALL_VALUE) {
      onFiltersChange({ ...filters, clientType: undefined })
    } else {
      onFiltersChange({ ...filters, clientType: [value as ClientType] })
    }
  }

  const handleStatusChange = (value: string) => {
    if (value === ALL_VALUE) {
      onFiltersChange({ ...filters, status: undefined })
    } else {
      onFiltersChange({ ...filters, status: [value as ClientStatus] })
    }
  }

  return (
    /* Panneau de filtres — selects cockpit style sombre */
    <div className="flex items-center gap-3 flex-wrap">
      <Select
        value={filters.clientType?.[0] ?? ALL_VALUE}
        onValueChange={handleTypeChange}
      >
        <SelectTrigger size="sm" className="w-[150px] border-white/10 bg-white/[0.03] text-gray-300">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Tous les types</SelectItem>
          {CLIENT_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status?.[0] ?? ALL_VALUE}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger size="sm" className="w-[150px] border-white/10 bg-white/[0.03] text-gray-300">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Tous les statuts</SelectItem>
          {CLIENT_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Bouton reset — visible uniquement si des filtres sont actifs */}
      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={handleReset}
          className="border-white/10 text-gray-300 hover:bg-white/[0.05]">
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  )
}

ClientFiltersPanel.displayName = 'ClientFiltersPanel'
