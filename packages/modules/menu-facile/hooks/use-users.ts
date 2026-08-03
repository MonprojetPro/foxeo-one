import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getUsers } from '../actions/users'
import type { Paginated, UserListItem, UsersQuery } from '../types'

/**
 * Page de la liste des utilisateurs. Même stratégie que les foyers : polling
 * (base MenuFacile externe → pas de Realtime) et conservation de la page
 * précédente pendant le chargement pour éviter le clignotement.
 */
export function useUsers(q: UsersQuery) {
  return useQuery<Paginated<UserListItem>>({
    queryKey: ['menu-facile', 'users', q],
    queryFn: async (): Promise<Paginated<UserListItem>> => {
      const res = await getUsers(q)
      if (res.error || !res.data) {
        throw new Error(res.error?.message ?? 'Utilisateurs indisponibles')
      }
      return res.data
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  })
}
