import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

export interface ClientInstance {
  id: string
  clientId: string
  clientName: string | null
  slug: string
  instanceUrl: string
  status: 'provisioning' | 'active' | 'suspended' | 'failed' | 'transferred'
  tier: 'base' | 'essentiel' | 'agentique'
  activeModules: string[]
  supabaseProjectId: string | null
  vercelProjectId: string | null
  createdAt: string
  activatedAt: string | null
}

export function useInstances() {
  return useQuery({
    queryKey: ['admin', 'instances'],
    queryFn: async (): Promise<ClientInstance[]> => {
      const supabase = createBrowserSupabaseClient()

      const { data, error } = await supabase
        .from('client_instances')
        .select(
          'id, client_id, slug, instance_url, status, tier, active_modules, supabase_project_id, vercel_project_id, created_at, activated_at, clients(company)'
        )
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data ?? []).map((row) => {
        const clientRow = Array.isArray(row.clients) ? row.clients[0] : row.clients
        return {
          id: row.id,
          clientId: row.client_id,
          clientName: (clientRow as { company?: string } | null)?.company ?? null,
          slug: row.slug,
          instanceUrl: row.instance_url,
          status: row.status as ClientInstance['status'],
          tier: row.tier as ClientInstance['tier'],
          activeModules: (row.active_modules as string[]) ?? [],
          supabaseProjectId: row.supabase_project_id ?? null,
          vercelProjectId: row.vercel_project_id ?? null,
          createdAt: row.created_at,
          activatedAt: row.activated_at ?? null,
        }
      })
    },
  })
}
