import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { GraduationTour } from '../../components/graduation/graduation-tour'
import { GraduationTourSkip } from '../../components/graduation/graduation-tour-skip'

export const metadata = {
  title: 'Tutoriel MonprojetPro One',
  description: 'Découvrez les fonctionnalités de votre espace MonprojetPro One.',
}

interface PageProps {
  searchParams: Promise<{ skip?: string }>
}

export default async function TourOnePage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id, graduated_at')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!client?.graduated_at) {
    redirect('/')
  }

  const { data: config } = await supabase
    .from('client_configs')
    .select('active_modules')
    .eq('client_id', client.id)
    .maybeSingle()

  const activeModuleIds: string[] = config?.active_modules ?? []

  // Skip=true → skip the tutorial and go directly to dashboard (handled via skip component)
  if (params.skip === 'true') {
    return <GraduationTourSkip />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-emerald-900 text-white">
      <GraduationTour activeModuleIds={activeModuleIds} />
    </div>
  )
}
