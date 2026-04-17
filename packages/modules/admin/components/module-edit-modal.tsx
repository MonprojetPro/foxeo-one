'use client'

import { useState } from 'react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@monprojetpro/ui'
import { useUpsertModuleCatalog } from '../hooks/use-module-catalog'
import { type ModuleCatalogEntry } from '../actions/list-module-catalog'

interface ModuleEditModalProps {
  module: ModuleCatalogEntry | null
  onClose: () => void
}

export function ModuleEditModal({ module, onClose }: ModuleEditModalProps) {
  const isEdit = !!module
  const isCatalog = module?.kind === 'catalog'

  const [formData, setFormData] = useState({
    module_key: module?.module_key ?? '',
    name: module?.name ?? '',
    description: module?.description ?? '',
    category: module?.category ?? 'business',
    kind: module?.kind ?? 'custom',
    setup_price_ht: module?.setup_price_ht ?? 0,
    monthly_price_ht: module?.monthly_price_ht ?? null as number | null,
    is_default: module?.is_default ?? false,
    is_active: module?.is_active ?? true,
    requires_modules: module?.requires_modules ?? [],
  })

  const upsertMutation = useUpsertModuleCatalog()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    upsertMutation.mutate(
      {
        ...(module?.id ? { id: module.id } : {}),
        ...formData,
        monthly_price_ht: formData.monthly_price_ht,
        manifest_path: module?.manifest_path ?? null,
      },
      {
        onSuccess: () => onClose(),
      }
    )
  }

  const updateField = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Éditer — ${module.name}` : 'Nouveau module'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* module_key */}
          <div>
            <label className="mb-1 block text-sm text-gray-400">Clé module</label>
            <input
              type="text"
              value={formData.module_key}
              onChange={(e) => updateField('module_key', e.target.value)}
              disabled={isCatalog}
              placeholder="ex: mon-module"
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
              required
            />
          </div>

          {/* name */}
          <div>
            <label className="mb-1 block text-sm text-gray-400">Nom</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              disabled={isCatalog}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
              required
            />
          </div>

          {/* description */}
          <div>
            <label className="mb-1 block text-sm text-gray-400">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </div>

          {/* category + kind */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-gray-400">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => updateField('category', e.target.value)}
                disabled={isCatalog}
                className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                <option value="business" className="bg-gray-900">Business</option>
                <option value="communication" className="bg-gray-900">Communication</option>
                <option value="integration" className="bg-gray-900">Intégration</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Type</label>
              <select
                value={formData.kind}
                onChange={(e) => updateField('kind', e.target.value as 'catalog' | 'custom')}
                disabled={isEdit}
                className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                <option value="catalog" className="bg-gray-900">Catalogue</option>
                <option value="custom" className="bg-gray-900">Sur-mesure</option>
              </select>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-gray-400">Prix setup HT (€)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={formData.setup_price_ht}
                onChange={(e) => updateField('setup_price_ht', parseFloat(e.target.value) || 0)}
                className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Prix mensuel HT (€)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={formData.monthly_price_ht ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  updateField('monthly_price_ht', val === '' ? null : parseFloat(val) || 0)
                }}
                placeholder="Pas d'abonnement"
                className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => updateField('is_default', e.target.checked)}
                className="rounded border-white/20"
              />
              One de base
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => updateField('is_active', e.target.checked)}
                className="rounded border-white/20"
              />
              Actif
            </label>
          </div>

          {/* requires_modules */}
          <div>
            <label className="mb-1 block text-sm text-gray-400">Dépendances (module_keys séparés par virgule)</label>
            <input
              type="text"
              value={formData.requires_modules.join(', ')}
              onChange={(e) => {
                const keys = e.target.value
                  .split(',')
                  .map(k => k.trim())
                  .filter(Boolean)
                updateField('requires_modules', keys)
              }}
              placeholder="ex: core-dashboard, elio"
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
