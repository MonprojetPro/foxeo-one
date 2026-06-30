import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOfficialRecipes,
  getOfficialRecipe,
  createOfficialRecipe,
  updateOfficialRecipe,
  deleteOfficialRecipe,
} from '../actions/official-recipes'
import type { OfficialRecipeListItem, OfficialRecipeInput, OfficialRecipeDetail } from '../types'

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

/**
 * Détail complet d'une recette (pour pré-remplir l'édition). N'est appelé que si
 * `id` est fourni. Si l'endpoint n'existe pas encore côté MenuFacile, la query
 * passe en erreur → le formulaire bascule en mode sûr (cf. RecipeFormModal).
 */
export function useOfficialRecipe(id: string | null) {
  return useQuery<OfficialRecipeDetail>({
    queryKey: ['menu-facile', 'official-recipe', id],
    enabled: !!id,
    retry: false,
    queryFn: async (): Promise<OfficialRecipeDetail> => {
      const res = await getOfficialRecipe(id as string)
      if (res.error || !res.data) throw new Error(res.error?.message ?? 'Recette introuvable')
      return res.data
    },
    staleTime: 30 * 1000,
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
