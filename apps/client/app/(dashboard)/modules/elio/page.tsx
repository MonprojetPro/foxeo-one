import { redirect } from 'next/navigation'
import { createServerSupabaseClient, hasIaConsent } from '@monprojetpro/supabase'
import { cookies } from 'next/headers'
import { ElioChat, ELIO_MODEL_MICRO } from '@monprojetpro/module-elio'
import { MODE_TOGGLE_COOKIE } from '@monprojetpro/ui'
import { resolveClientMode } from '@monprojetpro/utils'
import { ElioVeille } from '../../../../components/elio-veille'

export default async function ElioClientPage() {
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

  // En mode Lab, le chat persistant avec historique « ne sert à rien » : le Concierge
  // s'utilise en pop-up ÉPHÉMÈRE depuis « Mon Parcours ». On supprime donc cette page
  // côté Lab (redirection).
  if (effectiveMode === 'lab') {
    redirect('/modules/parcours')
  }

  // One : Élio = pop-up UNIQUE éphémère partout (cohérence avec l'accueil — refonte 2026-06-29).
  // Pas de `userId` → chat éphémère sans liste de conversations ni historique (donc plus de
  // couleurs Lab violettes). `clientId` → contexte One complet (posture coach, modules, état
  // outil) + détection de demande d'évolution. `model` micro (Haiku) → réponse rapide.
  // NB : Élio Lab (l'ASSISTANT du dashboard) reste TOUJOURS disponible, même quand MiKL
  // coupe les agents du parcours (elio_lab_enabled). Seul le consentement IA le met en veille.
  const iaConsentGranted = clientId ? await hasIaConsent(clientId) : false

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {iaConsentGranted ? (
        <ElioChat dashboardType="one" clientId={clientId} model={ELIO_MODEL_MICRO} />
      ) : (
        <ElioVeille />
      )}
    </div>
  )
}
