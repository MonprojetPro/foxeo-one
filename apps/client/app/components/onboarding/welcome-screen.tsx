'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@monprojetpro/ui'
import { completeOnboarding } from '../../onboarding/actions/complete-onboarding'

interface WelcomeScreenProps {
  firstName: string
}

export function WelcomeScreen({ firstName }: WelcomeScreenProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSkip() {
    startTransition(async () => {
      const result = await completeOnboarding()
      toast.success('Bienvenue dans votre espace Lab !')
      if (result.data) {
        router.push(result.data.redirectTo)
      } else {
        router.push('/')
      }
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-black text-white px-4">
      <div className="max-w-2xl w-full text-center space-y-10">
        {/* Header */}
        <div className="space-y-4">
          <div className="text-6xl">👋</div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Bienvenue {firstName} !
          </h1>
          <p className="text-lg text-purple-200 max-w-lg mx-auto">
            Votre espace MonprojetPro Lab est prêt. Découvrons ensemble ce que vous pouvez faire ici.
          </p>
        </div>

        {/* 3 points clés */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-left border border-white/10 hover:bg-white/15 transition-colors">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-semibold text-base mb-1">Parcours guidé</h3>
            <p className="text-sm text-purple-200">
              Suivez les étapes de votre parcours Lab pour structurer et valider votre projet.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-left border border-white/10 hover:bg-white/15 transition-colors">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="font-semibold text-base mb-1">Élio, votre assistant</h3>
            <p className="text-sm text-purple-200">
              Obtenez des conseils personnalisés et des réponses à vos questions 24/7.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-left border border-white/10 hover:bg-white/15 transition-colors">
            <div className="text-3xl mb-3">🤝</div>
            <h3 className="font-semibold text-base mb-1">Accompagnement MiKL</h3>
            <p className="text-sm text-purple-200">
              Validations, conseils et soutien tout au long de votre aventure.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            asChild
            size="lg"
            className="bg-purple-600 hover:bg-purple-500 text-white px-10 py-6 text-base font-semibold rounded-xl shadow-lg shadow-purple-900/50 transition-all hover:shadow-purple-700/50 hover:scale-105"
          >
            <Link href="/onboarding/tour">
              Commencer le tutoriel
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-300 hover:text-white hover:bg-white/10"
            onClick={handleSkip}
            disabled={isPending}
          >
            {isPending ? 'Redirection...' : 'Passer le tutoriel'}
          </Button>
        </div>
      </div>
    </div>
  )
}
