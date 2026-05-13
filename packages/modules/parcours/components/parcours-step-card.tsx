'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@monprojetpro/utils'
import type { ParcoursStep } from '../types/parcours.types'

interface ParcoursStepCardProps {
  step: ParcoursStep
  className?: string
  unreadCount?: number
  isAbandoned?: boolean
}

export function ParcoursStepCard({ step, className, unreadCount = 0, isAbandoned = false }: ParcoursStepCardProps) {
  const router = useRouter()

  function handleClick() {
    router.push(`/modules/parcours/steps/${step.stepNumber}`)
  }

  // ÉTAT EN PAUSE — parcours abandonné : cartes cliquables (consultation) mais badge orange visible
  if (isAbandoned) {
    return (
      <div
        className={cn(
          'h-[158px] flex flex-col rounded-[14px] p-[18px] opacity-70 cursor-pointer transition-all hover:opacity-90',
          'bg-[#111111] border border-[rgba(251,146,60,0.35)]',
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        aria-label={`Étape ${step.stepNumber}: ${step.title} — parcours en pause, consultation uniquement`}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 bg-[rgba(251,146,60,0.15)] text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <rect x="2" y="5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 5V4a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            En pause
          </span>
          <span className="text-[11px] text-[#6b7280]">Étape {step.stepNumber}</span>
        </div>
        <div className="mt-3.5 text-[16px] font-medium text-[#9ca3af] leading-snug">{step.title}</div>
        <div className="text-[12px] text-[#6b7280] mt-1 line-clamp-2">{step.description}</div>
        <div className="flex-1" />
        <div className="text-[11px] text-orange-400/60 italic">Consultation uniquement →</div>
      </div>
    )
  }

  // ÉTAT COMPLÉTÉ — fond vert discret, badge "Complétée"
  if (step.status === 'completed') {
    return (
      <div
        className={cn(
          'h-[158px] flex flex-col rounded-[14px] p-[18px] cursor-pointer transition-all hover:brightness-105',
          'bg-[rgba(22,163,74,0.1)] border border-[rgba(34,197,94,0.45)]',
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        aria-label={`Étape ${step.stepNumber}: ${step.title} — complétée`}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 bg-[rgba(34,197,94,0.15)] text-[#4ade80] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 6l3 3 5-5" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Complétée
          </span>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <span
                className="w-5 h-5 rounded-full bg-[#fb923c] text-white text-[9px] font-bold flex items-center justify-center"
                aria-label={`${unreadCount} question(s) de MiKL non lue(s)`}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <span className="text-[11px] text-[#6b7280]">Étape {step.stepNumber}</span>
          </div>
        </div>
        <div className="mt-3.5 text-[16px] font-semibold text-[#f9fafb] leading-snug">{step.title}</div>
        <div className="text-[12px] text-[#9ca3af] mt-1 line-clamp-2">{step.description}</div>
        <div className="flex-1" />
        {step.completedAt && (
          <div className="text-[11px] text-[#4ade80] font-medium">
            Complétée le {new Date(step.completedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
          </div>
        )}
      </div>
    )
  }

  // ÉTAT EN ATTENTE DE VALIDATION — fond jaune, bordure jaune
  if (step.status === 'pending_review') {
    return (
      <div
        className={cn(
          'h-[158px] flex flex-col rounded-[14px] p-[18px] cursor-pointer transition-all hover:brightness-105',
          'bg-[rgba(234,179,8,0.08)] border border-[rgba(234,179,8,0.45)]',
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        aria-label={`Étape ${step.stepNumber}: ${step.title} — en attente de validation`}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 bg-[rgba(234,179,8,0.15)] text-yellow-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" aria-hidden="true" />
            En attente
          </span>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <span
                className="w-5 h-5 rounded-full bg-[#fb923c] text-white text-[9px] font-bold flex items-center justify-center"
                aria-label={`${unreadCount} question(s) de MiKL non lue(s)`}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <span className="text-[11px] text-yellow-300/70">Étape {step.stepNumber}</span>
          </div>
        </div>
        <div className="mt-3.5 text-[16px] font-semibold text-[#f9fafb] leading-snug">{step.title}</div>
        <div className="text-[12px] text-[#9ca3af] mt-1 line-clamp-2">{step.description}</div>
        <div className="flex-1" />
        <div className="text-[11px] text-yellow-300/80 italic">Doc envoyé — MiKL examine →</div>
      </div>
    )
  }

  // ÉTAT REFUSÉ (à corriger) — fond orange, bordure orange
  if (step.status === 'rejected') {
    return (
      <div
        className={cn(
          'h-[158px] flex flex-col rounded-[14px] p-[18px] cursor-pointer transition-all hover:brightness-105',
          'bg-[rgba(251,146,60,0.08)] border border-[rgba(251,146,60,0.5)]',
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        aria-label={`Étape ${step.stepNumber}: ${step.title} — à corriger après refus`}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 bg-[rgba(251,146,60,0.18)] text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1l5 9H1L6 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M6 5v2M6 8.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            À corriger
          </span>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <span
                className="w-5 h-5 rounded-full bg-[#fb923c] text-white text-[9px] font-bold flex items-center justify-center"
                aria-label={`${unreadCount} feedback(s) MiKL non lu(s)`}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <span className="text-[11px] text-orange-300/70">Étape {step.stepNumber}</span>
          </div>
        </div>
        <div className="mt-3.5 text-[16px] font-semibold text-[#f9fafb] leading-snug">{step.title}</div>
        <div className="text-[12px] text-[#9ca3af] mt-1 line-clamp-2">{step.description}</div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-orange-300 text-[12px] font-semibold">
          Voir le feedback
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    )
  }

  // ÉTAT QUESTION MIKL — fond bleu, bordure bleue
  if (step.status === 'needs_clarification') {
    return (
      <div
        className={cn(
          'h-[158px] flex flex-col rounded-[14px] p-[18px] cursor-pointer transition-all hover:brightness-105',
          'bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.5)]',
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        aria-label={`Étape ${step.stepNumber}: ${step.title} — MiKL a une question`}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 bg-[rgba(59,130,246,0.18)] text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4.5 4.5a1.5 1.5 0 113 0c0 1-1.5 1.5-1.5 2.5M6 9v.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Question MiKL
          </span>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <span
                className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center"
                aria-label={`${unreadCount} message(s) non lu(s)`}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <span className="text-[11px] text-blue-300/70">Étape {step.stepNumber}</span>
          </div>
        </div>
        <div className="mt-3.5 text-[16px] font-semibold text-[#f9fafb] leading-snug">{step.title}</div>
        <div className="text-[12px] text-[#9ca3af] mt-1 line-clamp-2">{step.description}</div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-blue-300 text-[12px] font-semibold">
          Voir la question
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    )
  }

  // ÉTAT EN COURS — fond violet, bordure violet
  if (step.status === 'current') {
    return (
      <div
        className={cn(
          'h-[158px] flex flex-col rounded-[14px] p-[17px] cursor-pointer transition-all hover:brightness-105',
          'bg-[#1e1557] border-2 border-[#7c3aed] shadow-[0_0_0_4px_rgba(124,58,237,0.12)]',
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        aria-label={`Étape ${step.stepNumber}: ${step.title} — en cours`}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center bg-[#7c3aed] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            En cours
          </span>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <span
                className="w-5 h-5 rounded-full bg-[#fb923c] text-white text-[9px] font-bold flex items-center justify-center"
                aria-label={`${unreadCount} question(s) de MiKL non lue(s)`}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <span className="text-[11px] text-[#a78bfa]">Étape {step.stepNumber}</span>
          </div>
        </div>
        <div className="mt-3.5 text-[16px] font-semibold text-[#f9fafb] leading-snug">{step.title}</div>
        <div className="text-[12px] text-[#9ca3af] mt-1 line-clamp-2">{step.description}</div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-[#a78bfa] text-[12px] font-semibold">
          Continuer
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    )
  }

  // ÉTAT IGNORÉ — orange discret
  if (step.status === 'skipped') {
    return (
      <div
        className={cn(
          'h-[158px] flex flex-col rounded-[14px] p-[18px] cursor-pointer transition-all hover:brightness-105',
          'bg-[rgba(251,146,60,0.05)] border border-[rgba(251,146,60,0.3)]',
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        aria-label={`Étape ${step.stepNumber}: ${step.title} — ignorée`}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center bg-[rgba(251,146,60,0.15)] text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            Ignorée
          </span>
          <span className="text-[11px] text-[#6b7280]">Étape {step.stepNumber}</span>
        </div>
        <div className="mt-3.5 text-[16px] font-medium text-[#f9fafb] leading-snug">{step.title}</div>
        <div className="flex-1" />
      </div>
    )
  }

  // ÉTAT EN ATTENTE — accessible mais pas encore commencé
  return (
    <div
      className={cn(
        'h-[158px] flex flex-col rounded-[14px] p-[18px] cursor-pointer transition-all hover:opacity-80',
        'bg-[#111111] border border-dashed border-[#374151] opacity-70',
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      aria-label={`Étape ${step.stepNumber}: ${step.title} — en attente`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center bg-muted/50 text-[#6b7280] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          À venir
        </span>
        <span className="text-[11px] text-[#6b7280]">Étape {step.stepNumber}</span>
      </div>
      <div className="mt-3.5 text-[16px] font-medium text-[#9ca3af] leading-snug">{step.title}</div>
      <div className="text-[12px] text-[#6b7280] mt-1 line-clamp-2">{step.description}</div>
      <div className="flex-1" />
      <div className="text-[11px] text-[#6b7280] italic">Commencer →</div>
    </div>
  )
}
