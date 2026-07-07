'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@monprojetpro/ui'
import { GraduationConfetti } from './graduation-confetti'
import { GraduationRecap } from './graduation-recap'
import { markGraduationScreenShown } from '../../graduation/actions/mark-graduation-screen-shown'

interface GraduationCelebrateProps {
  firstName: string
  graduationMessage: string | null
  firstLoginAt: string | null
  graduatedAt: string
}

export function GraduationCelebrate({
  firstName,
  graduationMessage,
  firstLoginAt,
  graduatedAt,
}: GraduationCelebrateProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Thème One appliqué par ThemeOneSetter dans le layout /graduation

  function handleDiscoverOne() {
    router.push('/graduation/discover-one')
  }

  function handleSkip() {
    startTransition(async () => {
      const { error } = await markGraduationScreenShown()
      if (error) {
        // Ne PAS rediriger : le middleware ramènerait ici en boucle
        toast.error('Un problème est survenu, réessaie dans un instant.')
        return
      }
      toast.success('Bienvenue dans MonprojetPro One 🚀')
      router.push('/')
    })
  }

  return (
    <>
      <GraduationConfetti />

      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-emerald-900 text-white px-4">
        <div className="max-w-3xl w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="text-7xl">🎉</div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Félicitations {firstName} !
            </h1>
            <p className="text-xl text-purple-200">
              Vous avez terminé votre parcours Lab avec succès
            </p>
          </div>

          {graduationMessage && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-left">
              <p className="text-lg italic leading-relaxed">&ldquo;{graduationMessage}&rdquo;</p>
              <p className="text-sm text-purple-300 mt-3">— MiKL, votre accompagnateur</p>
            </div>
          )}

          <GraduationRecap firstLoginAt={firstLoginAt} graduatedAt={graduatedAt} />

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={handleDiscoverOne}
              className="bg-gradient-to-r from-green-600 to-orange-600 hover:from-green-500 hover:to-orange-500 text-white px-10 py-6 text-lg font-semibold rounded-xl shadow-lg transition-all hover:scale-105"
            >
              Découvrir MonprojetPro One
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-300 hover:text-white hover:bg-white/10"
              onClick={handleSkip}
              disabled={isPending}
            >
              {isPending ? 'Redirection...' : 'Accéder directement au dashboard'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
