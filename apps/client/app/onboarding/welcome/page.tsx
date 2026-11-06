import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { WelcomeScreen } from '../../components/onboarding/welcome-screen'

export const metadata = {
  title: 'Bienvenue sur MonprojetPro',
  description: 'Découvrez votre espace et commencez.',
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ replay?: string }>
}) {
  const { replay } = await searchParams
  const isReplay = replay === '1'

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // T-078 — dashboard_type choisit le CONTENU présenté (Lab vs One), pas l'accès :
  // c'est exactement son rôle documenté (défaut d'affichage), jamais une décision
  // d'autorisation (celle-ci reste lab_mode_available/one_mode_available ailleurs).
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, first_name, onboarding_completed, client_configs(dashboard_type)')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!client) {
    redirect('/login')
  }

  // Hors replay, déjà complété → rediriger vers le dashboard. En replay (depuis les
  // réglages), l'écran reste purement informatif, peu importe onboarding_completed.
  if (client.onboarding_completed && !isReplay) {
    redirect('/')
  }

  const config = Array.isArray(client.client_configs) ? client.client_configs[0] : client.client_configs
  const variant: 'lab' | 'one' = config?.dashboard_type === 'one' ? 'one' : 'lab'
  const firstName = client.first_name?.trim() || client.name?.split(' ')[0] || 'là'

  return <WelcomeScreen firstName={firstName} variant={variant} mode={isReplay ? 'replay' : 'onboarding'} />
}
