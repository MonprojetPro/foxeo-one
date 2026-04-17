'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, Lock, Play, Rocket } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import type { ParcoursStep } from '../types/parcours.types'

interface ParcoursStepCardProps {
  step: ParcoursStep
  className?: string
}

export function ParcoursStepCard({ step, className }: ParcoursStepCardProps) {
  const router = useRouter()
  // Step 6+ = graduation milestone (adjust if template changes total step count)
  const isGraduation = step.stepNumber >= 6 && step.status === 'locked'

  function handleClick() {
    if (step.status === 'current' || step.status === 'completed' || step.status === 'skipped') {
      router.push(`/modules/parcours/steps/${step.stepNumber}`)
    }
  }

  // ÉTAT VALIDÉ
  if (step.status === 'completed') {
    return (
      <div
        className={cn(
          'relative border-2 border-[#22c55e] bg-[#0f1f0f] rounded-xl p-4 cursor-pointer transition-all hover:brightness-110',
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        aria-label={`Étape ${step.stepNumber}: ${step.title} — validée`}
      >
        <CheckCircle2 size={16} className="absolute top-3 right-3 text-[#22c55e]" aria-hidden="true" />
        <span className="inline-flex bg-[#14532d] border border-[#22c55e] text-[#22c55e] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          Validée
        </span>
        <h3 className="text-[15px] font-medium text-[#f9fafb] mt-2">
          {step.title}
        </h3>
        {/* Show description for the first completed step to keep compact cards */}
        {step.stepNumber === 1 && (
          <p className="text-xs text-[#9ca3af] mt-1 line-clamp-2">{step.description}</p>
        )}
        {step.completedAt && (
          <p className="text-[10px] text-[#6b7280] mt-2">
            Validée le {new Date(step.completedAt).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>
    )
  }

  // ÉTAT EN COURS
  if (step.status === 'current') {
    return (
      <div
        className={cn(
          'relative border-2 border-[#7c3aed] bg-[#1e1557] rounded-xl p-4 cursor-pointer transition-all hover:brightness-110 shadow-[0_0_12px_rgba(124,58,237,0.2)]',
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        aria-label={`Étape ${step.stepNumber}: ${step.title} — en cours`}
      >
        <span className="inline-flex bg-[#7c3aed] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          En cours
        </span>
        <h3 className="text-[15px] font-medium text-[#f9fafb] mt-2">
          {step.title}
        </h3>
        <p className="text-xs text-[#9ca3af] mt-1 line-clamp-2">{step.description}</p>
        <div className="inline-flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-medium px-4 py-2 rounded-lg mt-3 transition-all hover:shadow-[0_0_16px_rgba(124,58,237,0.6)]">
          <Play size={14} aria-hidden="true" />
          Continuer →
        </div>
      </div>
    )
  }

  // ÉTAT IGNORÉ
  if (step.status === 'skipped') {
    return (
      <div
        className={cn(
          'relative border border-orange-500/30 bg-orange-950/10 rounded-xl p-4 cursor-pointer transition-all hover:brightness-110',
          className
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        aria-label={`Étape ${step.stepNumber}: ${step.title} — ignorée`}
      >
        <span className="inline-flex bg-orange-950 border border-orange-500/30 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          Ignorée
        </span>
        <h3 className="text-[15px] font-medium text-[#f9fafb] mt-2">
          {step.title}
        </h3>
      </div>
    )
  }

  // ÉTAT VERROUILLÉ
  return (
    <div
      className={cn(
        'relative border border-dashed border-[#374151] bg-[#111111] rounded-xl p-4 opacity-60 cursor-not-allowed',
        className
      )}
      aria-label={`Étape ${step.stepNumber} verrouillée`}
      title={step.stepNumber === 1 ? 'Cette étape sera bientôt disponible' : `Complétez l'étape ${step.stepNumber - 1} avant de continuer`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex text-[#4b5563] text-[10px] uppercase font-bold border border-dashed border-[#374151] px-2 py-0.5 rounded-full">
          Verrouillée
        </span>
        <div className="flex items-center gap-1">
          {isGraduation && <Rocket size={14} className="text-[#4b5563]" aria-hidden="true" />}
          <Lock size={16} className="text-[#4b5563]" aria-hidden="true" />
        </div>
      </div>
      <h3 className="text-[15px] text-[#4b5563] mt-2">
        {step.title}
      </h3>
    </div>
  )
}
