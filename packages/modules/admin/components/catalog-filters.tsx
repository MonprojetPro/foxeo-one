'use client'

import { type ListModuleCatalogFilters } from '../actions/list-module-catalog'

interface CatalogFiltersProps {
  filters: ListModuleCatalogFilters
  onChange: (filters: ListModuleCatalogFilters) => void
}

const CATEGORIES = [
  { value: '', label: 'Toutes' },
  { value: 'business', label: 'Business' },
  { value: 'communication', label: 'Communication' },
  { value: 'integration', label: 'Intégration' },
]

const KINDS = [
  { value: '', label: 'Tous' },
  { value: 'catalog', label: 'Catalogue' },
  { value: 'custom', label: 'Sur-mesure' },
]

export function CatalogFilters({ filters, onChange }: CatalogFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={filters.category ?? ''}
        onChange={(e) => onChange({ ...filters, category: e.target.value || undefined })}
        className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value} className="bg-gray-900">
            {c.label}
          </option>
        ))}
      </select>

      <select
        value={filters.kind ?? ''}
        onChange={(e) => onChange({ ...filters, kind: (e.target.value || undefined) as 'catalog' | 'custom' | undefined })}
        className="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
      >
        {KINDS.map((k) => (
          <option key={k.value} value={k.value} className="bg-gray-900">
            {k.label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm text-gray-400">
        <input
          type="checkbox"
          checked={filters.isActive !== false}
          onChange={(e) => onChange({ ...filters, isActive: e.target.checked ? undefined : false })}
          className="rounded border-white/20"
        />
        Actifs uniquement
      </label>
    </div>
  )
}
