import { useQuery } from '@tanstack/react-query'
import { getClientCommunicationProfile } from '../actions/get-communication-profile'

export function useClientCommunicationProfile(clientId: string) {
  return useQuery({
    queryKey: ['client-communication-profile', clientId],
    queryFn: async () => {
      const result = await getClientCommunicationProfile(clientId)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!clientId,
  })
}
