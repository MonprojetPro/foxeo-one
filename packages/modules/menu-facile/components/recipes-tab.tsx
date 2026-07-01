'use client'

import { useState } from 'react'
import { ChefHat, Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react'
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {data?.length ? `${data.length} recette(s) officielle(s)` : 'Recettes officielles MenuFacile'}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={isFetching} onClick={() => refetch()}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Actualisation…' : 'Actualiser'}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nouvelle recette
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-8 text-center">
          <p className="text-sm text-red-400">Impossible de charger les recettes</p>
          <p className="text-xs text-gray-500 mt-1">{(error as Error).message}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2.5">
          <div className="h-14 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-14 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-14 rounded-xl bg-white/5 animate-pulse" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <ChefHat className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-300">Aucune recette officielle pour l&apos;instant.</p>
          <p className="mt-1 text-xs text-gray-500">Crée la première pour la proposer aux utilisateurs MenuFacile.</p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nouvelle recette
          </Button>
        </div>
      ) : (
        <>
          {/* Table — desktop */}
          <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                  <th className="px-4 py-2.5 font-medium">Nom</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 text-right font-medium">Copies</th>
                  <th className="px-4 py-2.5 text-right font-medium">Notes</th>
                  <th className="px-4 py-2.5 font-medium">Visible</th>
                  <th className="px-4 py-2.5 font-medium">Créée</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 transition-colors last:border-0 hover:bg-cyan-400/[0.04]"
                  >
                    <td className="px-4 py-3 text-white">{r.name}</td>
                    <td className="px-4 py-3 text-gray-400">{COURSE_LABEL[r.course] ?? r.course}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-300">{r.copy_count}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-300">{r.rating_count}</td>
                    <td className="px-4 py-3">
                      {r.is_hidden ? (
                        <Badge variant="outline" className="border-red-400/30 bg-red-400/15 text-red-300">Masquée</Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/15 text-emerald-300">Visible</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-400">{fmtDate(r.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button variant="outline" size="sm" className="mr-2" onClick={() => openEdit(r)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Éditer
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setToDelete(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="space-y-3 md:hidden">
            {data.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{r.name}</p>
                    <p className="text-xs text-gray-400">{COURSE_LABEL[r.course] ?? r.course}</p>
                  </div>
                  {r.is_hidden ? (
                    <Badge variant="outline" className="border-red-400/30 bg-red-400/15 text-red-300">Masquée</Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/15 text-emerald-300">Visible</Badge>
                  )}
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span><span className="tabular-nums text-gray-200">{r.copy_count}</span> copies</span>
                  <span><span className="tabular-nums text-gray-200">{r.rating_count}</span> notes</span>
                  <span className="ml-auto">{fmtDate(r.created_at)}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(r)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Éditer
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setToDelete(r)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
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
