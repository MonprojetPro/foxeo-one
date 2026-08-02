import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getHouseholds } from '../actions/households'
import type { HouseholdListItem, HouseholdsQuery, Paginated } from '../types'

/**
 * Page de la liste des foyers.
 *
 * MenuFacile vit dans une base séparée : aucun Realtime n'est possible via le
 * guichet, donc on rafraîchit par polling (comme les messages de contact).
 * `keepPreviousData` évite le clignotement de la table au changement de page
 * ou de filtre : l'ancienne page reste affichée pendant le chargement.
 */
export function useHouseholds(q: HouseholdsQuery) {
  return useQuery<Paginated<HouseholdListItem>>({
    queryKey: ['menu-facile', 'households', q],
    queryFn: async (): Promise<Paginated<HouseholdListItem>> => {
      const res = await getHouseholds(q)
      if (res.error || !res.data) throw new Error(res.error?.message ?? 'Foyers indisponibles')
      return res.data
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  })
}
