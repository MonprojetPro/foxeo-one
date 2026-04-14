'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Separator, Button, Skeleton, showSuccess, showError } from '@monprojetpro/ui'
import { exportClientData } from '@monprojetpro/module-admin'
import { useClient } from '../hooks/use-client'
import { useClientParcours } from '../hooks/use-client-parcours'
import { useClientPendingValidations } from '../hooks/use-client-pending-validations'
import { AssignParcoursDialog } from './assign-parcours-dialog'
import { AccessToggles } from './access-toggles'
import { ParcoursStatusBadge } from './parcours-status-badge'
import { ClientNotesSection } from './client-notes-section'
import { GraduationDialog } from './graduation-dialog'
import { ReactivateParcoursDialog } from './reactivate-parcours-dialog'
import { ChangeTierDialog } from './change-tier-dialog'
import { TransferInstanceDialog } from './transfer-instance-dialog'
import { ArchiveClientDialog } from './archive-client-dialog'
import { useClientInstance } from '../hooks/use-client-instance'
import { TIER_INFO, TIER_BADGE_CLASSES } from '../utils/tier-helpers'
import type { SubscriptionTier } from '../types/subscription.types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ClientInfoTabProps {
  clientId: string
  onEdit?: () => void
}

/**
 * @deprecated ADR-01 Révision 2 — Feature flag pour masquer l'ancien flow
 * "Transférer l'instance" (Story 9.5b). Remplacé par le Kit de sortie client
 * (Story 13.1). À retirer complètement (avec TransferInstanceDialog et la
 * Server Action transferInstanceToClient) après merge de la Story 13.1.
 */
const ENABLE_LEGACY_TRANSFER = false

const clientTypeLabels: Record<string, string> = {
  'complet': 'Complet',
  'direct_one': 'Direct One',
  'ponctuel': 'Ponctuel',
}

const statusLabels: Record<string, string> = {
  'active': 'Actif',
  'suspended': 'Suspendu',
  'archived': 'Archivé',
}

