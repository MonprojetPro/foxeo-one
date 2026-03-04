import { useQuery } from '@tanstack/react-query'
import { getClientPendingValidationsCount } from '../actions/get-client-pending-validations'

export function useClientPendingValidations(clientId: string) {
  return useQuery({
    queryKey: ['client-pending-validations', clientId],
    queryFn: async () => {
      const result = await getClientPendingValidationsCount(clientId)
      if (result.error) throw new Error(result.error.message)
      return result.data ?? { count: 0 }
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 2,
  })
}
