'use client'

import Link from 'next/link'
import type { ParcoursStep } from '../types/parcours.types'

interface ElioParcoursPanelProps {
  clientFirstName?: string | null
  currentStep?: ParcoursStep | null
  allCompleted?: boolean
}

/**
 * ElioParcoursPanel — Message contextuel Élio sur la page Mon Parcours.
 * 3 états : parcours non démarré, étape en cours, toutes étapes complètes.
 * Le bouton "Parler à Élio" redirige vers le Chat Élio Lab.
 */
export function ElioParcoursPanel({ clientFirstName, currentStep, allCompleted }: ElioParcoursPanelProps) {
  const firstName = clientFirstName || 'vous'

  const message = allCompleted
    ? `Bonjour ${firstName} ! Bravo, toutes vos étapes sont complètes. Votre graduation vers One arrive bientôt !`
    : currentStep
      ? `Bonjour ${firstName} ! Vous progressez bien. Votre étape ${currentStep.stepNumber} (${currentStep.title}) attend votre attention. Cliquez sur « Continuer » pour que je vous guide.`
      : `Bonjour ${firstName} ! Bienvenue dans votre parcours. Commencez par l'étape 1 pour démarrer !`

  return (
    <div className="bg-[#141414] border border-[#2d2d2d] rounded-xl p-5">
      <div className="flex items-center gap-2.5">
        <div
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] text-white flex items-center justify-center text-[15px] font-bold shrink-0"
          aria-hidden="true"
        >
          E
        </div>
        <span className="text-[13px] font-semibold text-[#a78bfa] tracking-[0.02em]">Élio — Message du jour</span>
      </div>

      <div className="bg-[#1e1557] border border-[#3d2d6d] rounded-xl p-4 mt-3 text-sm text-[#e5e7eb] leading-relaxed">
        {message}
      </div>

      <Link
        href="/modules/elio"
        className="inline-flex items-center mt-3 border border-[#a78bfa] text-[#a78bfa] hover:bg-[#1e1557] text-sm px-4 py-2 rounded-lg transition-colors"
        aria-label="Ouvrir le chat Élio"
      >
        Parler à Élio →
      </Link>
    </div>
  )
}
