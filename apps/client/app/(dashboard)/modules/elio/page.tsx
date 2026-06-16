import { createServerSupabaseClient, hasIaConsent } from '@monprojetpro/supabase'
import { cookies } from 'next/headers'
import { ElioChat } from '@monprojetpro/module-elio'
import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'
import { resolveClientMode } from '@monprojetpro/utils'
import { ElioVeille } from '../../../../components/elio-veille'

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
    .select('id, client_configs(dashboard_type, lab_mode_available, one_mode_available)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const clientId = clientRecord?.id ?? ''
  const configRelation = clientRecord?.client_configs
  const configData = Array.isArray(configRelation) ? configRelation[0] : configRelation

  const cookieStore = await cookies()
  const { activeMode: effectiveMode } = resolveClientMode({
    dashboardType: configData?.dashboard_type,
    labModeAvailable: configData?.lab_mode_available ?? false,
    oneModeAvailable: configData?.one_mode_available ?? false,
    cookieMode: cookieStore.get(MODE_TOGGLE_COOKIE)?.value,
  })

  // Guard consentement IA (RGPD) — si le client n'a pas consenti, Élio reste en veille.
  const iaConsentGranted = clientId ? await hasIaConsent(clientId) : false

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {iaConsentGranted ? (
        <ElioChat
          dashboardType={effectiveMode}
          clientId={clientId}
          userId={user.id}
          initialConversationId={initialConversationId}
        />
      ) : (
        <ElioVeille />
      )}
    </div>
  )
}
