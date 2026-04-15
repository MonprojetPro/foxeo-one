import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { PasswordChangeForm } from '../../components/onboarding/password-change-form'

export const metadata = {
  title: 'Changer votre mot de passe — MonprojetPro',
  description: 'Premiere connexion : definissez votre mot de passe personnel.',
}

export default async function PasswordChangePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, password_change_required')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!client) {
    redirect('/login')
  }

  // Story 13.4 — si le flag est deja retombe, pas besoin de la page
  if (!client.password_change_required) {
    redirect('/')
  }

  const firstName = client.name?.split(' ')[0] ?? ''

  return <PasswordChangeForm firstName={firstName} />
}
