'use client'

import Link from 'next/link'
import { Button } from '@monprojetpro/ui'
import type { ParcoursStep } from '../types/parcours.types'
import { ParcoursStepStatusBadge } from './parcours-step-status-badge'
import { BriefMarkdownRenderer } from './brief-markdown-renderer'
import { BriefAssetsGallery } from './brief-assets-gallery'
import { OneTeasingCard } from './one-teasing-card'
import { StepNavigationButtons } from './step-navigation-buttons'

interface AdjacentStep {
  stepNumber: number
  status: ParcoursStep['status']
}

interface ParcoursStepDetailProps {
  step: ParcoursStep
  totalSteps: number
  prevStep?: AdjacentStep | null
  nextStep?: AdjacentStep | null
}

export function ParcoursStepDetail({ step, totalSteps, prevStep, nextStep }: ParcoursStepDetailProps) {
  return (
    <div className="-m-6 flex overflow-hidden" style={{ height: 'calc(100vh - 60px)' }}>
      {/* Left column — step content */}
      <div className="flex-1 min-w-0 overflow-y-auto p-7">
        {/* Breadcrumb */}
        <nav className="text-xs text-[#6b7280] mb-3">
          <Link href="/modules/parcours" className="hover:text-[#f9fafb] transition-colors">
            Mon Parcours
          </Link>
          <span className="mx-1.5">›</span>
          <span className="text-[#a78bfa]">Étape {step.stepNumber} : {step.title}</span>
        </nav>

        {/* Step header */}
        <div className="bg-[#1e1557] border-2 border-[#7c3aed] rounded-2xl p-[22px] mt-3 shadow-[0_0_0_4px_rgba(124,58,237,0.12)]">
          <ParcoursStepStatusBadge status={step.status} />
          <div className="flex items-center gap-3 mt-3 mb-1.5">
            <span className="text-4xl font-bold text-[#3d2d6d] leading-none select-none">
              {String(step.stepNumber).padStart(2, '0')}
            </span>
            <h1 className="text-xl font-bold text-[#f9fafb] leading-tight">{step.title}</h1>
          </div>
        </div>

        {/* Pourquoi cette étape ? */}
        <section className="mt-6 rounded-xl border border-[#2d2d2d] bg-[#141414]/50 p-5">
          <h2 className="text-base font-semibold text-[#f9fafb] mb-2">Pourquoi cette étape ?</h2>
          <p className="text-sm text-[#9ca3af] leading-relaxed">{step.description}</p>
        </section>

        {/* Brief content (markdown) */}
        {step.briefContent && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-[#f9fafb] mb-4">Votre brief</h2>
            <BriefMarkdownRenderer content={step.briefContent} />
          </section>
        )}

        {/* Fallback: brief_template if no brief_content */}
        {!step.briefContent && step.briefTemplate && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wide mb-2">
              Modèle de brief
            </h2>
            <div className="rounded-xl border border-[#2d2d2d] bg-[#141414] p-4">
              <pre className="text-sm text-[#f9fafb] whitespace-pre-wrap font-sans">
                {step.briefTemplate}
              </pre>
            </div>
          </section>
        )}

        {/* Assets gallery */}
        {step.briefAssets.length > 0 && (
          <div className="mt-6">
            <BriefAssetsGallery assets={step.briefAssets} />
          </div>
        )}

        {/* Teasing MonprojetPro One */}
        <div className="mt-6">
          <OneTeasingCard message={step.oneTeasingMessage} />
        </div>

        {/* CTA */}
        <div className="mt-7 flex items-center gap-4">
          {step.status === 'locked' && (
            <Button disabled variant="secondary">Étape verrouillée</Button>
          )}
          {step.status === 'current' && (
            <Link href={`/modules/parcours/steps/${step.stepNumber}/submit`}>
              <Button size="lg" className="bg-[#7c3aed] hover:bg-[#8b4df0] text-white border-0">
                Commencer cette étape
              </Button>
            </Link>
          )}
          {(step.status === 'completed' || step.status === 'skipped') && (
            <Link href={`/modules/parcours/steps/${step.stepNumber}/submission`}>
              <Button variant="outline">Voir ma soumission</Button>
            </Link>
          )}
        </div>

        {/* Navigation prev/next */}
        <div className="mt-8">
          <StepNavigationButtons
            currentStepNumber={step.stepNumber}
            totalSteps={totalSteps}
            prevStep={prevStep}
            nextStep={nextStep}
          />
        </div>

        <div className="h-10" />
      </div>

      {/* Right column — Élio chat panel (hidden on small screens) */}
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col bg-[#141414] border-l border-[#2d2d2d] overflow-hidden">
        {/* Panel header */}
        <div className="h-[52px] shrink-0 bg-[#1a1033] border-b border-[#2d2d2d] px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] flex items-center justify-center text-white font-bold text-[11px] shrink-0">
              E
            </div>
            <span className="text-[#a78bfa] font-semibold text-sm">
              Chat Élio — Étape {step.stepNumber}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" aria-hidden="true" />
            En ligne
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-3.5">
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] flex items-center justify-center text-white font-bold text-[11px] shrink-0">
              E
            </div>
            <div className="bg-[#1e1557] border border-[#3d2d6d] rounded-xl rounded-tl-[4px] px-3 py-2.5 text-sm text-[#e5e7eb] leading-relaxed max-w-[310px]">
              {step.status === 'locked' && "Cette étape n'est pas encore accessible. Je serai là dès que vous serez prêt."}
              {step.status === 'current' && "Bonjour ! Je suis là pour vous accompagner sur cette étape. Ouvrez le chat complet pour que je vous guide pas à pas."}
              {step.status === 'completed' && "Bravo pour cette étape ! Ouvrez le chat si vous avez des questions sur votre soumission."}
              {step.status === 'skipped' && "Cette étape a été passée. Ouvrez le chat si vous souhaitez y revenir."}
            </div>
          </div>
        </div>

        {/* CTA vers chat complet */}
        <div className="shrink-0 border-t border-[#2d2d2d] p-3.5">
          <Link
            href="/modules/elio"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#7c3aed] text-[#a78bfa] hover:bg-[#1e1557] text-sm font-semibold py-2.5 transition-colors"
            aria-label="Ouvrir le chat Élio complet"
          >
            Ouvrir le chat Élio complet →
          </Link>
        </div>
      </div>
    </div>
  )
}
