'use client'

import { useState } from 'react'
import { Badge, Button } from '@monprojetpro/ui'
import { useModuleCatalog, useDeleteModuleCatalog, useSyncModuleCatalog } from '../hooks/use-module-catalog'
import { useCatalogAnalytics } from '../hooks/use-catalog-analytics'
import { type ListModuleCatalogFilters, type ModuleCatalogEntry } from '../actions/list-module-catalog'
import { CatalogFilters } from './catalog-filters'
import { ModuleEditModal } from './module-edit-modal'

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '—'
  if (price === 0) return 'Gratuit'
  return `${price.toLocaleString('fr-FR')}€`
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    business: 'bg-blue-500/20 text-blue-300',
    communication: 'bg-green-500/20 text-green-300',
    integration: 'bg-purple-500/20 text-purple-300',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[category] ?? 'bg-gray-500/20 text-gray-300'}`}>
      {category}
    </span>
  )
}

export function CatalogList() {
  const [filters, setFilters] = useState<ListModuleCatalogFilters>({})
  const [editModule, setEditModule] = useState<ModuleCatalogEntry | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: modules, isLoading } = useModuleCatalog(filters)
  const { data: analyticsData } = useCatalogAnalytics()
  const clientCountMap = new Map(analyticsData?.map(a => [a.module_key, a.active_clients_count]) ?? [])
  const deleteMutation = useDeleteModuleCatalog()
  const syncMutation = useSyncModuleCatalog()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-white/5" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Catalogue de modules</h1>
          <p className="text-sm text-gray-400">
            {modules?.length ?? 0} modules disponibles
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? 'Sync...' : 'Sync manifests'}
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            + Nouveau module
          </Button>
        </div>
      </div>

      {/* Filters */}
      <CatalogFilters filters={filters} onChange={setFilters} />

      {/* Table */}
      <div className="overflow-x-auto rounded border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-left text-gray-400">
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium text-right">Setup HT</th>
              <th className="px-4 py-3 font-medium text-right">Mensuel HT</th>
              <th className="px-4 py-3 font-medium text-center">Clients</th>
              <th className="px-4 py-3 font-medium text-center">Défaut</th>
              <th className="px-4 py-3 font-medium text-center">Actif</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {modules?.map((mod) => (
              <tr key={mod.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium text-white">{mod.name}</span>
                    <span className="ml-2 text-xs text-gray-500">{mod.module_key}</span>
                  </div>
                  {mod.description && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{mod.description}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge category={mod.category} />
                </td>
                <td className="px-4 py-3">
                  <Badge variant={mod.kind === 'catalog' ? 'default' : 'secondary'}>
                    {mod.kind === 'catalog' ? 'Catalogue' : 'Sur-mesure'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-white">
                  {formatPrice(mod.setup_price_ht)}
                </td>
                <td className="px-4 py-3 text-right text-white">
                  {formatPrice(mod.monthly_price_ht)}
                  {mod.monthly_price_ht !== null && mod.monthly_price_ht > 0 && (
                    <span className="text-gray-500">/mois</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-sm text-white">
                  {clientCountMap.get(mod.module_key) ?? 0}
                </td>
                <td className="px-4 py-3 text-center">
                  {mod.is_default && (
                    <span className="inline-block h-2 w-2 rounded-full bg-cyan-400" title="One de base" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block h-2 w-2 rounded-full ${mod.is_active ? 'bg-green-400' : 'bg-red-400'}`} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditModule(mod)}
                      className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-white/10 hover:text-white"
                    >
                      Éditer
                    </button>
                    {mod.kind === 'custom' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Supprimer le module "${mod.name}" ?`)) {
                            deleteMutation.mutate(mod.id)
                          }
                        }}
                        className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        Suppr.
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {modules?.length === 0 && (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            Aucun module trouvé avec ces filtres
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <ModuleEditModal
          module={null}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editModule && (
        <ModuleEditModal
          module={editModule}
          onClose={() => setEditModule(null)}
        />
      )}
    </div>
  )
}
