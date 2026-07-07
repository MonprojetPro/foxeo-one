import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { Button } from '@monprojetpro/ui'
import { OneModuleCard, type OneModule } from '../../components/graduation/one-module-card'

export const metadata = {
  title: 'Bienvenue dans MonprojetPro One',
  description: 'Découvrez les modules disponibles dans votre espace professionnel.',
}

// Catalogue aligné sur ALL_CLIENT_MANIFESTS (modules ciblant client-one).
// Descriptions orientées client — vision One v2 : console de pilotage + lien MiKL.
const MODULE_DEFINITIONS: OneModule[] = [
  {
    id: 'suivi-outil',
    name: "Suivi de l'outil",
    description: "Suivez en direct l'avancement du développement de votre outil",
    icon: '📈',
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'Vos documents et livrables, organisés et accessibles à tout moment',
    icon: '📄',
  },
  {
    id: 'elio',
    name: 'Élio+',
    description: 'Votre copilote IA : il connaît votre activité et fait le lien avec MiKL',
    icon: '🤖',
  },
  {
    id: 'chat',
    name: 'Chat',
    description: 'Messagerie directe avec MiKL, votre accompagnateur',
    icon: '💬',
  },
  {
    id: 'visio',
    name: 'Visioconférence',
    description: 'Vos réunions vidéo avec MiKL, accessibles en un clic',
    icon: '🎥',
  },
  {
    id: 'support',
    name: 'Support',
    description: "Un souci, une question ? Ouvrez une demande d'aide",
    icon: '🛟',
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 text-white p-8">
      <div className="max-w-5xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="text-6xl">🚀</div>
          <h1 className="text-5xl font-bold tracking-tight">Bienvenue dans MonprojetPro One</h1>
          <p className="text-xl text-green-200">
            Votre console de pilotage : vos livrables, votre activité et votre lien direct avec MiKL
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
