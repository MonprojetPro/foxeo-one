'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@monprojetpro/ui'
import type { ParcoursStep } from '../types/parcours.types'
import { ParcoursStepStatusBadge } from './parcours-step-status-badge'
import { BriefMarkdownRenderer } from './brief-markdown-renderer'
import { BriefAssetsGallery } from './brief-assets-gallery'
import { OneTeasingCard } from './one-teasing-card'
import { StepNavigationButtons } from './step-navigation-buttons'
import { StepElioChat } from './step-elio-chat'
import { GenerateDocumentButton } from './generate-document-button'
import { StepHistoryPanel } from './step-history-panel'

interface AdjacentStep {
  stepNumber: number
  status: ParcoursStep['status']
}

interface ParcoursStepDetailProps {
  step: ParcoursStep
  totalSteps: number
  prevStep?: AdjacentStep | null
  nextStep?: AdjacentStep | null
  clientId?: string
}

export function ParcoursStepDetail({ step, totalSteps, prevStep, nextStep, clientId }: ParcoursStepDetailProps) {
  const [messageCount, setMessageCount] = useState(0)
  return (
    <div className="-m-6 flex overflow-hidden" style={{ height: 'calc(100vh - 60px)' }}>
      {/* Left column — step content */}
      <div className="flex-1 min-w-0 overflow-y-auto p-7 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#3d2d6d] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#7c3aed]">
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

        {/* Chat Élio embarqué — Story 14.4 */}
        {clientId && (
          <StepElioChat
            stepId={step.id}
            stepStatus={step.status}
            stepNumber={step.stepNumber}
            clientId={clientId}
            onMessagesLoaded={setMessageCount}
          />
        )}

        {/* Bouton Générer mon document — Story 14.7 (visible aussi en pending_review pour le feedback) */}
        {clientId && (step.status === 'current' || step.status === 'pending_review') && (
          <GenerateDocumentButton
            stepId={step.id}
            stepStatus={step.status}
            clientId={clientId}
            messageCount={messageCount}
            stepNumber={step.stepNumber}
          />
        )}

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

      {/* Right column — Historique de l'étape (Story 14.8) */}
      <StepHistoryPanel stepId={step.id} stepNumber={step.stepNumber} />
    </div>
  )
}
