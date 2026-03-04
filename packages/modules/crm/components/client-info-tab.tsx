'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Separator, Button, Skeleton } from '@foxeo/ui'
import { useClient } from '../hooks/use-client'
import { useClientParcours } from '../hooks/use-client-parcours'
import { useClientPendingValidations } from '../hooks/use-client-pending-validations'
import { AssignParcoursDialog } from './assign-parcours-dialog'
import { AccessToggles } from './access-toggles'
import { ParcoursStatusBadge } from './parcours-status-badge'
import { ClientNotesSection } from './client-notes-section'
import { GraduationDialog } from './graduation-dialog'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ClientInfoTabProps {
  clientId: string
  onEdit?: () => void
}

const clientTypeLabels: Record<string, string> = {
  'complet': 'Complet',
  'direct_one': 'Direct One',
  'ponctuel': 'Ponctuel',
}

const statusLabels: Record<string, string> = {
  'lab-actif': 'Lab actif',
  'one-actif': 'One actif',
  'inactif': 'Inactif',
  'suspendu': 'Suspendu',
}

export function ClientInfoTab({ clientId, onEdit }: ClientInfoTabProps) {
  const { data: client, isPending, error } = useClient(clientId)
  const { data: parcours } = useClientParcours(clientId)
  const { data: pendingValidations } = useClientPendingValidations(clientId)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [graduationDialogOpen, setGraduationDialogOpen] = useState(false)

  // Graduation conditions
  const isLabClient = client?.config?.dashboardType === 'lab'
  const parcoursCompleted = parcours?.status === 'termine'
  const noPendingValidations = (pendingValidations?.count ?? 0) === 0
  const canGraduate = isLabClient && parcoursCompleted && noPendingValidations

  const graduationTooltip = !isLabClient
    ? null
    : !parcoursCompleted
      ? `Parcours non terminé — ${
          parcours?.activeStages.filter((s) => s.active && s.status !== 'completed').length ?? '?'
        } étape(s) restante(s)`
      : !noPendingValidations
        ? `Demandes de validation en attente — traitez-les d'abord`
        : null

  if (isPending) {
    return (
      <div className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-40" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !client) {
    return <div className="p-4">Erreur de chargement</div>
  }

  const creationDate = format(new Date(client.createdAt), 'd MMMM yyyy', { locale: fr })
  const lastUpdate = format(new Date(client.updatedAt), 'd MMMM yyyy à HH:mm', { locale: fr })

  return (
    <div className="space-y-6 mt-6">
      {/* Coordonnées */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Coordonnées</CardTitle>
          {onEdit && (
            <Button onClick={onEdit} variant="outline" size="sm">
              Modifier
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nom</p>
              <p className="text-base">{client.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Entreprise</p>
              <p className="text-base">{client.company}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base">{client.email}</p>
            </div>
            {client.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                <p className="text-base">{client.phone}</p>
              </div>
            )}
            {client.sector && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Secteur</p>
                <p className="text-base">{client.sector}</p>
              </div>
            )}
            {client.website && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Site web</p>
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-base text-primary hover:underline">
                  {client.website}
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Type de client</span>
              <Badge variant="outline">
                {clientTypeLabels[client.clientType] || client.clientType}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Statut</span>
              <Badge>
                {statusLabels[client.status] || client.status}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Date de création</span>
              <span className="text-sm">{creationDate}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Dernière activité</span>
              <span className="text-sm">{lastUpdate}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parcours & Accès */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Parcours & Accès</CardTitle>
          {!parcours && (
            <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(true)}>
              Assigner un parcours Lab
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
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Étapes actives</span>
                <span className="text-sm">
                  {parcours.activeStages.filter((s) => s.active).length} / {parcours.activeStages.length}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Démarré le</span>
                <span className="text-sm">
                  {format(new Date(parcours.startedAt), 'd MMMM yyyy', { locale: fr })}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun parcours Lab assigné.</p>
          )}
        </CardContent>
      </Card>

      {/* Graduation vers One — visible uniquement pour les clients Lab */}
      {isLabClient && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Graduation vers Foxeo One</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Déclenchez la graduation du client vers son espace professionnel One.
              </p>
              {graduationTooltip ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    title={graduationTooltip}
                    aria-disabled="true"
                  >
                    Graduer vers Foxeo One
                  </Button>
                  <span className="text-xs text-muted-foreground">{graduationTooltip}</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setGraduationDialogOpen(true)}
                  data-testid="graduation-button"
                >
                  Graduer vers Foxeo One
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accès toggles */}
      {client.config && (
        <AccessToggles
          clientId={clientId}
          dashboardType={client.config.dashboardType}
          hasActiveParcours={parcours?.status === 'en_cours'}
        />
      )}

      {/* Dialog assignation */}
      <AssignParcoursDialog
        clientId={clientId}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />

      {/* Dialog graduation */}
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

      {/* Modules One */}
      {client.config && client.config.activeModules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Modules actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {client.config.activeModules.map((mod) => (
                <Badge key={mod} variant="secondary">{mod}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes privées (Story 2.6) */}
      <ClientNotesSection clientId={clientId} />
    </div>
  )
}
