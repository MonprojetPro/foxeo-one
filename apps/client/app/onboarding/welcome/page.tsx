import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { WelcomeScreen } from '../../components/onboarding/welcome-screen'

export const metadata = {
  title: 'Bienvenue sur MonprojetPro Lab',
  description: 'Découvrez votre espace Lab et commencez votre parcours.',
}

export default async function WelcomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Récupérer les infos du client pour personnaliser le message
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, onboarding_completed')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!client) {
    redirect('/login')
  }

  // Si déjà complété, rediriger vers le dashboard
  if (client.onboarding_completed) {
    redirect('/')
  }

  // Extraire le prénom du nom complet
  const firstName = client.name?.split(' ')[0] ?? 'là'

  return <WelcomeScreen firstName={firstName} />
}
