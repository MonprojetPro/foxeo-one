import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { GraduationCelebrate } from '../../components/graduation/graduation-celebrate'

export const metadata = {
  title: 'Félicitations — MonprojetPro One',
  description: 'Vous avez terminé votre parcours Lab et accédez à MonprojetPro One.',
}

export default async function GraduationCelebratePage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, graduated_at, graduation_screen_shown, graduation_message, first_login_at')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!client) {
    redirect('/login')
  }

  // If graduation screen already shown, redirect to dashboard
  if (client.graduation_screen_shown) {
    redirect('/')
  }

  // If not graduated, redirect to dashboard
  if (!client.graduated_at) {
    redirect('/')
  }

  const firstName = client.name?.split(' ')[0] ?? 'là'

  return (
    <GraduationCelebrate
      firstName={firstName}
      graduationMessage={client.graduation_message}
      firstLoginAt={client.first_login_at}
      graduatedAt={client.graduated_at}
    />
  )
}
