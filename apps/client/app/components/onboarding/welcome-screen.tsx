'use client'

import { useRouter } from 'next/navigation'

interface Feature {
  icon: string
  title: string
  description: string
}

const LAB_FEATURES: Feature[] = [
  {
    icon: '🎯',
    title: 'Un parcours guidé, étape par étape',
    description:
      "Chaque étape (offre, cible, business model, identité, acquisition...) est validée avant de passer à la suivante. Vous avancez à votre rythme, jamais seul.",
  },
  {
    icon: '🧠',
    title: 'Élio, votre copilote de création',
    description:
      "Élio n'est pas un chatbot générique : il connaît l'historique de votre parcours et vous aide à structurer vos idées en documents clairs à chaque étape, 24/7. Il répond à vos questions sur VOTRE projet, et sait reconnaître quand une décision a besoin de l'avis de MiKL plutôt que du sien.",
  },
  {
    icon: '📄',
    title: 'Vos documents centralisés',
    description:
      'Tous vos livrables (briefs, étapes validées) sont rassemblés au même endroit, consultables à tout moment.',
  },
  {
    icon: '🤝',
    title: 'Accompagnement MiKL',
    description:
      'Chaque étape que vous soumettez est relue, validée ou commentée par MiKL — un vrai regard humain, pas une simple case cochée.',
  },
]

const ONE_FEATURES: Feature[] = [
  {
    icon: '📊',
    title: 'Le pilotage de vos livrables',
    description:
      'Retrouvez tout ce qui a été construit pour vous (documents, modules actifs) au même endroit, à jour en permanence.',
  },
  {
    icon: '🧠',
    title: 'Élio, une extension de MiKL',
    description:
      "Élio répond à vos questions du quotidien sur votre outil et peut relayer une demande au chat avec MiKL si besoin — toujours avec votre accord. Ce n'est pas un chatbot générique : il connaît votre espace et votre historique.",
  },
  {
    icon: '🔗',
    title: 'Un lien direct avec MiKL',
    description:
      'Chat, support, visio : vous restez en contact permanent, pas juste un outil livré puis laissé de côté.',
  },
]

interface WelcomeScreenProps {
  firstName: string
  variant: 'lab' | 'one'
  /** 'onboarding' = premier accès (mène vers la création du mot de passe). 'replay' = revu depuis les réglages (juste informatif). */
  mode: 'onboarding' | 'replay'
}

export function WelcomeScreen({ firstName, variant, mode }: WelcomeScreenProps) {
  const router = useRouter()
  const isLab = variant === 'lab'
  const features = isLab ? LAB_FEATURES : ONE_FEATURES
  const accent = isLab ? 'purple' : 'green'

  function handleContinue() {
    if (mode === 'replay') {
      router.push('/')
      return
    }
    router.push('/reset-password')
  }

  return (
    <div
      className={
        isLab
          ? 'flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-black text-white px-4 py-10'
          : 'flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-black text-white px-4 py-10'
      }
    >
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="text-6xl">👋</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Bienvenue {firstName} !
          </h1>
          <p className={`text-lg max-w-lg mx-auto ${isLab ? 'text-purple-200' : 'text-emerald-200'}`}>
            {isLab
              ? 'Votre espace d\'incubation MonprojetPro Lab est prêt. Voici ce que vous allez y trouver.'
              : 'Votre espace professionnel MonprojetPro One est prêt. Voici ce que vous allez y trouver.'}
          </p>
        </div>

        {/* Fonctionnalités */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 text-left">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`rounded-xl p-6 border transition-colors ${
                isLab
                  ? 'bg-white/10 backdrop-blur-sm border-white/10 hover:bg-white/15'
                  : 'bg-white/10 backdrop-blur-sm border-white/10 hover:bg-white/15'
              }`}
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-base mb-1">{feature.title}</h3>
              <p className={`text-sm ${isLab ? 'text-purple-200' : 'text-emerald-200'}`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-center pt-4">
          <button
            type="button"
            onClick={handleContinue}
            className={`px-10 py-4 text-base font-semibold rounded-xl shadow-lg transition-all hover:scale-105 ${
              accent === 'purple'
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/50 hover:shadow-purple-700/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50 hover:shadow-emerald-700/50'
            }`}
          >
            {mode === 'replay' ? 'Retour à mon espace' : 'On y va'}
          </button>
        </div>
      </div>
    </div>
  )
}
