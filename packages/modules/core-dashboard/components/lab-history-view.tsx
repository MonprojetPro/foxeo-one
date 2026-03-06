'use client'

import { Card, CardContent, CardHeader, CardTitle, Badge } from '@foxeo/ui'

export interface ParcoursStep {
  id: string
  name: string
  completedAt: string | null
  documentId: string | null
}

export interface ParcoursData {
  id: string
  status: string
  startedAt: string
  completedAt: string | null
  steps: ParcoursStep[]
}

interface LabHistoryViewProps {
  parcours: ParcoursData | null
}

function formatDateFR(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(dateStr))
}

function computeDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'En cours'
  const start = new Date(startedAt)
  const end = new Date(completedAt)
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 7) return `${days} jour${days > 1 ? 's' : ''}`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks} semaine${weeks > 1 ? 's' : ''}`
  const months = Math.round(days / 30)
  return `${months} mois`
}

/**
 * LabHistoryView — Affiche l'historique du parcours Lab en lecture seule.
 * Aucune action possible — composant purement consultatif.
 */
export function LabHistoryView({ parcours }: LabHistoryViewProps) {
  if (!parcours) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">Vous n&apos;avez pas de parcours Lab</p>
        </CardContent>
      </Card>
    )
  }

  const duration = computeDuration(parcours.startedAt, parcours.completedAt)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Parcours Lab — Historique</CardTitle>
            <Badge variant="outline">Terminé</Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Démarré le {formatDateFR(parcours.startedAt)}</p>
          {parcours.completedAt && (
            <p>Terminé le {formatDateFR(parcours.completedAt)}</p>
          )}
          <p>Durée totale : {duration}</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Étapes complétées</h3>
        <ul className="space-y-2">
          {parcours.steps.map((step) => (
            <li key={step.id} className="flex items-start gap-3 rounded-lg border p-3">
              <span className="mt-0.5 text-green-500" aria-hidden="true">✓</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{step.name}</p>
                {step.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    {formatDateFR(step.completedAt)}
                  </p>
                )}
              </div>
              {step.documentId && (
                <a
                  href={`/modules/documents/${step.documentId}`}
                  className="shrink-0 text-xs text-primary hover:underline"
                >
                  Voir le brief
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
