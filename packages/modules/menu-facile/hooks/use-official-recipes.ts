import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOfficialRecipes,
  createOfficialRecipe,
  updateOfficialRecipe,
  deleteOfficialRecipe,
} from '../actions/official-recipes'
import type { OfficialRecipeListItem, OfficialRecipeInput } from '../types'

/** Liste des recettes officielles. */
export function useOfficialRecipes() {
  return useQuery<OfficialRecipeListItem[]>({
    queryKey: ['menu-facile', 'official-recipes'],
    queryFn: async (): Promise<OfficialRecipeListItem[]> => {
      const res = await getOfficialRecipes()
      if (res.error) throw new Error(res.error.message)
      return res.data ?? []
    },
    staleTime: 60 * 1000,
  })
}

/** Mutations create / update / delete avec invalidation liste + métriques. */
export function useOfficialRecipeActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['menu-facile', 'official-recipes'] })
    qc.invalidateQueries({ queryKey: ['menu-facile', 'metrics'] })
  }

  const create = useMutation({
    mutationFn: async (input: OfficialRecipeInput) => {
      const res = await createOfficialRecipe(input)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: async (args: { id: string; input: Partial<OfficialRecipeInput> }) => {
      const res = await updateOfficialRecipe(args.id, args.input)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteOfficialRecipe(id)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
