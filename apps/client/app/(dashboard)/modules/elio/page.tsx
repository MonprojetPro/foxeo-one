import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { cookies } from 'next/headers'
import { ElioChat } from '@monprojetpro/module-elio'
import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'

interface PageProps {
  searchParams: Promise<{ conv?: string }>
}

export default async function ElioClientPage({ searchParams }: PageProps) {
  const { conv: initialConversationId } = await searchParams
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id, client_configs(dashboard_type, lab_mode_available)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const clientId = clientRecord?.id ?? ''
  const configRelation = clientRecord?.client_configs
  const configData = Array.isArray(configRelation) ? configRelation[0] : configRelation
  const dbDashboardType = configData?.dashboard_type ?? 'one'
  const labModeAvailable = configData?.lab_mode_available ?? false

  const cookieStore = await cookies()
  const cookieMode = cookieStore.get(MODE_TOGGLE_COOKIE)?.value

  const effectiveMode: 'lab' | 'one' =
    cookieMode === 'lab' && labModeAvailable ? 'lab'
    : cookieMode === 'one' ? 'one'
    : (dbDashboardType === 'lab' ? 'lab' : 'one')

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <ElioChat
        dashboardType={effectiveMode}
        clientId={clientId}
        userId={user.id}
        initialConversationId={initialConversationId}
      />
    </div>
  )
}
