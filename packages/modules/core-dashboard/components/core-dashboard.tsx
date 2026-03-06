'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@foxeo/ui'
import type { ClientConfig } from '@foxeo/types'
import { LabTeasingCard } from './lab-teasing-card'

interface CoreDashboardProps {
  clientConfig: ClientConfig
  clientName: string
  showTeasing?: boolean
}

function formatDateFR(): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date())
}

/**
 * CoreDashboard — Page d'accueil personnalisée pour le dashboard One (et Lab).
 * Affiche le message d'accueil, les actions rapides et l'activité récente.
 */
export function CoreDashboard({ clientConfig, clientName, showTeasing = false }: CoreDashboardProps) {
  const router = useRouter()
  const { activeModules, customBranding } = clientConfig
  // Les 4 premiers modules actifs (hors core-dashboard) pour les "Actions rapides"
  const quickAccessModules = activeModules
    .filter((id) => id !== 'core-dashboard')
    .slice(0, 4)

  const logoUrl = customBranding?.logoUrl
  const displayName = customBranding?.companyName ?? 'Foxeo One'
  const greeting = clientName ? `Bonjour ${clientName}` : 'Bonjour'

  return (
    <div className="space-y-6">
      {/* Header accueil */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{greeting} 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">{formatDateFR()}</p>
        </div>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`Logo ${displayName}`}
            className="h-10 w-auto object-contain"
          />
        ) : (
          <span className="text-sm font-medium text-muted-foreground">{displayName}</span>
        )}
      </div>

      {/* Actions rapides */}
      <section aria-label="Actions rapides">
        <h2 className="text-lg font-semibold mb-3">Actions rapides</h2>
        {quickAccessModules.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickAccessModules.map((moduleId) => (
              <QuickAccessCard key={moduleId} moduleId={moduleId} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Aucun module disponible. Contactez MiKL pour activer vos modules.
          </p>
        )}
      </section>

      {/* Teasing Lab — nouveau parcours */}
      <LabTeasingCard
        show={showTeasing}
        onCTAClick={() =>
          router.push(
            '/modules/chat?message=' +
              encodeURIComponent('Je souhaite lancer un nouveau parcours Lab')
          )
        }
      />

      {/* Accès rapide Élio */}
      {activeModules.includes('elio') && (
        <section aria-label="Accès rapide Élio">
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
            <span className="text-2xl" aria-hidden="true">🤖</span>
            <div className="flex-1">
              <p className="text-sm font-medium">Élio — Votre assistant IA</p>
              <p className="text-xs text-muted-foreground">Posez une question, obtenez de l'aide</p>
            </div>
            <Link href="/modules/elio" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Parler à Élio
            </Link>
          </div>
        </section>
      )}

      {/* Activité récente — skeletons (Epic 10 scope) */}
      <section aria-label="Activité récente">
        <h2 className="text-lg font-semibold mb-3">Activité récente</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActivitySkeleton label="Derniers messages MiKL" />
          <ActivitySkeleton label="Documents récents" />
          <ActivitySkeleton label="Dernière activité Élio" />
        </div>
      </section>
    </div>
  )
}

function QuickAccessCard({ moduleId }: { moduleId: string }) {
  const labels: Record<string, string> = {
    chat: 'Chat',
    documents: 'Documents',
    elio: 'Élio',
    visio: 'Visio',
    notifications: 'Notifications',
    support: 'Support',
    parcours: 'Mon Parcours',
    crm: 'CRM',
  }
  const label = labels[moduleId] ?? moduleId

  return (
    <Link href={`/modules/${moduleId}`} className="block">
      <Card className="hover:bg-accent/10 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Accéder</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function ActivitySkeleton({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  )
}
