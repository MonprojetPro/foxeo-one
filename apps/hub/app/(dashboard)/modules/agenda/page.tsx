import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { redirect } from 'next/navigation'
import { AgendaPage } from '@/components/agenda/agenda-page'

export default async function AgendaPageRoute() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <AgendaPage userId={user.id} />
}
