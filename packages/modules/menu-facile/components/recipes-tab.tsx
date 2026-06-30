'use client'

import { useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  toast,
} from '@monprojetpro/ui'
import { useOfficialRecipes, useOfficialRecipeActions } from '../hooks/use-official-recipes'
import { RecipeFormModal } from './recipe-form-modal'
import type { OfficialRecipeListItem } from '../types'

const COURSE_LABEL: Record<string, string> = {
  entree: 'Entrée',
  plat: 'Plat',
  dessert: 'Dessert',
  apero: 'Apéro',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function RecipesTab() {
  const { data, isLoading, error, refetch, isFetching } = useOfficialRecipes()
  const { remove } = useOfficialRecipeActions()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<OfficialRecipeListItem | null>(null)
  const [toDelete, setToDelete] = useState<OfficialRecipeListItem | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (r: OfficialRecipeListItem) => {
    setEditing(r)
    setFormOpen(true)
  }

  const confirmDelete = () => {
    if (!toDelete) return
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success('Recette supprimée')
        setToDelete(null)
      },
      onError: (e) => toast.error((e as Error).message),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {data?.length ? `${data.length} recette(s) officielle(s)` : 'Recettes officielles MenuFacile'}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={isFetching} onClick={() => refetch()}>
            {isFetching ? 'Actualisation…' : 'Actualiser'}
          </Button>
          <Button size="sm" onClick={openCreate}>+ Nouvelle recette</Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-400/30 bg-red-400/5 p-6 text-center">
          <p className="text-sm text-red-400">Impossible de charger les recettes</p>
          <p className="text-xs text-gray-500 mt-1">{(error as Error).message}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                <th className="px-4 py-2 font-medium">Nom</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium text-right">Copies</th>
                <th className="px-4 py-2 font-medium text-right">Notes</th>
                <th className="px-4 py-2 font-medium">Visible</th>
                <th className="px-4 py-2 font-medium">Créée</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6">
                    <div className="h-5 rounded bg-white/5 animate-pulse" />
                  </td>
                </tr>
              ) : !data?.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-500">
                    Aucune recette officielle. Clique sur « Nouvelle recette ».
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2.5 text-white">{r.name}</td>
                    <td className="px-4 py-2.5 text-gray-400">{COURSE_LABEL[r.course] ?? r.course}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{r.copy_count}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{r.rating_count}</td>
                    <td className="px-4 py-2.5">
                      {r.is_hidden ? (
                        <Badge variant="outline" className="bg-red-400/15 text-red-300 border-red-400/30">Masquée</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-400/15 text-emerald-300 border-emerald-400/30">Visible</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" className="mr-2" onClick={() => openEdit(r)}>Éditer</Button>
                      <Button variant="ghost" size="sm" onClick={() => setToDelete(r)}>Suppr.</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <RecipeFormModal open={formOpen} recipe={editing} onClose={() => setFormOpen(false)} />
      )}

      {/* Confirmation suppression */}
      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer la recette ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            « {toDelete?.name} » sera définitivement supprimée de MenuFacile. Action irréversible.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setToDelete(null)} disabled={remove.isPending}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={remove.isPending}>
              {remove.isPending ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
