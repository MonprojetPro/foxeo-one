'use client'

import Link from 'next/link'
import type { ParcoursStep } from '../types/parcours.types'

interface ElioParcoursPanelProps {
  clientFirstName?: string | null
  currentStep?: ParcoursStep | null
  allCompleted?: boolean
  /** Agents du parcours coupés par MiKL → le Concierge reste dispo, message adapté. */
  agentsPaused?: boolean
}

/**
 * ElioParcoursPanel — Bandeau UNIQUE d'Élio, le Concierge, sur la home « Mon Parcours ».
 *
 * C'est la SEULE voix qui s'adresse au client sur cette page : il porte le bonjour,
 * l'étape en cours et le message contextuel. Il remplace l'ancien trio (titre « Bonjour »
 * + bannière de pause en haut de page + ancien panel « Message du jour »).
 *
 * ⚠️ Le Concierge ≠ les agents du parcours (Élio Go-to-Market, Cible, Business, Legit…).
 * Quand les agents sont en pause, le Concierge le dit mais reste disponible pour les questions.
 */
export function ElioParcoursPanel({
  clientFirstName,
  currentStep,
  allCompleted,
  agentsPaused = false,
}: ElioParcoursPanelProps) {
  const firstName = clientFirstName || 'vous'
  const greeting = `Bonjour${clientFirstName ? `, ${clientFirstName}` : ''} ! 👋`

  const isPendingReview = currentStep?.status === 'pending_review'
  const isRejected = currentStep?.status === 'rejected'

  // Message contextuel (sans répéter le bonjour, déjà affiché au-dessus).
  const message = agentsPaused
    ? `Les agents de ton parcours sont en pause — MiKL les a suspendus pour le moment. Tu gardes l'accès à tout ton parcours et à ton historique. Moi, le Concierge, je reste là pour répondre à tes questions.`
    : allCompleted
      ? 'Bravo, toutes vos étapes sont complètes. Votre graduation vers One arrive bientôt !'
      : isPendingReview
        ? `Votre document pour l'étape ${currentStep!.stepNumber} (${currentStep!.title}) est en cours d'examen par MiKL. S'il a besoin de précisions, il vous contactera dans le chat — sinon vous serez notifié dès la décision.`
        : isRejected
          ? `MiKL a examiné votre soumission pour l'étape ${currentStep!.stepNumber} (${currentStep!.title}) et vous a laissé un feedback. Consultez l'historique, corrigez votre document et resoumettez.`
          : currentStep
            ? `Vous progressez bien. Votre étape ${currentStep.stepNumber} (${currentStep.title}) attend votre attention. Cliquez sur « Continuer » pour que l'agent de l'étape vous guide.`
            : 'Bienvenue dans votre parcours. Commencez par l\'étape 1 pour démarrer !'

  // CTA contextuel.
  const cta = agentsPaused
    ? { href: '/modules/elio', label: 'Poser une question à Élio →' }
    : allCompleted
      ? { href: '/modules/parcours', label: 'Voir mon parcours →' }
      : isPendingReview
        ? { href: '/modules/parcours', label: 'Voir l\'historique →' }
        : isRejected
          ? { href: '/modules/parcours', label: 'Voir le feedback →' }
          : currentStep
            ? { href: `/modules/parcours/steps/${currentStep.stepNumber}`, label: 'Continuer →' }
            : { href: '/modules/parcours/steps/1', label: 'Démarrer →' }

  const accentBorder = agentsPaused ? 'border-amber-500/30' : 'border-[#2d2d2d]'
  const roleColor = agentsPaused ? 'text-amber-400' : 'text-[#a78bfa]'
  const messageBox = agentsPaused
    ? 'bg-amber-500/5 border-amber-500/20'
    : 'bg-[#1e1557] border-[#3d2d6d]'
  const ctaClass = agentsPaused
    ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
    : 'border-[#a78bfa] text-[#a78bfa] hover:bg-[#1e1557]'

  return (
    <div className={`bg-[#141414] border ${accentBorder} rounded-xl p-5`}>
      <div className="flex items-center gap-3">
        {/* Avatar du Concierge (image dédiée, distincte des agents du parcours). */}
        <img
          src="/elio/elio-lab.png"
          alt="Élio, le Concierge"
          className="w-12 h-12 rounded-full object-cover shrink-0 ring-1 ring-white/10 bg-[#1a1a1a]"
        />
        <div className="min-w-0">
          <p className={`text-[14px] font-semibold ${roleColor} tracking-[0.01em] leading-tight`}>
            Élio, le Concierge
          </p>
          <p className="text-[12px] text-[#9ca3af] leading-tight">Ton assistant Lab</p>
        </div>
      </div>

      <div className={`${messageBox} border rounded-xl p-4 mt-3 text-sm text-[#e5e7eb] leading-relaxed`}>
        <p className="text-[15px] font-semibold text-[#f9fafb]">{greeting}</p>
        {currentStep && !allCompleted && (
          <p className="text-[12px] text-[#9ca3af] mt-0.5">Étape en cours : {currentStep.title}</p>
        )}
        <p className="mt-2">{message}</p>
      </div>

      <Link
        href={cta.href}
        className={`inline-flex items-center mt-3 border ${ctaClass} text-sm px-4 py-2 rounded-lg transition-colors`}
        aria-label={cta.label}
      >
        {cta.label}
      </Link>
    </div>
  )
}
