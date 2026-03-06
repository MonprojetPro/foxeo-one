import { createServerSupabaseClient } from '@foxeo/supabase'
import { CoreDashboard, getTeasingEligibility } from '@foxeo/module-core-dashboard'
import type { ClientConfig } from '@foxeo/types'

export default async function ClientHomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Single query: client + config joined
  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id, first_name, name, client_configs(id, client_id, dashboard_type, active_modules, theme_variant, custom_branding, elio_config, elio_tier, density, show_lab_teasing, created_at, updated_at)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const clientId = clientRecord?.id ?? ''
  const clientName = clientRecord?.first_name ?? clientRecord?.name ?? ''

  // Normalize joined relation (array or object)
  const configRelation = clientRecord?.client_configs
  const configData = Array.isArray(configRelation) ? configRelation[0] : configRelation

  const clientConfig: ClientConfig = configData
    ? {
        id: configData.id,
        clientId: configData.client_id,
        dashboardType: configData.dashboard_type as ClientConfig['dashboardType'],
        activeModules: configData.active_modules ?? ['core-dashboard'],
        themeVariant: (configData.theme_variant ?? 'one') as ClientConfig['themeVariant'],
        customBranding: (configData.custom_branding as ClientConfig['customBranding']) ?? undefined,
        elioConfig: (configData.elio_config as ClientConfig['elioConfig']) ?? undefined,
        elioTier: (configData.elio_tier as ClientConfig['elioTier']) ?? undefined,
        density: (configData.density ?? 'comfortable') as ClientConfig['density'],
        showLabTeasing: (configData.show_lab_teasing as boolean) ?? true,
        createdAt: configData.created_at,
        updatedAt: configData.updated_at,
      }
    : {
        id: '',
        clientId,
        dashboardType: 'one' as ClientConfig['dashboardType'],
        activeModules: ['core-dashboard'],
        themeVariant: 'one',
        density: 'comfortable',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

  // Fetch teasing eligibility server-side (avoids flash UI côté client)
  const teasingResult = clientId ? await getTeasingEligibility(clientId) : null
  const showTeasing = teasingResult?.data?.showTeasing ?? false

  return <CoreDashboard clientConfig={clientConfig} clientName={clientName} showTeasing={showTeasing} />
}
