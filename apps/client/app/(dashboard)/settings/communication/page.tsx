import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getCommunicationProfile } from '@monprojetpro/module-elio'
import { CommunicationProfileForm } from './communication-profile-form'

export const metadata = {
  title: 'Profil de communication Élio — MonprojetPro',
  description: 'Personnalisez les réponses d\'Élio selon vos préférences',
}

export default async function CommunicationSettingsPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!client) {
    redirect('/login')
  }

  const { data: profile } = await getCommunicationProfile({ clientId: client.id })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Profil de communication Élio</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personnalisez la façon dont Élio vous répond. Ces préférences s&apos;appliquent immédiatement.
        </p>
      </div>
      <CommunicationProfileForm clientId={client.id} initialProfile={profile} />
    </div>
  )
}
