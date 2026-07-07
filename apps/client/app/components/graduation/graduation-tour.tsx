'use client'

import { useEffect, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@monprojetpro/ui'
import { markGraduationScreenShown } from '../../graduation/actions/mark-graduation-screen-shown'
import { useGraduationTour } from '../../hooks/use-graduation-tour'

interface TourStep {
  icon: string
  title: string
  description: string
  /** Étape affichée uniquement si ce module est actif pour le client */
  requiresModule?: string
  /** Étape affichée uniquement si le client garde l'accès au mode Lab */
  requiresLabMode?: boolean
}

const ONE_TOUR_STEPS: TourStep[] = [
  {
    icon: '🏠',
    title: 'Votre console de pilotage',
    description:
      'One est votre espace de pilotage : vos livrables, votre activité et votre lien direct avec MiKL, réunis au même endroit.',
  },
  {
    icon: '📄',
    title: 'Documents & livrables',
    description:
      'Tous les documents de votre parcours Lab restent accessibles, et vos nouveaux livrables arrivent ici au fil de l’accompagnement.',
    requiresModule: 'documents',
  },
  {
    icon: '💬',
    title: 'Le lien direct avec MiKL',
    description:
      'Une question, un besoin ? La messagerie vous connecte directement à MiKL, votre accompagnateur.',
    requiresModule: 'chat',
  },
  {
    icon: '🤖',
    title: 'Élio+, votre copilote',
    description:
      'Élio+ connaît votre activité et vous répond à tout moment depuis la bulle en bas de l’écran. Si besoin, il transmet directement à MiKL.',
    requiresModule: 'elio',
  },
  {
    icon: '🔄',
    title: 'Revenir sur votre parcours Lab',
    description:
      'Le sélecteur Lab / One dans la barre latérale vous permet de consulter à tout moment l’historique de votre incubation.',
    requiresLabMode: true,
  },
  {
    icon: '🚀',
    title: 'C’est parti !',
    description:
      'Votre espace est prêt. Bonne route — MiKL et Élio+ restent à vos côtés.',
  },
]

interface GraduationTourProps {
  activeModuleIds: string[]
  labModeAvailable: boolean
}

export function GraduationTour({ activeModuleIds, labModeAvailable }: GraduationTourProps) {
  const router = useRouter()

  const steps = useMemo(
    () =>
      ONE_TOUR_STEPS.filter(
        (s) =>
          (!s.requiresModule || activeModuleIds.includes(s.requiresModule)) &&
          (!s.requiresLabMode || labModeAvailable)
      ),
    [activeModuleIds, labModeAvailable]
  )

  const { isActive, currentStep, startTour, stopTour, nextStep, previousStep, markCompleted } =
    useGraduationTour(steps.length)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTour()
  }, [startTour])

  function handleComplete() {
    startTransition(async () => {
      const { error } = await markGraduationScreenShown()
      if (error) {
        // Ne PAS rediriger : tant que le flag n'est pas posé en base, le
        // middleware renverrait vers /graduation/celebrate en boucle.
        toast.error('Un problème est survenu, réessaie dans un instant.')
        return
      }
      markCompleted()
      stopTour()
      toast.success('Bienvenue dans MonprojetPro One 🚀')
      router.push('/')
    })
  }

  if (!isActive) return null

  const step = steps[currentStep]
  if (!step) return null

  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div
        className="w-full max-w-md bg-popover border border-border rounded-2xl shadow-2xl p-8 text-foreground"
        role="dialog"
        aria-label={`Étape ${currentStep + 1} sur ${steps.length}: ${step.title}`}
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-muted-foreground">
            Étape {currentStep + 1} / {steps.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleComplete}
            disabled={isPending}
          >
            Passer
          </Button>
        </div>

        <div className="w-full bg-muted rounded-full h-1 mb-8">
          <div
            className="bg-primary rounded-full h-1 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="text-5xl mb-4" aria-hidden="true">
          {step.icon}
        </div>
        <h3 className="font-semibold text-xl mb-3">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed min-h-16">{step.description}</p>

        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={previousStep}
            disabled={isFirstStep || isPending}
          >
            Précédent
          </Button>

          {isLastStep ? (
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {isPending ? 'Chargement...' : 'Accéder à mon dashboard'}
            </Button>
          ) : (
            <Button size="sm" onClick={nextStep} disabled={isPending}>
              Suivant
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
