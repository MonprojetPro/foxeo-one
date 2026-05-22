'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@monprojetpro/ui'
import type { ParcoursStep, ParcoursStepStatus } from '../types/parcours.types'
import { ParcoursStepStatusBadge } from './parcours-step-status-badge'
import { BriefMarkdownRenderer } from './brief-markdown-renderer'
import { BriefAssetsGallery } from './brief-assets-gallery'
import { StepNavigationButtons } from './step-navigation-buttons'
import { StepElioChat } from './step-elio-chat'
import { GenerateDocumentButton } from './generate-document-button'
import { StepHistoryPanel } from './step-history-panel'
import { StepMobileTabs, type MobileTab } from './step-mobile-tabs'

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
  isPaused?: boolean
}

interface StepConfig {
  showGenerateButton: boolean
  showSubmissionLink: boolean
}

const stepStatusConfig: Record<ParcoursStepStatus, StepConfig> = {
  locked: {
    showGenerateButton: false,
    showSubmissionLink: false,
  },
  current: {
    showGenerateButton: true,
    showSubmissionLink: false,
  },
  pending_review: {
    showGenerateButton: false,
    showSubmissionLink: false,
  },
  // rejected : MiKL a refusé → le client peut regénérer un document corrigé et resoumettre
  rejected: {
    showGenerateButton: true,
    showSubmissionLink: false,
  },
  completed: {
    showGenerateButton: false,
    showSubmissionLink: true,
  },
  skipped: {
    showGenerateButton: false,
    showSubmissionLink: true,
  },
}

export function ParcoursStepDetail({ step, totalSteps, prevStep, nextStep, clientId, isPaused = false }: ParcoursStepDetailProps) {
  const [messageCount, setMessageCount] = useState(0)
  const [mobileTab, setMobileTab] = useState<MobileTab>('step')
  const [avatarReady, setAvatarReady] = useState(false)
  const [agentImagePath, setAgentImagePath] = useState<string | null>(null)

  useEffect(() => {
    if (agentImagePath) setAvatarReady(true)
  }, [agentImagePath])

  const config = stepStatusConfig[step.status] ?? stepStatusConfig.locked

  return (
    // 60px = hauteur du shell header (défini dans packages/ui/src/themes/)
    <div className="-m-6 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 60px)' }}>
      {/* Mobile tab bar — visible only < lg */}
      <StepMobileTabs activeTab={mobileTab} onTabChange={setMobileTab} />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left column — step content */}
        <div
          className={`flex-1 min-w-0 overflow-y-auto p-7 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#3d2d6d] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#7c3aed] ${
            mobileTab === 'history' ? 'hidden lg:block' : ''
          }`}
        >
          {/* Breadcrumb */}
          <nav className="text-xs text-[#6b7280] mb-3">
            <Link href="/modules/parcours" className="hover:text-[#f9fafb] transition-colors">
              Mon Parcours
            </Link>
            <span className="mx-1.5">›</span>
            <span className="text-[#a78bfa]">Étape {step.stepNumber} : {step.title}</span>
          </nav>

          {/* Banner soumission en attente de validation — jaune */}
          {step.status === 'pending_review' && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
              <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse shrink-0" aria-hidden="true" />
              Votre document a été soumis — en attente de validation par MiKL.
            </div>
          )}

          {/* Banner refus — orange : MiKL a refusé, le client doit corriger et resoumettre */}
          {step.status === 'rejected' && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 mt-0.5">
                <path d="M12 3l10 18H2L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M12 10v4M12 17v.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
              <div>
                <p className="font-medium">MiKL a refusé votre soumission — corrections à apporter.</p>
                <p className="text-xs text-orange-300/80 mt-0.5">Consultez le feedback dans le panneau de droite, puis régénérez un document corrigé avec Élio.</p>
              </div>
            </div>
          )}

          {/* Banner validation — vert : étape terminée */}
          {step.status === 'completed' && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Cette étape a été validée par MiKL. {totalSteps > step.stepNumber ? `Passez à l'étape ${step.stepNumber + 1}.` : 'Toutes vos étapes sont terminées — graduation proche !'}
            </div>
          )}

          {/* Banner parcours en pause — consultation uniquement */}
          {isPaused && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
                <rect x="2" y="9" width="12" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 9V7a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Votre parcours est en pause — consultation uniquement. MiKL va vous recontacter.
            </div>
          )}

          {/* Step hero header — mt-10 pour laisser de la place au renard qui déborde en haut */}
          <div className="relative mt-10 overflow-visible">
            {/* Carte */}
            <div className="relative overflow-hidden rounded-2xl border border-[#7c3aed]/50 bg-gradient-to-br from-[#1e1557] via-[#251970] to-[#160e40] shadow-[0_0_40px_rgba(124,58,237,0.18)]">
              {/* Halo glow */}
              <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-[#7c3aed]/20 blur-3xl" />

              {/* Contenu gauche — padding-right pour ne pas chevaucher le renard */}
              <div className="relative z-10 p-6" style={{ paddingRight: '220px', minHeight: '160px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <ParcoursStepStatusBadge status={step.status} />
                </div>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-5xl font-black leading-none tabular-nums select-none" style={{ color: 'oklch(0.50 0.20 290)' }}>
                    {String(step.stepNumber).padStart(2, '0')}
                  </span>
                  <h1 className="text-2xl font-bold leading-snug text-white">{step.title}</h1>
                </div>
                <p className="text-sm text-[#a78bfa]/80 leading-relaxed max-w-[360px]">{step.description}</p>
              </div>
            </div>

            {/* Avatar renard — positionné en absolu, sort au-dessus de la carte */}
            {agentImagePath && (
              <div
                className="absolute bottom-0 right-6 z-20 pointer-events-none"
                style={{ width: '200px', height: '260px' }}
              >
                <Image
                  src={agentImagePath}
                  alt={`Agent Élio — ${step.title}`}
                  fill
                  className="object-contain object-bottom"
                  priority
                />
              </div>
            )}
          </div>

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

          {/* Chat Élio embarqué — Story 14.4 */}
          {clientId && (
            <StepElioChat
              stepId={step.id}
              stepStatus={step.status}
              stepNumber={step.stepNumber}
              clientId={clientId}
              onMessagesLoaded={setMessageCount}
              onAgentConfigLoaded={({ imagePath }) => setAgentImagePath(imagePath)}
            />
          )}

          {/* Bouton Générer mon document — désactivé si parcours en pause */}
          {clientId && config.showGenerateButton && !isPaused && (
            <GenerateDocumentButton
              stepId={step.id}
              stepStatus={step.status}
              clientId={clientId}
              messageCount={messageCount}
              stepNumber={step.stepNumber}
            />
          )}

          {/* Lien "Voir ma soumission" pour les étapes terminées */}
          {config.showSubmissionLink && (
            <div className="mt-4">
              <Link href={`/modules/parcours/steps/${step.stepNumber}/submission`}>
                <Button variant="outline">Voir ma soumission</Button>
              </Link>
            </div>
          )}

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

        {/* Right column — hidden on mobile when "Étape" tab active, always visible on desktop */}
        <StepHistoryPanel
          stepId={step.id}
          stepNumber={step.stepNumber}
          className={mobileTab === 'step' ? 'hidden lg:flex' : 'flex'}
        />
      </div>
    </div>
  )
}
