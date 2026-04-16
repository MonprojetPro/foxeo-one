'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Separator, Button } from '@monprojetpro/ui'
import { useClient } from '../hooks/use-client'
import { useClientParcours } from '../hooks/use-client-parcours'
import { useClientPendingValidations } from '../hooks/use-client-pending-validations'
import { ParcoursStatusBadge } from './parcours-status-badge'
import { AssignParcoursDialog } from './assign-parcours-dialog'
import { GraduationDialog } from './graduation-dialog'
import { ReactivateParcoursDialog } from './reactivate-parcours-dialog'
import { LabExitKitDialog } from './lab-exit-kit-dialog'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ClientLabTabContentProps {
  clientId: string
}

export function ClientLabTabContent({ clientId }: ClientLabTabContentProps) {
  const { data: client } = useClient(clientId)
  const { data: parcours } = useClientParcours(clientId)
  const { data: pendingValidations } = useClientPendingValidations(clientId)

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [graduationDialogOpen, setGraduationDialogOpen] = useState(false)
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false)
  const [labExitKitDialogOpen, setLabExitKitDialogOpen] = useState(false)

  if (!client) return null

  const isLabClient = client.config?.dashboardType === 'lab'
  const parcoursAbandoned = parcours?.status === 'abandoned'
  const parcoursCompleted = parcours?.status === 'termine'
  const noPendingValidations = (pendingValidations?.count ?? 0) === 0

  const graduationTooltip = !isLabClient
    ? null
    : !parcoursCompleted
      ? `Parcours non terminé — ${
          parcours?.activeStages.filter((s) => s.active && s.status !== 'completed').length ?? '?'
        } étape(s) restante(s)`
      : !noPendingValidations
        ? `Demandes de validation en attente — traitez-les d'abord`
        : null

  return (
    <div className="space-y-6">
      {/* Parcours Lab — détaillé */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Parcours Lab</CardTitle>
          {!parcours && (
            <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(true)}>
              Assigner un parcours
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {parcours ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Statut</span>
                <ParcoursStatusBadge status={parcours.status} />
              </div>
              <Separator />
              {/* Barre de progression */}
              {(() => {
                const activeStages = parcours.activeStages.filter((s) => s.active)
                const completedStages = activeStages.filter((s) => s.status === 'completed')
                const progressPct = activeStages.length > 0
                  ? Math.round((completedStages.length / activeStages.length) * 100)
                  : 0
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Progression</span>
                      <span className="text-sm font-medium">
                        {completedStages.length} / {activeStages.length} étapes ({progressPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )
              })()}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Démarré le</span>
                <span className="text-sm">
                  {format(new Date(parcours.startedAt), 'd MMMM yyyy', { locale: fr })}
                </span>
              </div>
              {/* Parcours abandonné */}
              {parcoursAbandoned && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Abandonné</Badge>
                      {parcours.abandonmentReason && (
                        <span className="text-xs text-muted-foreground">
                          {parcours.abandonmentReason}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReactivateDialogOpen(true)}
                      data-testid="reactivate-parcours-button"
                    >
                      Réactiver le parcours
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun parcours Lab assigné.</p>
          )}
        </CardContent>
      </Card>

      {/* Graduation vers One */}
      {isLabClient && (
        <Card>
          <CardHeader>
            <CardTitle>Graduation vers MonprojetPro One</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Déclenchez la graduation du client vers son espace professionnel One.
              </p>
              {graduationTooltip ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled title={graduationTooltip} aria-disabled="true">
                    Graduer vers MonprojetPro One
                  </Button>
                  <span className="text-xs text-muted-foreground">{graduationTooltip}</span>
                </div>
              ) : (
                <Button size="sm" onClick={() => setGraduationDialogOpen(true)} data-testid="graduation-button">
                  Graduer vers MonprojetPro One
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kit de sortie Lab */}
      {isLabClient && client.status !== 'archived_lab' && client.status !== 'archived' && client.status !== 'deleted' && (
        <Card>
          <CardHeader>
            <CardTitle>Kit de sortie Lab</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Exportez les documents, briefs et conversations Élio Lab du client dans un ZIP téléchargeable.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLabExitKitDialogOpen(true)}
                data-testid="start-lab-exit-kit-button"
              >
                Lancer le kit de sortie Lab
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {client.status === 'archived_lab' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Archivé Lab</Badge>
              <span className="text-xs text-muted-foreground">
                Le kit de sortie Lab a été généré — le client peut télécharger ses documents pendant 14 jours.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AssignParcoursDialog clientId={clientId} open={assignDialogOpen} onOpenChange={setAssignDialogOpen} />
      {isLabClient && parcours && (
        <GraduationDialog
          clientId={clientId}
          clientName={client.name}
          clientCompany={client.company}
          parcours={parcours}
          open={graduationDialogOpen}
          onOpenChange={setGraduationDialogOpen}
        />
      )}
      {isLabClient && parcours && parcoursAbandoned && (
        <ReactivateParcoursDialog
          clientId={clientId}
          clientName={client.name}
          open={reactivateDialogOpen}
          onOpenChange={setReactivateDialogOpen}
        />
      )}
      {isLabClient && client.status !== 'archived_lab' && (
        <LabExitKitDialog
          clientId={clientId}
          clientName={client.name}
          clientCompany={client.company}
          open={labExitKitDialogOpen}
          onOpenChange={setLabExitKitDialogOpen}
        />
      )}
    </div>
  )
}
