import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { cookies } from 'next/headers'
import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'
import { resolveClientMode } from '@monprojetpro/utils'

/**
 * /modules/elio — route héritée. Élio One est désormais une POP-UP UNIQUE (ouvrable depuis
 * l'accueil et le widget sidebar), plus une page plein écran (refonte 2026-06-29). On redirige
 * donc tout accès direct : Lab → Mon Parcours (le Concierge s'y ouvre en pop-up), One → accueil
 * (où vit la pop-up Élio One).
 */
export default async function ElioClientPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('client_configs(dashboard_type, lab_mode_available, one_mode_available)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const configRelation = clientRecord?.client_configs
  const configData = Array.isArray(configRelation) ? configRelation[0] : configRelation

  const cookieStore = await cookies()
  const { activeMode } = resolveClientMode({
    dashboardType: configData?.dashboard_type,
    labModeAvailable: configData?.lab_mode_available ?? false,
    oneModeAvailable: configData?.one_mode_available ?? false,
    cookieMode: cookieStore.get(MODE_TOGGLE_COOKIE)?.value,
  })

  redirect(activeMode === 'lab' ? '/modules/parcours' : '/')
}