export function ClientInfoTab({ clientId, onEdit }: ClientInfoTabProps) {
  const { data: client, isPending, error } = useClient(clientId)
  const { data: parcours } = useClientParcours(clientId)
  const { data: pendingValidations } = useClientPendingValidations(clientId)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [graduationDialogOpen, setGraduationDialogOpen] = useState(false)
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false)
  const [changeTierDialogOpen, setChangeTierDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [isExporting, startExportTransition] = useTransition()
  const { data: clientInstance } = useClientInstance(clientId)

  // Story 9.3 — Parcours abandonné
  const parcoursAbandoned = parcours?.status === 'abandoned'

  // Graduation conditions
  const isLabClient = client?.config?.dashboardType === 'lab'
  const isOneClient = client?.config?.dashboardType === 'one'
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
        <CardHeader>
          <CardTitle>Coordonnées</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {client.firstName && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prénom</p>
                <p className="text-base">{client.firstName}</p>
              </div>
            )}
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
              {/* Barre de progression visuelle */}
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
              {/* Story 9.3 — Bouton réactiver parcours abandonné */}
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

      {/* Graduation vers One — visible uniquement pour les clients Lab */}
      {isLabClient && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Graduation vers MonprojetPro One</CardTitle>
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
                    Graduer vers MonprojetPro One
                  </Button>
                  <span className="text-xs text-muted-foreground">{graduationTooltip}</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setGraduationDialogOpen(true)}
                  data-testid="graduation-button"
                >
                  Graduer vers MonprojetPro One
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abonnement — visible uniquement pour les clients One (Story 9.4) */}
      {isOneClient && client.config && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Abonnement</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangeTierDialogOpen(true)}
              data-testid="change-tier-button"
            >
              Modifier le tier
            </Button>
          </CardHeader>
          <CardContent>
            {(() => {
              const currentTier: SubscriptionTier = (client.config?.subscriptionTier as SubscriptionTier) ?? 'base'
              const tierInfo = TIER_INFO[currentTier]
              const tierBadgeClass = TIER_BADGE_CLASSES[currentTier]

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Tier actuel</span>
                    <span
                      className={[
                        'text-xs px-2 py-1 rounded-full font-medium',
                        tierBadgeClass,
                      ].join(' ')}
                    >
                      {tierInfo.name}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Coût mensuel</span>
                    <span className="text-sm">{tierInfo.price}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Élio</span>
                    <span className="text-sm">{tierInfo.elio}</span>
                  </div>
                  {client.config?.tierChangedAt && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Tier depuis</span>
                        <span className="text-sm">
                          {format(new Date(client.config.tierChangedAt), 'd MMMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )
            })()}
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

      {/* Story 9.3 — Dialog réactivation parcours */}
      {isLabClient && parcours && parcoursAbandoned && (
        <ReactivateParcoursDialog
          clientId={clientId}
          clientName={client.name}
          open={reactivateDialogOpen}
          onOpenChange={setReactivateDialogOpen}
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

      {/* Dialog changement tier (Story 9.4) */}
      {isOneClient && client.config && (
        <ChangeTierDialog
          clientId={clientId}
          clientName={client.name}
          currentTier={(client.config.subscriptionTier as SubscriptionTier) ?? 'base'}
          open={changeTierDialogOpen}
          onOpenChange={setChangeTierDialogOpen}
        />
      )}

      {/* Story 9.5b — Dialog transfert instance (@deprecated — voir ENABLE_LEGACY_TRANSFER) */}
      {ENABLE_LEGACY_TRANSFER && isOneClient && (
        <TransferInstanceDialog
          clientId={clientId}
          clientName={client.name}
          clientEmail={client.email}
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
        />
      )}

      {/* Administration — Story 9.5a + 9.5b */}
      <Card>
        <CardHeader>
          <CardTitle>Administration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Exportez les données personnelles du client (RGPD — droit d&apos;accès).
            </p>
            {exportConfirmOpen ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Confirmer l&apos;export ?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isExporting}
                  data-testid="confirm-export-button"
                  onClick={() => {
                    setExportConfirmOpen(false)
                    startExportTransition(async () => {
                      const result = await exportClientData({
                        clientId,
                        requestedBy: 'operator',
                      })
                      if (result.error) {
                        showError(result.error.message)
                      } else {
                        showSuccess('Export en cours — le client recevra une notification quand il sera prêt')
                      }
                    })
                  }}
                >
                  {isExporting ? 'Export en cours…' : 'Confirmer'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportConfirmOpen(false)}
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={isExporting}
                data-testid="export-client-data-button"
                onClick={() => setExportConfirmOpen(true)}
              >
                Exporter les données client
              </Button>
            )}
            {/* Story 9.5b — Transfert instance One */}
            {/*
              @deprecated ADR-01 Révision 2 — Remplacé par Story 13.1 (Kit de sortie client).
              Bouton masqué pour éviter tout clic accidentel de MiKL sur l'ancien flow.
              Le composant TransferInstanceDialog et la Server Action transferInstanceToClient
              restent en code (marqués @deprecated) — ils seront retirés après merge de la Story 13.1.
            */}
            {ENABLE_LEGACY_TRANSFER && isOneClient && clientInstance?.status === 'active' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Transférez l&apos;instance One au client sortant (code source, DB, documentation).
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setTransferDialogOpen(true)}
                    data-testid="transfer-instance-button"
                  >
                    Transférer l&apos;instance au client
                  </Button>
                </div>
              </>
            )}
            {/* Story 9.5c — Archivage client (RGPD) */}
            {client.status !== 'archived' && client.status !== 'deleted' && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Archivez le client pour bloquer son accès. Les données seront anonymisées après la période de rétention (RGPD).
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setArchiveDialogOpen(true)}
                    data-testid="archive-client-button"
                  >
                    Archiver le client
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Story 9.5c — Dialog archivage */}
      {client.status !== 'archived' && client.status !== 'deleted' && (
        <ArchiveClientDialog
          clientId={clientId}
          clientName={client.name}
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
        />
      )}

      {/* Notes privées (Story 2.6) */}
      <ClientNotesSection clientId={clientId} />
    </div>
  )
}
