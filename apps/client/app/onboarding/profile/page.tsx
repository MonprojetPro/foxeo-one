import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { ProfileForm } from './profile-form'

export const metadata = {
  title: 'Vérifiez vos coordonnées — MonprojetPro',
  description: 'Corrigez ou complétez vos coordonnées avant d\'accéder à votre espace.',
}

export default async function OnboardingProfilePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id, client_kind, first_name, name, contact, email, phone, sector, website, onboarding_completed')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!client) {
    redirect('/login')
  }

  // Déjà passé par là — pas de raison d'y repasser (lien repris depuis le mail, bouton back…).
  if (client.onboarding_completed) {
    redirect('/')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-10">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-2xl font-bold">Vérifiez vos coordonnées</h1>
          <p className="text-sm text-muted-foreground">
            Dernière étape avant d'accéder à votre espace — corrigez ou complétez ce qui manque.
          </p>
        </div>
        <ProfileForm
          clientKind={client.client_kind === 'entity' ? 'entity' : 'individual'}
          firstName={client.first_name ?? ''}
          name={client.name ?? ''}
          contact={client.contact ?? ''}
          email={client.email ?? ''}
          phone={client.phone ?? ''}
          sector={client.sector ?? ''}
          website={client.website ?? ''}
        />
      </div>
    </div>
  )
}
