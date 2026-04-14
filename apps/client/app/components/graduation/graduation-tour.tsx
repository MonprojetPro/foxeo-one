'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@monprojetpro/ui'
import { markGraduationScreenShown } from '../../graduation/actions/mark-graduation-screen-shown'
import { useGraduationTour } from '../../hooks/use-graduation-tour'

interface TourStep {
  title: string
  description: string
  targetId?: string
}

const ONE_TOUR_STEPS: TourStep[] = [
  {
    title: 'Votre dashboard One',
    description: 'Bienvenue dans votre espace professionnel MonprojetPro One. Toutes vos ressources business sont ici.',
    targetId: 'sidebar-navigation',
  },
  {
    title: 'CRM & Contacts',
    description: 'Gérez vos clients, prospects et partenaires depuis votre espace centralisé.',
    targetId: 'module-crm',
  },
  {
    title: 'Documents & Livrables',
    description: 'Retrouvez tous vos documents Lab et ajoutez vos nouveaux fichiers business.',
    targetId: 'module-documents',
  },
  {
    title: 'Élio+, votre assistant IA',
    description: 'Élio+ peut maintenant effectuer des actions avancées et générer des documents métiers pour vous.',
    targetId: 'elio-chat-button',
  },
  {
    title: 'Bienvenue dans MonprojetPro One !',
    description: 'Vous êtes prêt à démarrer votre aventure entrepreneuriale. Bonne réussite !',
  },
]

interface GraduationTourProps {
  activeModuleIds: string[]
}

export function GraduationTour({ activeModuleIds }: GraduationTourProps) {
  const router = useRouter()
  const { isActive, currentStep, startTour, stopTour, nextStep, previousStep, markCompleted } =
    useGraduationTour()
  const [isPending, startTransition] = useTransition()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const steps = useMemo(
    () =>
      ONE_TOUR_STEPS.filter(
        (s) => !s.targetId?.startsWith('module-') || activeModuleIds.some((id) => s.targetId?.includes(id))
      ),
    [activeModuleIds]
  )

  useEffect(() => {
    startTour()
  }, [startTour])

  useEffect(() => {
    if (!isActive) return

    const step = steps[currentStep]
    if (!step?.targetId) {
      setTargetRect(null)
      return
    }

    const el = document.getElementById(step.targetId)
    if (el) {
      setTargetRect(el.getBoundingClientRect())
    } else {
      setTargetRect(null)
    }
  }, [isActive, currentStep, steps])

  function handleComplete() {
    markCompleted()
    startTransition(async () => {
      await markGraduationScreenShown()
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
    <>
      <div className="fixed inset-0 bg-black/60 z-50 transition-opacity" aria-hidden="true" />

      <div
        className="fixed z-50 w-80 bg-popover border border-border rounded-xl shadow-xl p-6 text-foreground"
        style={
          targetRect
            ? {
                top: targetRect.bottom + 12,
                left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 336)),
              }
            : {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }
        }
        role="dialog"
        aria-label={`Étape ${currentStep + 1} sur ${steps.length}: ${step.title}`}
      >
        <div className="flex items-center justify-between mb-4">
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

        <div className="w-full bg-muted rounded-full h-1 mb-4">
          <div
            className="bg-primary rounded-full h-1 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <h3 className="font-semibold text-base mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

        <div className="flex items-center justify-between mt-6">
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
              {isPending ? 'Chargement...' : 'Terminer'}
            </Button>
          ) : (
            <Button size="sm" onClick={nextStep} disabled={isPending}>
              Suivant
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
