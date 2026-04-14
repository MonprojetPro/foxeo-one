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
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link href="/modules/parcours" className="hover:text-foreground transition-colors">
          Mon Parcours
        </Link>
        {' › '}
        <span className="text-foreground">Étape {step.stepNumber} : {step.title}</span>
      </nav>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl font-bold text-muted-foreground/50">
            {String(step.stepNumber).padStart(2, '0')}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{step.title}</h1>
            <ParcoursStepStatusBadge status={step.status} className="mt-1" />
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed">{step.description}</p>
      </div>

      {/* Pourquoi cette étape ? */}
      <section className="rounded-lg border border-border bg-card/50 p-5">
        <h2 className="text-lg font-semibold text-foreground mb-2">Pourquoi cette étape ?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
      </section>

      {/* Brief content (markdown) */}
      {step.briefContent && (
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Votre brief</h2>
          <BriefMarkdownRenderer content={step.briefContent} />
        </section>
      )}

      {/* Fallback: brief_template if no brief_content */}
      {!step.briefContent && step.briefTemplate && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Modèle de brief
          </h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
              {step.briefTemplate}
            </pre>
          </div>
        </section>
      )}

      {/* Assets gallery */}
      {step.briefAssets.length > 0 && (
        <BriefAssetsGallery assets={step.briefAssets} />
      )}

      {/* Teasing MonprojetPro One */}
      <OneTeasingCard message={step.oneTeasingMessage} />

      {/* CTA */}
      <div className="flex justify-center">
        {step.status === 'locked' && (
          <Button disabled variant="secondary">Étape verrouillée</Button>
        )}
        {step.status === 'current' && (
          <Link href={`/modules/parcours/steps/${step.stepNumber}/submit`}>
            <Button size="lg" className="bg-purple-600 hover:bg-purple-500">
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
      <StepNavigationButtons
        currentStepNumber={step.stepNumber}
        totalSteps={totalSteps}
        prevStep={prevStep}
        nextStep={nextStep}
      />
    </div>
  )
}
