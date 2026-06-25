import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerSupabaseClient, hasIaConsent } from '@monprojetpro/supabase'
import { getTeasingEligibility } from '@monprojetpro/module-core-dashboard'
import { getOneConciergeWord } from '@monprojetpro/module-elio'
import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'
import { resolveClientMode } from '@monprojetpro/utils'
import type { ClientConfig } from '@monprojetpro/types'
import { OneHome } from '../../components/one-home'

export default async function ClientHomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Single query: client + config joined
  // Note: client_configs PK is client_id (no id column), density column doesn't exist
  const { data: clientRecord } = await supabase
    .from('clients')
    .select('id, first_name, name, client_configs(client_id, dashboard_type, active_modules, theme_variant, custom_branding, elio_config, elio_tier, show_lab_teasing, lab_mode_available, one_mode_available, one_status, created_at, updated_at)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const clientId = clientRecord?.id ?? ''
  const clientName = clientRecord?.first_name ?? clientRecord?.name ?? ''

  // Normalize joined relation (array or object)
  const configRelation = clientRecord?.client_configs
  const configData = Array.isArray(configRelation) ? configRelation[0] : configRelation

  const clientConfig: ClientConfig = configData
    ? {
        id: configData.client_id,
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

  // Mode Lab → rediriger vers Mon Parcours (accueil Lab). Résolveur centralisé
  // (même source de vérité que layout.tsx / parcours / Élio) : le cookie ne peut
  // activer un mode que s'il est réellement disponible.
  const cfgFlags = configData as { lab_mode_available?: boolean; one_mode_available?: boolean } | null
  const cookieStore = await cookies()
  const { activeMode: effectiveMode } = resolveClientMode({
    dashboardType: clientConfig.dashboardType,
    labModeAvailable: cfgFlags?.lab_mode_available ?? false,
    oneModeAvailable: cfgFlags?.one_mode_available ?? false,
    cookieMode: cookieStore.get(MODE_TOGGLE_COOKIE)?.value,
  })

  if (effectiveMode === 'lab') {
    redirect('/modules/parcours')
  }

  // On est en mode One — filtrer les modules qui n'appartiennent pas au socle One affiché :
  //  • parcours = Lab uniquement (appartient au Lab, pas à One)
  //  • facturation = sorti du socle One (vision v2 2026-06-24). Même si `active_modules` en
  //    base le contient encore pour d'anciens clients, on ne l'affiche plus en carte d'accueil
  //    ni en raccourci : l'abonnement MPP vit désormais dans Paramètres → Mes factures.
  const HOME_HIDDEN_ONE_IDS = new Set(['parcours', 'facturation'])
  const clientConfigOne = {
    ...clientConfig,
    activeModules: clientConfig.activeModules.filter(id => !HOME_HIDDEN_ONE_IDS.has(id)),
  }

  // Données SSR de l'accueil, en parallèle (évite les flashs UI côté client) :
  //  • éligibilité au teasing Lab
  //  • « dernier mot d'Élio » côté One (hydrate le bandeau Concierge, Realtime ensuite)
  //  • consentement IA (conditionne le chat Élio dans la pop-up du bandeau)
  const [teasingResult, initialConciergeWord, iaConsentGranted] = await Promise.all([
    clientId ? getTeasingEligibility(clientId) : Promise.resolve(null),
    clientId ? getOneConciergeWord(clientId) : Promise.resolve(null),
    clientId ? hasIaConsent(clientId) : Promise.resolve(false),
  ])
  const showTeasing = teasingResult?.data?.showTeasing ?? false

  // Cycle de vie visuel du One (vision v2) — l'état "en chantier" est rendu par le bandeau
  // global du layout (coéquipier). L'accueil ne le duplique plus : il affiche le cockpit
  // (toujours accessible, le socle ne dépend pas du statut de livraison).

  return (
    <OneHome
      clientId={clientId}
      userId={user.id}
      clientName={clientName}
      clientConfig={clientConfigOne}
      showTeasing={showTeasing}
      initialConciergeWord={initialConciergeWord}
      iaConsentGranted={iaConsentGranted}
    />
  )
}
