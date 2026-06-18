'use client'

import Link from 'next/link'
import type { ParcoursStep } from '../types/parcours.types'

interface ElioParcoursPanelProps {
  clientFirstName?: string | null
  currentStep?: ParcoursStep | null
  allCompleted?: boolean
  /** Agents du parcours coupés par MiKL → le Concierge reste dispo, message adapté. */
  agentsPaused?: boolean
  /**
   * Ouvre la pop-up de chat avec le Concierge. Fourni par l'app (orchestration de la
   * Dialog au niveau page). Si absent (rendu isolé/test), le bouton renvoie vers /modules/elio.
   */
  onAskConcierge?: () => void
}

/**
 * ElioParcoursPanel — Bandeau UNIQUE d'Élio, le Concierge, sur la home « Mon Parcours ».
 *
 * Présentation façon « carte d'agent » : avatar du Concierge à DROITE, avec un bouton
 * « Pose-moi une question » dessous (ouvre la pop-up de chat). À GAUCHE : son nom, le
 * bonjour et le message de CONTEXTE actuel (étape en cours, agents en pause…).
 *
 * ⚠️ Le Concierge ≠ les agents du parcours (Élio Go-to-Market, Cible, Business, Legit…).
 * Quand les agents sont en pause, le Concierge le dit mais reste disponible pour les questions.
 */
export function ElioParcoursPanel({
  clientFirstName,
  currentStep,
  allCompleted,
  agentsPaused = false,
  onAskConcierge,
}: ElioParcoursPanelProps) {
  const greeting = `Bonjour${clientFirstName ? `, ${clientFirstName}` : ''} ! 👋`

  const isPendingReview = currentStep?.status === 'pending_review'
  const isRejected = currentStep?.status === 'rejected'

  // Message de CONTEXTE actuel (porte l'info d'étape, plus de label « Étape en cours » séparé).
  const message = agentsPaused
    ? `Les agents de ton parcours sont en pause — MiKL les a suspendus pour le moment. Tu gardes l'accès à tout ton parcours et à ton historique. Moi, le Concierge, je reste là pour répondre à tes questions.`
    : allCompleted
      ? 'Ton parcours est terminé 🎉 MiKL va étudier tout cela et revenir vers toi au plus vite. Tu peux toujours le contacter via le chat si tu as besoin.'
      : isPendingReview
        ? `Votre document pour l'étape ${currentStep!.stepNumber} (${currentStep!.title}) est en cours d'examen par MiKL. S'il a besoin de précisions, il vous contactera dans le chat — sinon vous serez notifié dès la décision.`
        : isRejected
          ? `MiKL a examiné votre soumission pour l'étape ${currentStep!.stepNumber} (${currentStep!.title}) et vous a laissé un feedback. Consultez l'historique, corrigez votre document et resoumettez.`
          : currentStep
            ? `Vous êtes à l'étape ${currentStep.stepNumber} : « ${currentStep.title} ». Cliquez sur « Continuer » pour que l'agent de l'étape vous guide.`
            : 'Bienvenue dans votre parcours. Commencez par l\'étape 1 pour démarrer !'

  // CTA secondaire (action parcours) — distinct du bouton « Pose-moi une question » (Concierge).
  // Masqué quand les agents sont en pause (pas d'invitation à avancer).
  const parcoursCta = agentsPaused
    ? null
    : allCompleted
      ? null // Parcours terminé : le parcours complet est déjà affiché juste en dessous → CTA redondant.
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
  const askBtnClass = agentsPaused
    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
    : 'bg-[#1e1557] border-[#a78bfa]/60 text-[#a78bfa] hover:bg-[#2a1f6b]'

  const askLabel = 'Pose-moi une question'

  return (
    <div className={`bg-[#141414] border ${accentBorder} rounded-xl p-5`}>
      <div className="flex items-start justify-between gap-4">
        {/* GAUCHE — identité + contexte */}
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] font-semibold ${roleColor} tracking-[0.01em] leading-tight`}>
            Élio, le Concierge
          </p>
          <p className="text-[12px] text-[#9ca3af] leading-tight">Ton assistant Lab</p>

          <div className={`${messageBox} border rounded-xl p-4 mt-3 text-sm text-[#e5e7eb] leading-relaxed`}>
            <p className="text-[15px] font-semibold text-[#f9fafb]">{greeting}</p>
            <p className="mt-2">{message}</p>
          </div>

          {parcoursCta && (
            <Link
              href={parcoursCta.href}
              className={`inline-flex items-center mt-3 border ${ctaClass} text-sm px-4 py-2 rounded-lg transition-colors`}
              aria-label={parcoursCta.label}
            >
              {parcoursCta.label}
            </Link>
          )}
        </div>

        {/* DROITE — avatar du Concierge + bouton « Pose-moi une question » */}
        <div className="flex flex-col items-center gap-2 shrink-0 w-[120px]">
          <img
            src="/elio/elio-concierge.png"
            alt="Élio, le Concierge"
            className="w-24 h-24 object-contain drop-shadow-[0_0_12px_rgba(167,139,250,0.25)]"
          />
          {onAskConcierge ? (
            <button
              type="button"
              onClick={onAskConcierge}
              className={`w-full border ${askBtnClass} text-[13px] font-medium px-3 py-2 rounded-lg transition-colors`}
            >
              {askLabel}
            </button>
          ) : (
            <Link
              href="/modules/elio"
              className={`w-full text-center border ${askBtnClass} text-[13px] font-medium px-3 py-2 rounded-lg transition-colors`}
            >
              {askLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
