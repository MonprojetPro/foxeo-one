import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { Button } from '@monprojetpro/ui'
import { OneModuleCard, type OneModule } from '../../components/graduation/one-module-card'

export const metadata = {
  title: 'Bienvenue dans MonprojetPro One',
  description: 'Découvrez les modules disponibles dans votre espace professionnel.',
}

const MODULE_DEFINITIONS: OneModule[] = [
  {
    id: 'crm',
    name: 'CRM',
    description: 'Gérez vos contacts, clients et opportunités commerciales',
    icon: '👥',
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'Stockez, organisez et partagez vos documents importants',
    icon: '📄',
  },
  {
    id: 'elio',
    name: 'Élio+',
    description: 'Assistant IA avancé avec actions automatisées et génération de documents',
    icon: '🤖',
  },
  {
    id: 'chat',
    name: 'Chat',
    description: 'Messagerie directe avec votre accompagnateur MiKL',
    icon: '💬',
  },
  {
    id: 'visio',
    name: 'Visio',
    description: 'Réunions vidéo HD avec enregistrement et transcription automatique',
    icon: '🎥',
  },
]

export default async function DiscoverOnePage() {
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

  const visibleModules = MODULE_DEFINITIONS.filter(
    (m) => activeModuleIds.length === 0 || activeModuleIds.includes(m.id)
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-orange-900 text-white p-8">
      <div className="max-w-5xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="text-6xl">🚀</div>
          <h1 className="text-5xl font-bold tracking-tight">Bienvenue dans MonprojetPro One</h1>
          <p className="text-xl text-green-200">
            Votre espace professionnel tout-en-un pour gérer et développer votre activité
          </p>
        </div>

        {visibleModules.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleModules.map((module) => (
              <OneModuleCard key={module.id} module={module} />
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white text-white hover:bg-white/20 px-8 py-6 text-base"
          >
            <Link href="/graduation/tour-one">Commencer le tutoriel One</Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-500 text-white px-8 py-6 text-base font-semibold"
          >
            <Link href="/graduation/tour-one?skip=true">Accéder au dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
