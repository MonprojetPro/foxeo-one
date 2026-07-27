'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@monprojetpro/utils'
import { useClientReadOnly } from '@monprojetpro/ui'
import { useParcours } from '../hooks/use-parcours'
import { useUnreadInjections } from '../hooks/use-unread-injections'
import { useParcoursRealtimeRefresh } from '../hooks/use-parcours-realtime-refresh'
import { ParcoursProgressBar } from './parcours-progress-bar'
import { ParcoursStepCard } from './parcours-step-card'
import { ElioParcoursPanel } from './elio-parcours-panel'
import { AbandonParcoursDialog } from './abandon-parcours-dialog'
import { ParcoursModeIntroDialog } from './parcours-mode-intro-dialog'

interface ParcoursOverviewProps {
  clientId: string
  clientFirstName?: string | null
  /** Agents Lab coupés par MiKL → parcours grisé / non interactif (en pause). */
  agentsPaused?: boolean
  /** Ouvre la pop-up de chat du Concierge (orchestrée par l'app). */
  onAskConcierge?: () => void
}

const ABANDONABLE_STATUSES = ['en_cours', 'in_progress', 'not_started', 'suspendu']

export function ParcoursOverview({ clientId, clientFirstName, agentsPaused = false, onAskConcierge }: ParcoursOverviewProps) {
  const { data: parcours, isPending, error } = useParcours(clientId)
  const { unreadByStep } = useUnreadInjections(clientId)
  const [abandonDialogOpen, setAbandonDialogOpen] = useState(false)
  const readOnly = useClientReadOnly()

  // Mise à jour instantanée quand MiKL coupe/réactive un agent depuis le Hub
  // (invalide la query ['parcours', clientId] — le router.refresh() SSR ne suffit pas).
  useParcoursRealtimeRefresh(clientId)

  if (isPending) {
    return <ParcoursOverviewSkeleton />
  }

  if (error || !parcours) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-destructive text-sm">
          Impossible de charger votre parcours. Veuillez réessayer.
        </p>
      </div>
    )
  }

  const isAbandoned = parcours.status === 'abandoned'
  // Espace figé — un parcours déjà arrêté par la fin d'abonnement n'a plus à être quitté.
  const canAbandon = !readOnly && ABANDONABLE_STATUSES.includes(parcours.status)
  // L'étape "active visuellement" : current, en cours de review, ou refusée
  const currentStep = parcours.steps.find(
    (s) =>
      s.status === 'current' ||
      s.status === 'pending_review' ||
      s.status === 'rejected'
  ) ?? null
  const allCompleted = parcours.completedSteps > 0 && parcours.completedSteps === parcours.totalSteps

  // Pop-up d'accueil du Concierge : explique les règles du parcours (tracé/libre) à la
  // découverte + à chaque changement de mode. Pas sur un parcours en pause (abandonné),
  // ni sur un parcours arrêté par la fin d'abonnement : expliquer « comment avancer » à
  // quelqu'un qui ne peut plus avancer, c'est la promesse en trop.
  const showModeIntro = parcours.steps.length > 0 && !isAbandoned && !readOnly

  return (
    <div className="space-y-6">
      {showModeIntro && (
        <ParcoursModeIntroDialog
          clientId={clientId}
          mode={parcours.parcoursMode}
          clientFirstName={clientFirstName}
        />
      )}

      {/* Story 9.3 — Parcours abandonné : message pause (jamais en même temps que le
          message « parcours arrêté » ci-dessous, qui est l'état le plus fort). */}
      {isAbandoned && !readOnly && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-6 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">Votre parcours est en pause.</p>
          <p className="text-sm text-muted-foreground">MiKL va vous contacter pour en discuter.</p>
        </div>
      )}

      {/* Bandeau UNIQUE — Élio, le Concierge : seule voix qui s'adresse au client.
          Porte le bonjour + l'étape en cours + le message contextuel (y compris l'état
          « agents en pause »). Remplace l'ancien titre « Bonjour » et l'ancienne bannière
          de pause en haut de page. */}
      <ElioParcoursPanel
        clientFirstName={clientFirstName}
        currentStep={currentStep}
        allCompleted={allCompleted}
        agentsPaused={agentsPaused}
        frozen={readOnly}
        conciergeWord={parcours.conciergeWord}
        onAskConcierge={onAskConcierge}
      />

      {/* Progress bar — Claude Design. Atténuée quand le Lab est en pause (le parcours
          est gelé : on ne pousse plus le client à avancer). */}
      <div className={cn('transition-opacity', agentsPaused && 'opacity-50')}>
        <ParcoursProgressBar
          completedSteps={parcours.completedSteps}
          totalSteps={parcours.totalSteps}
          progressPercent={parcours.progressPercent}
          frozen={readOnly}
        />
      </div>

      {/* LOT E — Mode libre : bandeau explicatif. Le client peut traiter les étapes
          dans l'ordre qu'il veut (pas de verrou séquentiel). Masqué si parcours en pause
          (abandonné OU Lab suspendu) — il inciterait à avancer alors que tout est gelé. */}
      {/* Abonnement terminé — message de CONSULTATION, à la place du bandeau « Parcours
          libre » : le client doit comprendre ce qui reste possible ici, pas ce qu'il a perdu.
          (Le bandeau ambre global du layout dit l'abonnement ; celui-ci dit le parcours.) */}
      {readOnly && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs leading-relaxed text-amber-100/90">
            <span className="font-semibold text-amber-200">Ton parcours est arrêté.</span>{' '}
            Tout reste là : tu peux relire chaque étape, retrouver tes échanges avec les agents
            et télécharger tes documents autant que tu veux. Tu ne peux simplement plus le faire
            avancer. Envie de reprendre ? Écris à MiKL, il te répond.
          </p>
        </div>
      )}

      {parcours.parcoursMode === 'libre' && !isAbandoned && !agentsPaused && !readOnly && (
        <div className="flex items-start gap-2.5 rounded-lg border border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.08)] px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#a78bfa]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <p className="text-xs leading-relaxed text-[#c4b5fd]">
            <span className="font-semibold text-[#e5e7eb]">Parcours libre.</span>{' '}
            Toutes les étapes sont ouvertes : avance dans l&apos;ordre que tu veux, en parallèle si tu
            préfères. Élio garde en mémoire ce que tu as déjà établi dans les autres étapes.
          </p>
        </div>
      )}

      {/* Grille 3 colonnes — légèrement grisée si en pause, MAIS cartes cliquables
          (consultation de l'historique toujours possible). */}
      <div className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity',
        (agentsPaused || readOnly) && 'opacity-70'
      )}>
        {parcours.steps.map((step) => (
          <ParcoursStepCard key={step.id} step={step} unreadCount={unreadByStep[step.id] ?? 0} isAbandoned={isAbandoned} isPaused={agentsPaused} isFrozen={readOnly} />
        ))}
      </div>

      {/* Story 9.3 — Bouton abandon discret en bas de page */}
      {canAbandon && (
        <div className="pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setAbandonDialogOpen(true)}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Quitter le parcours
          </button>
        </div>
      )}

      {/* Mention IA (RGPD) — Élio repose sur une IA dans l'accompagnement du parcours */}
      <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          ℹ️ Tout au long de ce parcours, <strong>Élio</strong> peut vous
          accompagner. Élio est un assistant basé sur l&apos;intelligence
          artificielle (Claude, développé par Anthropic — États-Unis). Vous gardez
          le contrôle : vous pouvez activer ou désactiver ce traitement à tout
          moment dans{' '}
          <Link
            href="/settings/consents"
            className="text-primary underline hover:text-primary/80"
          >
            Paramètres → Consentements
          </Link>
          .
        </p>
      </div>

      {/* Story 9.3 — Dialog abandon */}
      <AbandonParcoursDialog
        clientId={clientId}
        open={abandonDialogOpen}
        onOpenChange={setAbandonDialogOpen}
        completedSteps={parcours.completedSteps}
        totalSteps={parcours.totalSteps}
      />
    </div>
  )
}

function ParcoursOverviewSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-8 w-64 rounded-md bg-muted" />
        <div className="h-4 w-96 rounded-md bg-muted" />
      </div>

      {/* Progress skeleton */}
      <div className="flex items-center gap-3 max-w-[900px]">
        <div className="h-3 flex-1 rounded-full bg-muted" />
        <div className="h-4 w-28 rounded bg-muted" />
      </div>

      {/* Grid skeleton — mirrors 3-col grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted" />
        ))}
      </div>

      {/* Élio panel skeleton */}
      <div className="h-36 rounded-xl bg-muted" />
    </div>
  )
}
