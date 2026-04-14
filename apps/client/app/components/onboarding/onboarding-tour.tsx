'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@monprojetpro/ui'
import { completeOnboarding } from '../../onboarding/actions/complete-onboarding'
import { useOnboardingTour } from '../../hooks/use-onboarding-tour'

interface TourStep {
  title: string
  description: string
  targetId?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Navigation',
    description: 'Accédez à tous vos outils depuis ce menu : parcours, documents, chat Élio et bien plus encore.',
    targetId: 'sidebar-navigation',
    position: 'right',
  },
  {
    title: 'Votre parcours Lab',
    description: 'Suivez étape par étape votre parcours de création. Chaque étape validée vous rapproche de votre objectif.',
    targetId: 'module-parcours',
    position: 'bottom',
  },
  {
    title: 'Chat Élio',
    description: 'Votre assistant IA est disponible 24/7 pour répondre à vos questions et vous guider.',
    targetId: 'elio-chat-button',
    position: 'left',
  },
  {
    title: 'Vos documents',
    description: 'Tous vos documents, briefs et livrables sont centralisés ici.',
    targetId: 'module-documents',
    position: 'bottom',
  },
  {
    title: 'Prêt à démarrer !',
    description: 'Vous êtes maintenant prêt à utiliser votre espace Lab. Bonne création !',
    position: 'bottom',
  },
]

interface OnboardingTourProps {
  isRestart?: boolean
}

export function OnboardingTour({ isRestart = false }: OnboardingTourProps) {
  const router = useRouter()
  const { isActive, currentStep, startTour, stopTour, nextStep, previousStep, markCompleted } = useOnboardingTour()
  const [isPending, startTransition] = useTransition()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  // Démarrer le tour automatiquement au montage
  useEffect(() => {
    startTour()
  }, [startTour])

  // Mettre à jour la position de la cible quand le step change
  useEffect(() => {
    if (!isActive) return

    const step = TOUR_STEPS[currentStep]
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
  }, [isActive, currentStep])

  function handleComplete() {
    markCompleted()
    startTransition(async () => {
      if (isRestart) {
        // Restart depuis Settings — pas besoin de mettre à jour la DB
        stopTour()
        toast.success('Bienvenue dans votre espace Lab !')
        router.push('/')
        return
      }
      const result = await completeOnboarding()
      stopTour()
      toast.success('Bienvenue dans votre espace Lab !')
      if (result.data) {
        router.push(result.data.redirectTo)
      } else {
        router.push('/')
      }
    })
  }

  if (!isActive) return null

  const step = TOUR_STEPS[currentStep]
  if (!step) return null

  const isLastStep = currentStep === TOUR_STEPS.length - 1
  const isFirstStep = currentStep === 0

  return (
    <>
      {/* Overlay sombre */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity"
        aria-hidden="true"
      />

      {/* Popover de tutoriel — centré si pas de cible */}
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
        aria-label={`Étape ${currentStep + 1} sur ${TOUR_STEPS.length}: ${step.title}`}
      >
        {/* Progression */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-foreground">
            Étape {currentStep + 1} / {TOUR_STEPS.length}
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

        {/* Barre de progression */}
        <div className="w-full bg-muted rounded-full h-1 mb-4">
          <div
            className="bg-primary rounded-full h-1 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Contenu */}
        <h3 className="font-semibold text-base mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

        {/* Actions */}
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
